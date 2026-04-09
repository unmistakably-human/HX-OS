import { getProject, saveDiscovery } from "@/lib/projects";
import { callClaude } from "@/lib/claude";
import { fixJSON } from "@/lib/discovery-types";

const DISCOVERY_SYSTEM = `You are a Discovery Agent. You take a product brief and produce a structured Insights Deck as JSON.

CRITICAL RULES:
1. Respond ONLY with valid JSON. No markdown, no backticks, no preamble.
2. Keep ALL string values to max 2 sentences. This prevents truncation.
3. Never use newlines or unescaped quotes inside string values.
4. Use web search extensively (15+ searches) to find real competitors, products, market data, reviews, and adoption metrics.
5. Apply a GLOBAL benchmarking lens — include platforms from US, UK, Europe, Southeast Asia, not just the target market.

JSON structure:
{"title":"string","subtitle":"string","metrics":[{"label":"string","value":"string"}],"category_insights":[{"number":1,"headline":"string","evidence":"string","implication":"string"}],"audience_insights":[{"segment":"string","headline":"string","gap":"string","benchmark":"string"}],"ux_benchmarks":[{"attribute":"string","dominant":{"players":["string"],"description":"string"},"contrarian":{"players":["string"],"description":"string"},"cross_category":{"platform":"string","industry":"string","pattern":"string"},"gap":"string"}],"conversion_retention":{"first_purchase":[{"platform":"string","market":"XX","trigger":"string"}],"retention":[{"platform":"string","mechanism":"string","verdict":"positive|negative","verdict_text":"string"}],"takeaway":"string"},"feature_benchmark":{"local":{"brands":["string"],"features":[{"name":"string","values":["string"]}]},"global":{"brands":["string"],"features":[{"name":"string","values":["string"]}]},"takeaway":"string"},"cross_category":[{"platform":"string","industry":"string","pattern":"string","transferable":"string","study":"string"}],"opportunities":[{"rank":1,"title":"string","description":"string","proof":"string","risk":"string","tags":["string"]}],"glossary":{"platforms":[{"name":"string","market":"XX","url":"string","why":"string","screenshot":"string"}],"patterns":[{"name":"string","example":"string","why":"string"}]}}

Produce exactly: 5 category_insights, 5 audience_insights, 4 ux_benchmarks, 4 first_purchase + 4 retention entries, 4 local + 4 global brands with 8 features each (values: Strong/Basic/None/short phrase), 5 cross_category, 5 opportunities, 8 glossary platforms, 6 glossary patterns, 4 metrics.

QUALITY RULES:
- Every insight must name specific products, cite specific data, or describe specific behaviors
- Every insight must reveal a tension or contradiction — not just state an obvious fact
- Every insight must be actionable — the design team can immediately ask "how might we..." based on it
- Be specific. Global lens. Keep strings SHORT. JSON only.`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.enrichedPcd) {
    return Response.json(
      { error: "No enriched PCD found. Complete Product Context first." },
      { status: 400 }
    );
  }

  // Accept optional brief from request body, fall back to enrichedPcd
  let briefText = project.enrichedPcd;
  try {
    const body = await request.json();
    if (body.brief && typeof body.brief === "string") {
      briefText = body.brief;
    }
  } catch {
    // No body or invalid JSON — use enrichedPcd
  }

  try {
    const userMessage = `Product brief below. Generate the Discovery Insights Deck as JSON. Keep values concise.\n\n${briefText}`;

    let responseText = await callClaude({
      system: DISCOVERY_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      useSearch: true,
      maxTokens: 16000,
    });

    let deck;
    try {
      deck = fixJSON(responseText);
    } catch {
      // Retry once with a stronger prompt
      responseText = await callClaude({
        system:
          DISCOVERY_SYSTEM +
          "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY valid JSON. No markdown. No backticks. No text before or after the JSON object.",
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: responseText.slice(0, 2000) },
          {
            role: "user",
            content:
              "That was not valid JSON. Return ONLY the JSON object, starting with { and ending with }.",
          },
        ],
        useSearch: false,
        maxTokens: 16000,
      });
      deck = fixJSON(responseText);
    }

    // Save the structured deck
    await saveDiscovery(id, deck);

    return Response.json({ deck });
  } catch (err) {
    console.error("Discovery generation error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
