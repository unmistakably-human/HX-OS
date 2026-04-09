import { NextRequest } from "next/server";
import { getValidFigmaToken } from "@/lib/figma-auth";
import { callClaude } from "@/lib/claude";
import type { DesignTokens } from "@/lib/types";

const EXTRACT_SYSTEM = `You extract design tokens from visual assets.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "brandColors": [{"name": "Primary", "hex": "#XXXXXX", "usage": "where this color is applied in the UI"}],
  "gradient": "linear-gradient(135deg, #XXX 0%, #XXX 100%)" or null,
  "neutrals": [{"name": "White", "hex": "#FFFFFF", "usage": "where this neutral is applied in the UI"}],
  "typography": [{"level": "H1", "font": "FontName", "weight": "Bold", "size": "32px"}, ...up to 5]
}
Include all meaningful brand colors and neutrals — no artificial cap. Include 1 gradient if visible, otherwise null. Up to 5 typography levels.
The "usage" field is CRITICAL — describe where each color is used in the product UI. Examples:
- "CTA buttons, active tab indicators, link hover states"
- "Page backgrounds, card surfaces, input field fills"
- "Body text, headings, icon default state"
- "Borders, dividers, disabled state backgrounds"
Do NOT just repeat the color name. Describe the actual UI elements and states where this color appears.
For images: identify colors and infer their UI usage from visual context.
For text files: parse color tokens and infer usage from variable names and comments.`;

const FIGMA_EXTRACT_SYSTEM = `You are a design systems expert. You will receive raw Figma API data containing variables, variable collections, and text styles.

Your job: extract the design tokens into a structured format.

IMPORTANT RULES FOR FIGMA DATA:
1. Variables are organized in collections (e.g., "Primitives", "Semantic", "Brand").
2. Color variables have resolvedType "COLOR" with values as {r, g, b, a} where each is 0-1 float.
   - Convert to hex: multiply each by 255, round, convert to 2-digit hex.
3. Some values are VARIABLE_ALIAS — they reference another variable by id. Follow the alias chain to resolve the final color value.
4. Use the variable NAME and COLLECTION NAME to determine semantics:
   - Names with "brand", "primary", "secondary", "accent", "cta" → brandColors
   - Names with "neutral", "gray", "grey", "surface", "background", "bg", "border", "text" → neutrals
   - If a collection is called "Primitives" or "Core", its direct color scales are neutrals
   - If a collection is called "Semantic" or "Brand" or "Theme", prefer those for brand colors
5. For typography: look for text styles in the file data. Extract font family, weight, and size.
6. If you find a gradient variable or obvious gradient pair, include it.

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "brandColors": [{"name": "...", "hex": "#XXXXXX", "usage": "where this color is used in the UI"}, ...],
  "gradient": "linear-gradient(...)" or null,
  "neutrals": [{"name": "...", "hex": "#XXXXXX", "usage": "where this neutral is used in the UI"}, ...],
  "typography": [{"level": "...", "font": "...", "weight": "...", "size": "..."}, ...up to 5]
}

Prefer semantic/readable names. If the file has few variables, extract what's available — don't invent colors.
Include all meaningful brand colors and neutrals — no artificial cap. For typography, return up to 5 levels.
The "usage" field is CRITICAL — infer from the variable name, scope, and collection context where each color is applied. Examples:
- "CTA buttons, primary action backgrounds, active states"
- "Card surfaces, modal overlays, input backgrounds"
- "Body copy, secondary headings, icon fills"
- "Subtle borders, dividers, disabled backgrounds"
Do NOT just repeat the variable name. Describe the actual UI role.`;

function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface FigmaColorValue {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface FigmaVariableAlias {
  type: "VARIABLE_ALIAS";
  id: string;
}

type FigmaValue = FigmaColorValue | FigmaVariableAlias | number | string;

interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: string;
  valuesByMode: Record<string, FigmaValue>;
  description?: string;
  scopes?: string[];
}

interface FigmaVariableCollection {
  id: string;
  name: string;
  key: string;
  modes: { modeId: string; name: string }[];
  defaultModeId: string;
  variableIds: string[];
}

