import { getProduct, saveDiscovery } from "@/lib/projects";
import { extractFromDiscovery } from "@/lib/knowledge";
import { streamClaude } from "@/lib/claude";
import { fixJSON } from "@/lib/discovery-types";

const DISCOVERY_SYSTEM = `You are a Product Design Discovery Agent at HumanX Design Agency. You analyze a product brief and produce a structured Insights Deck as JSON — focused on informing PRODUCT DESIGN decisions (UX patterns, interaction models, visual design, information architecture, user flows).

CRITICAL RULES:
1. Respond ONLY with valid JSON. No markdown, no backticks, no preamble.
2. Keep ALL string values to max 2 sentences. This prevents truncation.
3. Never use newlines or unescaped quotes inside string values.
4. Use web search extensively to find real competitors, products, UX patterns, design approaches, and user behavior data.
5. Apply a GLOBAL benchmarking lens — include platforms from US, UK, Europe, Southeast Asia, not just the target market.

DESIGN FOCUS:
- The "metrics" array must contain 4 product-design-relevant stats — e.g. "Key UX Friction" (top drop-off point), "Primary User Action" (most common flow), "Design Benchmark Gap" (vs best-in-class), "Conversion Lever" (which design element most impacts conversion). Do NOT use generic business metrics like market size, revenue, or funding amounts. Each metric should directly inform a design decision.
- category_insights should focus on how the category's DESIGN PATTERNS and USER EXPECTATIONS are evolving — not market financials.
- audience_insights should focus on user BEHAVIORS, MENTAL MODELS, and INTERACTION PREFERENCES — what users expect to see, how they navigate, what confuses them.
- ux_benchmarks should compare specific DESIGN ATTRIBUTES: navigation patterns, product page layouts, onboarding flows, checkout UX, mobile interactions, content hierarchy.
- opportunities should describe DESIGN OPPORTUNITIES — new interaction patterns, underexplored UX approaches, visual storytelling techniques, information architecture improvements.

JSON structure:
{"title":"string","subtitle":"string","metrics":[{"label":"string","value":"string"}],"category_insights":[{"number":1,"headline":"string","evidence":"string","implication":"string"}],"audience_insights":[{"segment":"string","headline":"string","gap":"string","benchmark":"string"}],"ux_benchmarks":[{"attribute":"string","dominant":{"players":["string"],"description":"string"},"contrarian":{"players":["string"],"description":"string"},"cross_category":{"platform":"string","industry":"string","pattern":"string"},"gap":"string"}],"conversion_retention":{"first_purchase":[{"platform":"string","market":"XX","trigger":"string"}],"retention":[{"platform":"string","mechanism":"string","verdict":"positive|negative","verdict_text":"string"}],"takeaway":"string"},"feature_benchmark":{"local":{"brands":["string"],"features":[{"name":"string","values":["string"]}]},"global":{"brands":["string"],"features":[{"name":"string","values":["string"]}]},"takeaway":"string"},"cross_category":[{"platform":"string","industry":"string","pattern":"string","transferable":"string","study":"string"}],"opportunities":[{"rank":1,"title":"string","description":"string","proof":"string","risk":"string","tags":["string"]}],"glossary":{"platforms":[{"name":"string","market":"XX","url":"string","why":"string","screenshot":"string"}],"patterns":[{"name":"string","example":"string","why":"string"}]}}

Produce exactly: 5 category_insights, 5 audience_insights, 4 ux_benchmarks, 4 first_purchase + 4 retention entries, 4 local + 4 global brands with 8 features each (values: Strong/Basic/None/short phrase), 5 cross_category, 5 opportunities, 8 glossary platforms, 6 glossary patterns, 4 metrics.

QUALITY RULES:
- Every insight must name specific products, cite specific UX patterns, or describe specific user behaviors
- Every insight must reveal a design tension or contradiction — not just state a business fact
- Every insight must be actionable for a DESIGNER — the team can immediately ask "how might we design..." based on it
- Feature benchmark features should be UX/design features (e.g. "Ingredient explainer", "Quick-add to cart", "Visual search", "Social proof placement") not business capabilities
- Be specific. Global lens. Keep strings SHORT. JSON only.`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  if (!product.enriched_pcd) {
    return Response.json(
      { error: "No enriched PCD found. Complete Product Context first." },
      { status: 400 }
    );
  }

  let briefText = product.enriched_pcd;
  try {
    const body = await request.json();
    if (body.brief && typeof body.brief === "string") {
      briefText = body.brief;
    }
  } catch {
    // No body — use enriched_pcd
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const userMessage = `Product brief below. Generate the Discovery Insights Deck as JSON. Keep values concise.\n\n${briefText}`;

        const messageStream = await streamClaude({
          system: DISCOVERY_SYSTEM,
          userMessage,
          useSearch: true,
          maxTokens: 16000,
        });

        let fullText = "";
        let charCount = 0;
        let lastSnippetCount = 0;

        messageStream.on("text", (text: string) => {
          fullText += text;
          charCount += text.length;
          if (charCount % 500 < text.length) {
            // Extract insight headlines from partial JSON as they stream in
            const headlineMatches = [...fullText.matchAll(/"headline"\s*:\s*"([^"]{10,100})"/g)];
            const snippets = headlineMatches.map((m) => m[1]);
            if (snippets.length > lastSnippetCount) {
              lastSnippetCount = snippets.length;
              send({ progress: charCount, snippets });
            } else {
              send({ progress: charCount });
            }
          }
        });

        messageStream.on("error", (err: Error) => {
          send({ error: err.message });
          controller.close();
        });

        await messageStream.finalMessage();

        const deck = fixJSON(fullText);
        await saveDiscovery(id, deck);

        // Extract knowledge entries (fire-and-forget)
        extractFromDiscovery(id, deck as unknown as Record<string, unknown>).catch(console.error);

        send({ deck, done: true });
        controller.close();
      } catch (err) {
        send({
          error: err instanceof Error ? err.message : "Discovery failed",
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
