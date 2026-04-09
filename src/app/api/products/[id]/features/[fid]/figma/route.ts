import { NextResponse } from "next/server";
import { getProduct, getFeature } from "@/lib/projects";
import { getValidFigmaToken } from "@/lib/figma-auth";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.HUMANX_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
const client = new Anthropic({ apiKey: apiKey! });

const FIGMA_PUSH_SYSTEM = `You are a Figma wireframe generator. Use the use_figma tool to create a wireframe as native Figma layers.

CRITICAL: layoutSizingHorizontal = "FILL" can ONLY be set AFTER the node is appended to an auto-layout parent.
WRONG: child.layoutSizingHorizontal = "FILL"; parent.appendChild(child);
RIGHT: parent.appendChild(child); child.layoutSizingHorizontal = "FILL";

Start your code with these helpers:

await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });

function hex(r, g, b) { return { r: r/255, g: g/255, b: b/255 }; }
const WHITE = [{ type: "SOLID", color: hex(255,255,255) }];
const BG = [{ type: "SOLID", color: hex(245,245,245) }];
const PLACEHOLDER = [{ type: "SOLID", color: hex(204,204,204) }];
const DARK = [{ type: "SOLID", color: hex(51,51,51) }];
const MID = [{ type: "SOLID", color: hex(136,136,136) }];

function txt(str, size, style, color) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style: style || "Regular" };
  t.characters = str; t.fontSize = size || 14; t.fills = color || DARK;
  return t;
}

function alf(name, dir, gap, padT, padB, padL, padR, fills) {
  const f = figma.createFrame();
  f.name = name; f.layoutMode = dir || "VERTICAL";
  f.itemSpacing = gap || 0;
  f.paddingTop = padT || 0; f.paddingBottom = padB || 0;
  f.paddingLeft = padL || 0; f.paddingRight = padR || 0;
  f.fills = fills || [];
  f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
  return f;
}

RULES:
1. Load fonts FIRST: await figma.loadFontAsync for Inter Regular, Bold, Semi Bold
2. ONE parent frame named after the concept. Mobile=375px, Desktop=1440px width.
3. GREYSCALE ONLY: BG #F5F5F5, surfaces #FFFFFF, text #333, secondary #888, placeholders #CCC
4. Auto-layout on every container. Use alf() helper.
5. ALWAYS: parent.appendChild(child) THEN child.layoutSizingHorizontal = "FILL"
6. Image placeholders = grey frames with centered text labels
7. Name every node descriptively
8. Use REAL content from the product context
9. Corner radius: 8 for cards/buttons, 0 for sections
10. End with figma.viewport.scrollAndZoomIntoView([parentFrame])
11. The wireframe must EMBODY the concept metaphor — a shelf should look like a shelf`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  const { id, fid } = await params;
  const { conceptIndex, figmaFileUrl } = await req.json();

  try {
    const figmaToken = await getValidFigmaToken(id);
    if (!figmaToken) {
      return NextResponse.json(
        { error: "Figma not connected. Please connect your Figma account first." },
        { status: 401 }
      );
    }

    const [product, feature] = await Promise.all([
      getProduct(id),
      getFeature(fid),
    ]);

    if (!feature.concepts?.[conceptIndex]) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    const concept = feature.concepts[conceptIndex];
    const platform = product.product_context?.platform || "responsive";
    const width = ["mobile", "ios", "android", "iosAndroid"].includes(platform)
      ? 375
      : 1440;

    // Extract fileKey from Figma URL
    const fileKeyMatch = figmaFileUrl.match(
      /figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/
    );
    const fileKey = fileKeyMatch?.[1];
    if (!fileKey) {
      return NextResponse.json(
        { error: "Invalid Figma file URL" },
        { status: 400 }
      );
    }

    const userMessage = `Create a wireframe in Figma file with key: ${fileKey}

## Concept: "${concept.name}" (Track ${concept.track})
${concept.coreIdea}
Delight: ${concept.delightMoment}

## Product
${product.product_context?.productName || product.name} by ${product.product_context?.company || product.company}
${product.product_context?.explain?.substring(0, 400) || ""}
User: ${product.product_context?.seg1?.name || "Primary user"}

## Layout Reference
${concept.wireframeHtml ? concept.wireframeHtml.replace(/<[^>]+>/g, " ").substring(0, 1500) : "Build from the core idea."}

Frame: ${width}px wide, auto-height. Use the use_figma tool now.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- beta MCP API not yet typed in SDK
    const response = await (client as any).beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: FIGMA_PUSH_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      mcp_servers: [
        {
          type: "url",
          url: "https://mcp.figma.com/mcp",
          name: "figma",
          authorization_token: figmaToken,
        },
      ],
      tools: [
        {
          type: "mcp_toolset",
          mcp_server_name: "figma",
        },
      ],
      betas: ["mcp-client-2025-11-20"],
    });

    const toolUses = response.content.filter(
      (b: { type: string }) => b.type === "mcp_tool_use"
    );
    const textBlocks = response.content.filter(
      (b: { type: string }) => b.type === "text"
    );
    const success = toolUses.length > 0;

    return NextResponse.json({
      success,
      message: success
        ? `"${concept.name}" pushed to Figma!`
        : "Push may have failed. Check your Figma file.",
      details: textBlocks.map((b: { text?: string }) => b.text ?? "").join("\n"),
    });
  } catch (error: unknown) {
    console.error("Figma push error:", error);
    const message = error instanceof Error ? error.message : "Push to Figma failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
