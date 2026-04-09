import { getProduct, getFeature, updateFeature } from "@/lib/projects";
import { extractFromInsights, getKnowledgeForContext } from "@/lib/knowledge";
import { callClaude } from "@/lib/claude";

const INSIGHTS_SYSTEM = `You are a senior product strategist running focused research for a specific feature. Generate structured insights across exactly 3 categories.

Return ONLY valid JSON — no markdown, no backticks, no preamble.

JSON structure:
{
  "insights": [
    {
      "id": "u1",
      "category": "user",
      "tag": "BEHAVIOUR|SAY/DO GAP|LITERACY GAP|RETENTION RISK|GROWTH|FRICTION",
      "headline": "Punchy one-line insight in quotes if it's a user quote",
      "body": "1-2 sentences of evidence or context. What makes this surprising or non-obvious?"
    }
  ]
}

RULES:
1. Generate exactly 5 insights per category (15 total):
   - category "user": User Behaviour — what users actually do at this touchpoint. At least one must be a say/do contradiction. At least one specific to the target market.
   - category "domain": Domain/Category — how this category shapes what the design must do. At least one must challenge a common assumption.
   - category "competitor": Benchmarks — what best/worst implementations reveal. Organised by pattern, not by product. At least one cross-category reference. Include global examples.

2. IDs: user insights = u1-u5, domain = d1-d5, competitor = c1-c5

3. Every insight must be:
   - Specific — names a behaviour, product, number, or market condition
   - Surprising — non-obvious to a product designer
   - Tensioned — highlights a contradiction or trade-off
   - Actionable — a designer can immediately ask "how might we..." from it

4. Use web search to find real products, real data, real patterns. Name names.

5. Keep headlines punchy (under 15 words). Keep body concise (2 sentences max).`;

function extractJSON(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    let depth = 0;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === "{") depth++;
      if (trimmed[i] === "}") depth--;
      if (depth === 0) return trimmed.slice(0, i + 1);
    }
  }
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const start = trimmed.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    for (let i = start; i < trimmed.length; i++) {
      if (trimmed[i] === "{") depth++;
      if (trimmed[i] === "}") depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }
  return trimmed;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  const { id, fid } = await params;

  try {
    const [product, feature] = await Promise.all([getProduct(id), getFeature(fid)]);

    if (!product.enriched_pcd) {
      return Response.json({ error: "Complete product context first." }, { status: 400 });
    }

    // Use knowledge base with semantic search for relevant context
    const searchQuery = `${feature.name} ${feature.problem || ""} ${feature.must_have || ""}`;
    const knowledge = await getKnowledgeForContext(id, {
      query: searchQuery,
      limit: 20,
    });

    const userMessage = `## Product: ${product.name}${product.company ? ` (${product.company})` : ""}

${knowledge ? `## Knowledge Base (key insights & research)\n${knowledge}` : `## Product Context\n${product.enriched_pcd.slice(0, 4000)}`}

## Feature Brief
- Feature: ${feature.name}
- Type: ${feature.feature_type}
- Problem: ${feature.problem || "Not specified"}
- Must-have: ${feature.must_have || "Not specified"}
- Should NOT be: ${feature.not_be || "Not specified"}
${feature.additional_context ? `- Additional: ${feature.additional_context}` : ""}

Generate 15 insights (5 per category) for this feature now.`;

    const responseText = await callClaude({
      system: INSIGHTS_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      useSearch: true,
      maxTokens: 8000,
    });

    const jsonStr = extractJSON(responseText);
    const parsed = JSON.parse(jsonStr);
    const insights = parsed.insights || parsed;

    if (!Array.isArray(insights)) {
      return Response.json({ error: "Invalid response format" }, { status: 500 });
    }

    // Save insights and advance phase
    await updateFeature(fid, {
      insights,
      phase_discovery: "active",
    });

    // Extract knowledge entries (fire-and-forget)
    extractFromInsights(id, fid, insights).catch(console.error);

    return Response.json({ insights });
  } catch (err) {
    console.error("Insights generation error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