function resolveColor(
  variableId: string,
  variables: Record<string, FigmaVariable>,
  depth = 0
): string | null {
  if (depth > 10) return null; // prevent infinite loops
  const v = variables[variableId];
  if (!v || v.resolvedType !== "COLOR") return null;

  const modeValue = Object.values(v.valuesByMode)[0];
  if (!modeValue) return null;

  // Check if it's an alias
  if (
    typeof modeValue === "object" &&
    "type" in modeValue &&
    modeValue.type === "VARIABLE_ALIAS"
  ) {
    return resolveColor(modeValue.id, variables, depth + 1);
  }

  // Direct color value
  if (
    typeof modeValue === "object" &&
    "r" in modeValue &&
    typeof modeValue.r === "number"
  ) {
    return rgbaToHex(modeValue.r, modeValue.g, modeValue.b);
  }

  return null;
}

async function extractFromFigma(
  productId: string,
  figmaFileUrl: string
): Promise<DesignTokens> {
  const token = await getValidFigmaToken(productId);
  if (!token)
    throw new Error("Figma not connected. Please connect Figma first.");

  const match = figmaFileUrl.match(
    /figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/
  );
  if (!match) throw new Error("Invalid Figma URL");
  const fileKey = match[1];

  const headers = { Authorization: `Bearer ${token}` };

  // Step 1: Fetch local variables and styles metadata in parallel
  const [varsRes, stylesRes] = await Promise.all([
    fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
      headers,
    }).catch(() => null),
    fetch(`https://api.figma.com/v1/files/${fileKey}/styles`, {
      headers,
    }).catch(() => null),
  ]);

  const resolvedColors: {
    id: string;
    name: string;
    collection: string;
    hex: string;
  }[] = [];
  const publishedColorStyles: { name: string; hex: string }[] = [];
  const textStyles: {
    name: string;
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
  }[] = [];
  let collections: Record<string, FigmaVariableCollection> = {};
  const stylesMetadata: { name: string; style_type: string; node_id: string; description?: string }[] = [];

  // Parse local variables and resolve colors
  if (varsRes?.ok) {
    const varsData = await varsRes.json();
    const variables: Record<string, FigmaVariable> =
      varsData.meta?.variables || {};
    collections = varsData.meta?.variableCollections || {};

    for (const [id, v] of Object.entries(variables)) {
      if (v.resolvedType === "COLOR") {
        const hex = resolveColor(id, variables);
        const collection = collections[v.variableCollectionId];
        if (hex) {
          resolvedColors.push({
            id,
            name: v.name,
            collection: collection?.name || "Unknown",
            hex,
          });
        }
      }
    }
  }

  // Parse styles metadata — crucially, this gives us node_id for each style
  if (stylesRes?.ok) {
    const stylesData = await stylesRes.json();
    const rawStyles = stylesData.meta?.styles || [];
    for (const s of rawStyles) {
      stylesMetadata.push({
        name: s.name,
        style_type: s.style_type,
        node_id: s.node_id,
        description: s.description || "",
      });
    }
  }

  // Step 2: Fetch the actual style nodes by ID to get fill colors and text properties
  // This is the key — /styles only gives metadata, but /nodes gives the actual color/font values
  const fillStyleIds = stylesMetadata
    .filter((s) => s.style_type === "FILL")
    .map((s) => s.node_id);
  const textStyleIds = stylesMetadata
    .filter((s) => s.style_type === "TEXT")
    .map((s) => s.node_id);
  const allStyleNodeIds = [...fillStyleIds, ...textStyleIds];

  if (allStyleNodeIds.length > 0) {
    // Fetch nodes in batches of 50 (Figma API limit)
    const batches: string[][] = [];
    for (let i = 0; i < allStyleNodeIds.length; i += 50) {
      batches.push(allStyleNodeIds.slice(i, i + 50));
    }

    for (const batch of batches) {
      const idsParam = batch.map((id) => encodeURIComponent(id)).join(",");
      const nodesRes = await fetch(
        `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${idsParam}`,
        { headers }
      ).catch(() => null);

      if (nodesRes?.ok) {
        const nodesData = await nodesRes.json();
        const nodes = nodesData.nodes || {};

        for (const [nodeId, nodeWrapper] of Object.entries(nodes) as [string, { document?: Record<string, unknown> }][]) {
          const node = nodeWrapper?.document;
          if (!node) continue;

          const styleMeta = stylesMetadata.find((s) => s.node_id === nodeId);
          if (!styleMeta) continue;

          // Extract fill color from FILL style nodes
          if (styleMeta.style_type === "FILL") {
            const fills = node.fills as Array<{
              type: string;
              color?: { r: number; g: number; b: number; a?: number };
              visible?: boolean;
            }> | undefined;
            if (fills && Array.isArray(fills)) {
              for (const fill of fills) {
                if (fill.type === "SOLID" && fill.color && fill.visible !== false) {
                  const hex = rgbaToHex(fill.color.r, fill.color.g, fill.color.b);
                  publishedColorStyles.push({ name: styleMeta.name, hex });
                }
              }
            }
          }

          // Extract text properties from TEXT style nodes
          if (styleMeta.style_type === "TEXT") {
            const style = node.style as Record<string, unknown> | undefined;
            if (style) {
              textStyles.push({
                name: styleMeta.name,
                fontFamily: style.fontFamily as string,
                fontWeight: style.fontWeight as number,
                fontSize: style.fontSize as number,
              });
            }
          }
        }
      }
    }
  }

  // Step 3: If we still have no colors from variables or styles, fall back to file tree walk
  if (resolvedColors.length === 0 && publishedColorStyles.length === 0) {
    const fileRes = await fetch(
      `https://api.figma.com/v1/files/${fileKey}?depth=3`,
      { headers }
    );
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      const seenHex = new Set<string>();
      const seenText = new Set<string>();

      function walkNodes(node: Record<string, unknown>) {
        const fills = node.fills as Array<{
          type: string;
          color?: { r: number; g: number; b: number };
          visible?: boolean;
        }> | undefined;
        if (fills && Array.isArray(fills)) {
          for (const fill of fills) {
            if (fill.type === "SOLID" && fill.color && fill.visible !== false) {
              const hex = rgbaToHex(fill.color.r, fill.color.g, fill.color.b);
              if (!seenHex.has(hex) && hex !== "#ffffff" && hex !== "#000000") {
                seenHex.add(hex);
                publishedColorStyles.push({
                  name: (node.name as string) || "Color",
                  hex,
                });
              }
            }
          }
        }
        if (node.type === "TEXT" && node.style) {
          const style = node.style as Record<string, unknown>;
          const key = `${style.fontFamily}-${style.fontSize}`;
          if (!seenText.has(key)) {
            seenText.add(key);
            textStyles.push({
              name: (node.name as string) || "Text",
              fontFamily: style.fontFamily as string,
              fontWeight: style.fontWeight as number,
              fontSize: style.fontSize as number,
            });
          }
        }
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            walkNodes(child as Record<string, unknown>);
          }
        }
      }

      if (fileData.document) walkNodes(fileData.document as Record<string, unknown>);
    }
  }

  // Step 4: Merge all sources and send to Claude for intelligent classification
  const hasVariables = resolvedColors.length > 0;
  const hasPublishedStyles = publishedColorStyles.length > 0;
  const hasTextStyles = textStyles.length > 0;

  if (!hasVariables && !hasPublishedStyles && !hasTextStyles) {
    throw new Error(
      "No design tokens found in this Figma file. The file may be empty or its styles may not be accessible."
    );
  }

  // Build summary for Claude
  const summaryParts: string[] = [];

  if (hasVariables) {
    const collNames = Object.values(collections).map(
      (c) =>
        `- "${c.name}" (${c.variableIds.length} variables, modes: ${c.modes.map((m) => m.name).join(", ")})`
    );
    if (collNames.length) {
      summaryParts.push(`Variable Collections:\n${collNames.join("\n")}`);
    }
    const colorLines = resolvedColors.map(
      (c) => `- [${c.collection}] ${c.name}: ${c.hex}`
    );
    summaryParts.push(
      `Local Variables (${colorLines.length} colors):\n${colorLines.join("\n")}`
    );
  }

  if (hasPublishedStyles) {
    const seen = new Set<string>();
    const unique = publishedColorStyles.filter((s) => {
      const key = `${s.name}-${s.hex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const styleLines = unique.map((s) => `- ${s.name}: ${s.hex}`);
    summaryParts.push(
      `Color Styles (${styleLines.length}):\n${styleLines.join("\n")}`
    );
  }

  if (stylesMetadata.length > 0) {
    const fillStyleMeta = stylesMetadata
      .filter((s) => s.style_type === "FILL")
      .map((s) => `- ${s.name}${s.description ? ` (${s.description})` : ""}`);
    if (fillStyleMeta.length) {
      summaryParts.push(
        `Fill Style Definitions (${fillStyleMeta.length}):\n${fillStyleMeta.join("\n")}`
      );
    }
  }

  if (hasTextStyles) {
    const textLines = textStyles
      .slice(0, 15)
      .map(
        (t) =>
          `- ${t.name}: ${t.fontFamily || "?"} weight=${t.fontWeight || "?"} size=${t.fontSize ? t.fontSize + "px" : "?"}`
      );
    summaryParts.push(
      `Typography (${textStyles.length} total):\n${textLines.join("\n")}`
    );
  }

  const summary = summaryParts.join("\n\n");

  const response = await callClaude({
    system: FIGMA_EXTRACT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Here is the Figma file's design token data:\n\n${summary}`,
      },
    ],
  });

  const cleaned = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return { ...parsed, source: "figma" as const };
  } catch {
    // Last resort: basic extraction
    return basicExtraction({
      resolvedColors: [
        ...resolvedColors,
        ...publishedColorStyles.map((s) => ({
          id: "",
          name: s.name,
          collection: "Styles",
          hex: s.hex,
        })),
      ],
      textStyles,
    });
  }
}

