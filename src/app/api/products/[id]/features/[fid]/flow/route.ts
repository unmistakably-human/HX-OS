import { getProduct, getFeature, updateFeature } from "@/lib/projects";
import { callClaude } from "@/lib/claude";
import { getKnowledgeForContext } from "@/lib/knowledge";

const FLOW_SYSTEM = `You are a senior UX designer generating an interactive user flow diagram for a product feature.

Given a design concept and feature brief, produce a complete user flow as JSON. Return ONLY valid JSON — no markdown, no backticks.

JSON structure:
{
  "screens": [
    { "id": "unique_id", "title": "Screen Title", "elements": ["Element 1", "Element 2", "Element 3", "Element 4", "Element 5"], "x": 0, "y": 0 }
  ],
  "decisions": [
    { "id": "unique_id", "label": "Question?", "x": 1.5, "y": 0.5 }
  ],
  "connections": [
    { "from": "screen_id", "to": "screen_id", "label": "User action" },
    { "from": "screen_id", "to": "screen_id", "label": "Error path", "type": "error" }
  ],
  "changelog": [
    { "screen": "Screen Title", "status": "original|new|updated", "note": "Why this screen exists" }
  ],
  "rationale": [
    { "title": "Addition Name", "icon": "emoji", "reason": "Why this was added to the flow" }
  ],
  "edge_cases": [
    { "category": "Category Name", "items": ["Edge case description 1", "Edge case description 2"] }
  ]
}

RULES:
1. Generate 8-15 screens covering the complete user journey for this feature
2. Include 2-4 decision points (diamonds) for branching logic
3. Include error states, empty states, and edge case screens
4. Include at least one alternate entry point (e.g., notification deep link, share link)
5. Position screens on a grid: x (columns, 0-5), y (rows, 0-3). Main happy path flows left-to-right on y=1. Error states on y=2. Alt entries on y=0.
6. Every screen needs 4-6 UI elements listed
7. Connections need clear action labels ("Taps X", "Submits", "Swipes")
8. Error connections must have type: "error"
9. Changelog: mark screens as "original" (from the brief), "new" (added by you), or "updated" (enhanced)
10. Rationale: explain WHY each new screen or decision was added (3-7 items)
11. Edge cases: 4-6 categories with 3-6 items each covering errors, boundaries, alt paths, permissions, device contexts
12. Use real product/brand names from the context
13. Keep all string values concise (1-2 sentences max)`;

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

    // Get selected concept
    const selectedConceptNames = feature.chosen_concept?.split("|||") || [];
    const selectedConcept = feature.design_concepts?.find((c) =>
      selectedConceptNames.includes(c.name)
    ) || feature.design_concepts?.[0];

    if (!selectedConcept) {
      return Response.json({ error: "No concept selected" }, { status: 400 });
    }

    const knowledge = await getKnowledgeForContext(id, {
      query: `${feature.name} ${feature.problem || ""} user flow screens`,
      limit: 10,
    });

    const userMessage = `## Product: ${product.name}
## Feature: ${feature.name}
Type: ${feature.feature_type}
Problem: ${feature.problem || "Not specified"}
Must-have: ${feature.must_have || "Not specified"}

## Selected Concept: "${selectedConcept.name}"
${selectedConcept.tagline}
${selectedConcept.idea}
Solves for: ${selectedConcept.solvesFor}
On the page: ${selectedConcept.onThePage?.join(", ") || "N/A"}

${knowledge ? `## Knowledge Base\n${knowledge}` : ""}

Generate the complete user flow for this feature and concept now.`;

    const responseText = await callClaude({
      system: FLOW_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 8000,
    });

    const jsonStr = extractJSON(responseText);
    const flow = JSON.parse(jsonStr);

    if (!flow.screens || !Array.isArray(flow.screens)) {
      return Response.json({ error: "Invalid flow format" }, { status: 500 });
    }

    await updateFeature(fid, {
      user_flow: flow,
      phase_flow: "complete",
    });

    return Response.json(flow);
  } catch (err) {
    console.error("Flow generation error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Flow generation failed" },
      { status: 500 }
    );
  }
}
