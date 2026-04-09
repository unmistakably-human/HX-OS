import { NextRequest } from "next/server";
import { getValidFigmaToken } from "@/lib/figma-auth";
import { callClaude } from "@/lib/claude";
import type { DesignTokens } from "@/lib/types";

const EXTRACT_SYSTEM = `You extract design tokens from visual assets.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "brandColors": [{"name": "Primary", "hex": "#XXXXXX"}, {"name": "Secondary", "hex": "#XXXXXX"}],
  "gradient": "linear-gradient(135deg, #XXX 0%, #XXX 100%)" or null,
  "neutrals": [{"name": "White", "hex": "#FFFFFF"}, ...up to 5],
  "typography": [{"level": "H1", "font": "FontName", "weight": "Bold", "size": "32px"}, ...up to 5]
}
Extract at most 3 brand colors. Include 1 gradient if visible, otherwise null. Up to 5 neutrals and 5 typography levels.
For images: identify dominant brand colors, background/text neutrals, and any visible fonts.
For text files: parse color tokens (hex/rgb) and font specifications.`;

function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function extractFromFigma(
  productId: string,
  figmaFileUrl: string
): Promise<DesignTokens> {
  const token = await getValidFigmaToken(productId);
  if (!token) throw new Error("Figma not connected. Please connect Figma first.");

  const match = figmaFileUrl.match(
    /figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/
  );
  if (!match) throw new Error("Invalid Figma URL");
  const fileKey = match[1];

  // Fetch variables and styles in parallel
  const headers = { Authorization: `Bearer ${token}` };
  const [varsRes, stylesRes] = await Promise.all([
    fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
      headers,
    }),
    fetch(`https://api.figma.com/v1/files/${fileKey}/styles`, { headers }),
  ]);

  const brandColors: { name: string; hex: string }[] = [];
  const neutrals: { name: string; hex: string }[] = [];
  const typography: {
    level: string;
    font: string;
    weight: string;
    size: string;
  }[] = [];

  // Parse variables
  if (varsRes.ok) {
    const varsData = await varsRes.json();
    const variables = varsData.meta?.variables || {};
    for (const v of Object.values(variables) as { resolvedType?: string; valuesByMode?: Record<string, { r?: number; g?: number; b?: number }>; name?: string }[]) {
      if (v.resolvedType === "COLOR" && v.valuesByMode) {
        const modeValues = Object.values(v.valuesByMode)[0];
        if (modeValues?.r !== undefined && modeValues?.g !== undefined && modeValues?.b !== undefined) {
          const hex = rgbaToHex(modeValues.r, modeValues.g, modeValues.b);
          const name = v.name?.replace(/\//g, " / ") || "Color";
          // Heuristic: variables with "neutral" or "gray" in name go to neutrals
          const lowerName = name.toLowerCase();
          if (
            lowerName.includes("neutral") ||
            lowerName.includes("gray") ||
            lowerName.includes("grey") ||
            lowerName.includes("bg") ||
            lowerName.includes("background") ||
            lowerName.includes("surface")
          ) {
            if (neutrals.length < 5) neutrals.push({ name, hex });
          } else {
            if (brandColors.length < 3) brandColors.push({ name, hex });
          }
        }
      }
    }
  }

  // Parse styles for typography
  if (stylesRes.ok) {
    const stylesData = await stylesRes.json();
    const styles = stylesData.meta?.styles || [];
    for (const s of styles) {
      if (s.style_type === "TEXT" && typography.length < 5) {
        typography.push({
          level: s.name || `Level ${typography.length + 1}`,
          font: s.description || "Unknown",
          weight: "Regular",
          size: "",
        });
      }
    }
  }

  return {
    brandColors: brandColors.length ? brandColors : [{ name: "Primary", hex: "#000000" }],
    neutrals: neutrals.length ? neutrals : [{ name: "Background", hex: "#FFFFFF" }],
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

  const cleaned = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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

  const cleaned = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
        tokens = await extractFromImage(body.data, body.mediaType || "image/png");
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