function basicExtraction(rawData: {
  resolvedColors?: { name: string; collection: string; hex: string }[];
  textStyles?: { name: string; fontFamily?: string; fontWeight?: number; fontSize?: number }[];
}): DesignTokens {
  const brandColors: { name: string; hex: string; usage: string }[] = [];
  const neutrals: { name: string; hex: string; usage: string }[] = [];

  for (const c of rawData.resolvedColors || []) {
    const lowerName = (c.name + " " + c.collection).toLowerCase();
    const isNeutral =
      lowerName.includes("neutral") ||
      lowerName.includes("gray") ||
      lowerName.includes("grey") ||
      lowerName.includes("surface") ||
      lowerName.includes("background");
    if (isNeutral) {
      neutrals.push({ name: c.name, hex: c.hex, usage: "" });
    } else {
      brandColors.push({ name: c.name, hex: c.hex, usage: "" });
    }
  }

  const typography = (rawData.textStyles || []).slice(0, 5).map((t) => ({
    level: t.name,
    font: t.fontFamily || "Unknown",
    weight: t.fontWeight ? String(t.fontWeight) : "Regular",
    size: t.fontSize ? `${t.fontSize}px` : "",
  }));

  return {
    brandColors: brandColors.length
      ? brandColors
      : (rawData.resolvedColors || []).map((c) => ({ name: c.name, hex: c.hex, usage: "" })),
    neutrals,
    typography,
    source: "figma",
  };
}

