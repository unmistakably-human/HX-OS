import { getProject, updateProject } from "@/lib/projects";
import { streamClaude } from "@/lib/claude";

const ENRICH_SYSTEM = `You are a senior product designer at HumanX (HXOS). Generate an Enriched Product Context Document from this brief. Use web search to research the product, competitors, and market.

Produce thorough markdown with sections:
# ENRICHED PRODUCT CONTEXT DOCUMENT
## 1. Product Identity — name, company, type, stage, market, business model [VERIFY], cultural context [VERIFY]
## 2. Users & Personas — primary + secondary segments with inferred goals [VERIFY], frustrations [VERIFY], success metrics [VERIFY]
## 3. Market & Competitive Context — 3-5 real competitors in a table, UX patterns for this category
## 4. Product Architecture — screens, workflows, inferred IA [VERIFY], core objects [VERIFY]
## 5. Design Language — visual direction, palette [VERIFY], typography [VERIFY], tone [VERIFY], 3-5 design principles [VERIFY]
## 6. Platform & Constraints — platform, framework [VERIFY], accessibility
## 7. Sample Content — 5-7 realistic samples [GENERATED]

Be opinionated. Mark inferences [VERIFY]. Use real competitor names and data.`;

function serializeContext(ctx: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(ctx)) {
    if (!val) continue;
    if (typeof val === "string") {
      lines.push(`${key}: ${val}`);
    } else if (Array.isArray(val)) {
      lines.push(`${key}: ${val.join(", ")}`);
    } else if (typeof val === "object") {
      const obj = val as Record<string, string>;
      const inner = Object.entries(obj)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
      if (inner) lines.push(`${key}: ${inner}`);
    }
  }
  return lines.join("\n");
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  }

  const context = project.productContext;
  if (!context) {
    return new Response(JSON.stringify({ error: "No product context" }), { status: 400 });
  }

  const briefText = serializeContext(context as unknown as Record<string, unknown>);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await streamClaude({
          system: ENRICH_SYSTEM,
          userMessage: briefText,
          useSearch: true,
          maxTokens: 8000,
        });
        let fullText = "";

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }

        // Save enriched PCD and advance phase
        await updateProject(id, {
          enrichedPcd: fullText,
          phases: {
            ...project.phases,
            context: "complete",
            discovery: "active",
          },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
