import { getProduct, getFeature, updateFeature } from "@/lib/projects";
import { callClaude } from "@/lib/claude";

const CONCEPTS_SYSTEM = `You are a senior product designer generating design concepts from HMW questions.

Given selected HMW questions and product context, generate 3 distinct design concepts, a baseline reference, and beyond-the-screen interventions.

Return ONLY valid JSON — no markdown, no backticks.

JSON structure:
{
  "concepts": [
    {
      "name": "The [Creative Name]",
      "tagline": "One-line belief statement",
      "idea": "2-3 sentences. What is this concept's answer? What creative choice organises everything?",
      "solvesFor": "Which insight/need is the engine? Which segment benefits most?",
      "onThePage": ["IA item 1", "IA item 2", "IA item 3", "IA item 4", "IA item 5", "IA item 6"],
      "tradeoffs": ["What this gives up", "Which segment it deprioritises", "What would have to be true for it to fail"],
      "fromHMW": "The HMW question this concept addresses"
    }
  ],
  "baseline": {
    "mustHaves": ["Element 1", "Element 2", "Element 3", "Element 4", "Element 5", "Element 6", "Element 7", "Element 8"],
    "commonlyMissed": ["Missed element 1", "Missed element 2", "Missed element 3"]
  },
  "beyondScreen": [
    {
      "touchpoint": "Name of touchpoint/moment",
      "why": "What it addresses and why this surface may be more effective"
    }
  ]
}

RULES:
1. Generate exactly 3 concepts. Each must be DISTINCT — different solution approach, different insight focus, different creative framing.
2. Name the concept, not the feature. Good: "The Trust Ladder". Bad: "Concept A — More visual".
3. The tagline should tell a designer what this concept BELIEVES about the user.
4. onThePage: 6-8 items describing the loose IA/content hierarchy of the screen.
5. Tradeoffs must be specific — name a segment, metric, or use case being deprioritised.
6. Baseline: must-haves list what EVERY version of this screen needs regardless of concept. commonlyMissed: 2-3 elements research shows are frequently absent.
7. beyondScreen: 3-5 interventions at other touchpoints where the same intent could be addressed. Include non-obvious ones (notifications, widgets, adjacent screens).
8. Each concept traces to at least one HMW question.`;

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
  req: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  const { id, fid } = await params;

  try {
    const { selectedHmwIds } = await req.json();
    const [product, feature] = await Promise.all([getProduct(id), getFeature(fid)]);

    if (!feature.hmw_statements || !Array.isArray(selectedHmwIds) || selectedHmwIds.length === 0) {
      return Response.json({ error: "No HMWs selected" }, { status: 400 });
    }

    const selectedHmws = feature.hmw_statements.filter((h) =>
      selectedHmwIds.includes(h.id)
    );

    const pcdSummary = (product.enriched_pcd || "").slice(0, 3000);

    const userMessage = `## Product Context
${pcdSummary}

## Feature
- Name: ${feature.name}
- Type: ${feature.feature_type}
- Problem: ${feature.problem}
- Must-have: ${feature.must_have}

## Selected HMW Questions
${selectedHmws.map((h) => `- ${h.question}`).join("\n")}

## Selected Insights (for reference)
${(feature.insights || [])
  .filter((i) => (feature.selected_insights || []).includes(i.id))
  .map((i) => `- [${i.tag}] ${i.headline}`)
  .join("\n")}

Generate 3 design concepts + baseline + beyond-the-screen interventions now.`;

    const responseText = await callClaude({
      system: CONCEPTS_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      useSearch: true,
      maxTokens: 8000,
    });

    const jsonStr = extractJSON(responseText);
    const parsed = JSON.parse(jsonStr);

    const concepts = parsed.concepts;
    const baseline = parsed.baseline;
    const beyondScreen = parsed.beyondScreen || parsed.beyond_screen;

    if (!Array.isArray(concepts)) {
      return Response.json({ error: "Invalid response format" }, { status: 500 });
    }

    // Save everything
    await updateFeature(fid, {
      selected_hmws: selectedHmwIds,
      design_concepts: concepts,
      baseline,
      beyond_screen: beyondScreen,
      phase_hmw: "complete",
      phase_design_concepts: "active",
    });

    return Response.json({ concepts, baseline, beyondScreen });
  } catch (err) {
    console.error("Concept generation error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