async function extractFromImage(
  base64Data: string,
  mediaType: string
): Promise<DesignTokens> {
  const response = await callClaude({
    system: EXTRACT_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/png"
                | "image/jpeg"
                | "image/gif"
                | "image/webp",
              data: base64Data,
            },
          },
          {
            type: "text",
            text: "Extract the design tokens (colors, typography) from this image.",
          },
        ],
      },
    ],
  });

  const cleaned = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return { ...parsed, source: "upload" };
  } catch {
    throw new Error("Failed to parse design tokens from image");
  }
}

async function extractFromText(text: string): Promise<DesignTokens> {
  const response = await callClaude({
    system: EXTRACT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Extract design tokens from this style guide / token file:\n\n${text.slice(0, 15000)}`,
      },
    ],
  });

  const cleaned = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return { ...parsed, source: "upload" };
  } catch {
    throw new Error("Failed to parse design tokens from text");
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await ctx.params;

  try {
    const body = await req.json();
    let tokens: DesignTokens;

    switch (body.source) {
      case "figma":
        tokens = await extractFromFigma(productId, body.figmaFileUrl);
        break;
      case "image":
        tokens = await extractFromImage(
          body.data,
          body.mediaType || "image/png"
        );
        break;
      case "text":
        tokens = await extractFromText(body.text);
        break;
      default:
        return Response.json({ error: "Invalid source" }, { status: 400 });
    }

    return Response.json(tokens);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to extract design tokens";
    return Response.json({ error: message }, { status: 500 });
  }
}
