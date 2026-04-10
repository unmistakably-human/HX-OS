import { getProduct, getFeature, saveFeatureDiscovery } from "@/lib/projects";
import { streamClaude } from "@/lib/claude";
import { getKnowledgeForContext } from "@/lib/knowledge";
import { buildProductContext } from "@/lib/context-utils";

const FEATURE_DISCOVERY_SYSTEM = `You are a senior product strategist at HumanX. Run a focused discovery for a specific FEATURE within a product.

You have the product-level context (enriched PCD) and product-level discovery insights. DO NOT repeat the product-level research. Instead, go DEEPER on the specific feature.

Produce 3 focused analyses in markdown:

## 1. Feature-Specific Competitive Benchmarking
How do 5-8 competitors (and cross-category inspirations) handle THIS specific feature/screen/flow?
For each competitor: describe the exact UX, what works, what doesn't. Include screenshots-worthy details.
Organize by UX PATTERN, not by competitor.

## 2. User Behaviour for This Feature
How do the product's user segments specifically interact with this type of feature?
What are the friction points? What are the moments of delight?
Include real behavioral data if available from the brief.

## 3. Design Opportunity for This Feature
3 specific design opportunities ranked by impact.
Each: what to do, why it works for THIS user segment, what risk to watch.

Use web search. Be specific — name real products, describe real flows, cite real patterns.`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  const { id, fid } = await params;

  let product;
  let feature;
  try {
    [product, feature] = await Promise.all([getProduct(id), getFeature(fid)]);
  } catch {
    return Response.json({ error: "Product or feature not found" }, { status: 404 });
  }

  if (!product.enriched_pcd) {
    return Response.json(
      { error: "Complete product context first." },
      { status: 400 }
    );
  }

  // Build cached product context
  const cachedContext = buildProductContext(product);

  // Check knowledge to decide if web search is needed
  const searchQuery = `${feature.name} ${feature.problem || ""} ${feature.must_have || ""}`;
  const knowledge = await getKnowledgeForContext(id, {
    query: searchQuery,
    limit: 15,
  }).catch(() => "");
  const needsSearch = !knowledge || knowledge.length < 500;

  const userMessage = `${product.discovery_insights ? `## Product Discovery Insights\n${typeof product.discovery_insights === "string" ? product.discovery_insights : JSON.stringify(product.discovery_insights)}` : ""}

${knowledge ? `## Knowledge Base\n${knowledge}` : ""}

## Feature Brief
- Feature: ${feature.name}
- Type: ${feature.feature_type}
- Problem: ${feature.problem || "Not specified"}
- Must-have: ${feature.must_have || "Not specified"}
- Should NOT be: ${feature.not_be || "Not specified"}
${feature.additional_context ? `- Additional: ${feature.additional_context}` : ""}

---
Run feature-specific discovery now.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const messageStream = await streamClaude({
          system: FEATURE_DISCOVERY_SYSTEM,
          userMessage,
          useSearch: needsSearch,
          maxTokens: 8000,
          cachedContext,
        });

        let fullText = "";
        let charCount = 0;

        messageStream.on("text", (text: string) => {
          fullText += text;
          charCount += text.length;
          if (charCount % 500 < text.length) {
            send({ progress: charCount });
          }
        });

        messageStream.on("error", (err: Error) => {
          send({ error: err.message });
          controller.close();
        });

        await messageStream.finalMessage();

        await saveFeatureDiscovery(fid, fullText);
        send({ done: true });
        controller.close();
      } catch (err) {
        send({
          error: err instanceof Error ? err.message : "Feature discovery failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
