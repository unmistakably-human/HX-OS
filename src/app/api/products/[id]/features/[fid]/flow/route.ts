import { getProduct, getFeature, updateFeature } from "@/lib/projects";
import { callClaude } from "@/lib/claude";
import { getKnowledgeForContext } from "@/lib/knowledge";
import { sanitizeUserFlow } from "@/lib/types";

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

CRITICAL — SCREENS vs DECISIONS ARE DISJOINT:
- Decision points (diamonds, branching logic) belong ONLY in the "decisions" array.
- NEVER place a decision object in "screens". NEVER duplicate a node id across both arrays.
- Every entry in "screens" MUST have a non-empty string "title" and a non-empty array "elements" (4–6 items). If you cannot fill both, the node is a decision — put it in "decisions".
- Every entry in "decisions" MUST have a "label" (the branching question). Decisions have no "title" and no "elements".
- "connections" reference ids from EITHER array.

Minimal valid example showing the separation:
{
  "screens": [
    { "id": "home", "title": "Home", "elements": ["Search bar", "Featured items", "Cart icon", "Profile avatar"], "x": 0, "y": 1 },
    { "id": "results", "title": "Search Results", "elements": ["Result list", "Filter chips", "Sort dropdown", "Empty state link"], "x": 2, "y": 1 }
  ],
  "decisions": [
    { "id": "has_results", "label": "Any results?", "x": 1, "y": 1 }
  ],
  "connections": [
    { "from": "home", "to": "has_results", "label": "Submits search" },
    { "from": "has_results", "to": "results", "label": "Yes" }
  ]
}

RULES:
1. Generate 8-15 screens covering the complete user journey for this feature
2. Include 2-4 decision points (diamonds) for branching logic — IN "decisions" ONLY
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
    const parsed = JSON.parse(jsonStr);

    if (!parsed.screens || !Array.isArray(parsed.screens)) {
      return Response.json({ error: "Invalid flow format" }, { status: 500 });
    }

    const flow = sanitizeUserFlow(parsed);

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
