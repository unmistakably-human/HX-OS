import { NextRequest } from "next/server";
import { getValidFigmaToken } from "@/lib/figma-auth";

// ═══ Figma URL parser ═══

function parseFigmaUrl(url: string): {
  fileKey: string;
  nodeId: string | null;
} | null {
  // Match: figma.com/design/{key}/... or figma.com/file/{key}/...
  const fileMatch = url.match(
    /figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/
  );
  if (!fileMatch) return null;

  const fileKey = fileMatch[1];

  // Extract node-id from query string: ?node-id=123-456 or ?node-id=123:456
  const nodeIdMatch = url.match(/node-id=([^&]+)/);
  let nodeId: string | null = null;
  if (nodeIdMatch) {
    // Figma uses both 123-456 and 123:456 formats; API expects colon-separated
    nodeId = decodeURIComponent(nodeIdMatch[1]).replace(/-/g, ":");
  }

  return { fileKey, nodeId };
}

// ═══ Figma API helpers ═══

const FIGMA_API = "https://api.figma.com/v1";

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  absoluteRenderBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: FigmaNode[];
}

interface FrameInfo {
  nodeId: string;
  name: string;
  width?: number;
  height?: number;
}

interface ExportedFrame {
  nodeId: string;
  name: string;
  base64: string;
  width: number;
  height: number;
}

async function figmaGet(
  path: string,
  token: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function extractFrames(node: FigmaNode, depth = 0): FrameInfo[] {
  const frames: FrameInfo[] = [];
  const isFrame =
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET";

  // Collect top-level frames (depth 0 = CANVAS/page, depth 1 = direct children)
  if (depth > 0 && isFrame) {
    const bounds =
      node.absoluteRenderBounds || node.absoluteBoundingBox;
    frames.push({
      nodeId: node.id,
      name: node.name,
      width: bounds?.width ? Math.round(bounds.width) : undefined,
      height: bounds?.height ? Math.round(bounds.height) : undefined,
    });
  }

  // Recurse into children for pages (CANVAS) and sections/groups
  // but don't recurse into frames (we want top-level frames only)
  if (
    node.children &&
    (depth === 0 ||
      node.type === "CANVAS" ||
      node.type === "SECTION" ||
      node.type === "GROUP")
  ) {
    for (const child of node.children) {
      frames.push(...extractFrames(child, depth + 1));
    }
  }

  return frames;
}

// ═══ POST handler ═══

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await ctx.params;

  try {
    const body = await req.json();
    const {
      figmaUrl,
      selectedNodeIds,
      scale = 2,
    }: {
      figmaUrl: string;
      selectedNodeIds?: string[];
      scale?: number;
    } = body;

    if (!figmaUrl) {
      return Response.json(
        { error: "figmaUrl is required" },
        { status: 400 }
      );
    }

    // Get valid Figma token for this product
    const token = await getValidFigmaToken(productId);
    if (!token) {
      return Response.json(
        {
          error:
            "Figma not connected. Please connect your Figma account first.",
        },
        { status: 401 }
      );
    }

    // Parse the Figma URL
    const parsed = parseFigmaUrl(figmaUrl);
    if (!parsed) {
      return Response.json(
        { error: "Invalid Figma URL" },
        { status: 400 }
      );
    }

    const { fileKey, nodeId } = parsed;

    // ── Mode 1: List frames (no selectedNodeIds) ──
    if (!selectedNodeIds?.length) {
      let frames: FrameInfo[] = [];

      if (nodeId) {
        // Fetch the specific node and its children
        const data = await figmaGet(
          `/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
          token
        );
        const nodes = data.nodes as Record<
          string,
          { document?: FigmaNode }
        >;
        const nodeWrapper = nodes?.[nodeId];
        if (nodeWrapper?.document) {
          frames = extractFrames(nodeWrapper.document, 0);
          // If the node itself is a frame (no children extracted), include it
          if (frames.length === 0) {
            const doc = nodeWrapper.document;
            const bounds =
              doc.absoluteRenderBounds || doc.absoluteBoundingBox;
            frames.push({
              nodeId: doc.id,
              name: doc.name,
              width: bounds?.width ? Math.round(bounds.width) : undefined,
              height: bounds?.height
                ? Math.round(bounds.height)
                : undefined,
            });
          }
        }
      } else {
        // Fetch full file structure at depth=2 (pages + top-level frames)
        const data = await figmaGet(
          `/files/${fileKey}?depth=2`,
          token
        );
        const document = data.document as FigmaNode | undefined;
        if (document?.children) {
          for (const page of document.children) {
            frames.push(...extractFrames(page, 0));
          }
        }
      }

      return Response.json({ frames });
    }

    // ── Mode 2: Export selected frames as base64 ──
    const clampedScale = Math.min(Math.max(scale, 1), 4);
    const idsParam = selectedNodeIds
      .map((id) => encodeURIComponent(id))
      .join(",");

    // First, get node metadata for dimensions and names
    const nodesData = await figmaGet(
      `/files/${fileKey}/nodes?ids=${idsParam}`,
      token
    );
    const nodeMap = nodesData.nodes as Record<
      string,
      { document?: FigmaNode }
    >;

    // Request image exports from Figma
    const imagesData = await figmaGet(
      `/images/${fileKey}?ids=${idsParam}&scale=${clampedScale}&format=png`,
      token
    );
    const imageUrls = (imagesData.images || {}) as Record<string, string>;

    // Download each image and convert to base64
    const exportedFrames: ExportedFrame[] = [];

    for (const nid of selectedNodeIds) {
      const imageUrl = imageUrls[nid];
      if (!imageUrl) continue;

      const nodeWrapper = nodeMap[nid];
      const doc = nodeWrapper?.document;
      const bounds =
        doc?.absoluteRenderBounds || doc?.absoluteBoundingBox;

      try {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) continue;

        const buffer = Buffer.from(await imgRes.arrayBuffer());

        // Convert to base64 -- the image from Figma is already PNG at the
        // requested scale so we pass it through directly.
        const base64 = buffer.toString("base64");

        exportedFrames.push({
          nodeId: nid,
          name: doc?.name || nid,
          base64,
          width: bounds?.width ? Math.round(bounds.width) : 0,
          height: bounds?.height ? Math.round(bounds.height) : 0,
        });
      } catch (err) {
        console.error(`Failed to download frame ${nid}:`, err);
      }
    }

    return Response.json({ frames: exportedFrames });
  } catch (err) {
    console.error("Figma frames error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch Figma frames";
    return Response.json({ error: message }, { status: 500 });
  }
}
