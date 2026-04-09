import { NextRequest } from "next/server";
import { getProduct, getFeature, saveConcepts } from "@/lib/projects";
import { callClaude } from "@/lib/claude";

const CONCEPT_SYSTEM = `You are a senior product designer generating concept variations.

Return a JSON array of exactly 6 concept objects. ONLY valid JSON — no markdown, no backticks, no explanation.

DIVERGENCE RULE: Each concept must use a DIFFERENT conceptual metaphor or interaction paradigm.

Tracks: A (2 concepts, grounded), B (3 concepts, wild rethinks using games/stories/metaphors), outside (1 concept, non-screen solution).

JSON schema per concept:
{"name":"3-5 word name","track":"A"|"B"|"outside","coreIdea":"One sentence metaphor","wireframeHtml":"<div style='font-family:sans-serif;padding:20px;background:#F5F5F5;min-height:300px'>SIMPLE greyscale HTML wireframe. Use divs with inline styles. Colors: bg #F5F5F5, cards #FFF, text #333, secondary #888, borders #E0E0E0. Keep under 500 chars. Use real brand names from the brief. For outside track, describe the solution in text instead.</div>","principles":["Principle 1","Principle 2"],"pros":["Pro 1","Pro 2"],"cons":["Con 1"],"delightMoment":"What the user feels and where","stakeholderQuestion":"Uncomfortable decision question"}

CRITICAL: wireframeHtml must be SHORT (under 500 chars each). Use simple nested divs, not complex layouts. Escape all quotes inside HTML attributes with &quot; since this is inside JSON strings.`;

function extractJSON(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    let depth = 0;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === "[") depth++;
      if (trimmed[i] === "]") depth--;
      if (depth === 0) return trimmed.slice(0, i + 1);
    }
    return trimmed;
  }

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  const start = trimmed.indexOf("[");
  if (start >= 0) {
    let depth = 0;
    for (let i = start; i < trimmed.length; i++) {
      if (trimmed[i] === "[") depth++;
      if (trimmed[i] === "]") depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
    return trimmed.slice(start) + "]";
  }

  return trimmed;
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; fid: string }> }
) {
  const { id, fid } = await ctx.params;

  try {
    const [product, feature] = await Promise.all([getProduct(id), getFeature(fid)]);

    const pcdSummary = (product.enriched_pcd || "No PCD available.").slice(0, 3000);
    const rawInsights = typeof product.discovery_insights === "string"
      ? product.discovery_insights
      : product.discovery_insights
        ? JSON.stringify(product.discovery_insights)
        : "No discovery insights available.";
    const discoverySummary = rawInsights.slice(0, 3000);

    const userMessage = `## Enriched PCD (summary)
${pcdSummary}

## Discovery Insights (summary)
${discoverySummary}

## Feature Brief
- **Feature:** ${feature.name}
- **Type:** ${feature.feature_type}
- **Problem:** ${feature.problem}
- **Must-have elements:** ${feature.must_have}
- **Should NOT be:** ${feature.not_be || "No constraints specified."}
- **Additional context:** ${feature.additional_context || "None."}

${feature.feature_discovery ? `## Feature-Specific Discovery\n${feature.feature_discovery.slice(0, 3000)}` : ""}

Generate 6 concept variations now. Keep each wireframeHtml under 800 characters — focus on conveying the metaphor clearly, not pixel-perfect layouts.`;

    let responseText = await callClaude({
      system: CONCEPT_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 8000,
    });

    let concepts;
    try {
      const jsonStr = extractJSON(responseText);
      concepts = JSON.parse(jsonStr);
    } catch {
      responseText = await callClaude({
        system:
          CONCEPT_SYSTEM +
          "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a valid JSON array. No text before or after.",
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: responseText },
          {
            role: "user",
            content:
              "That was not valid JSON. Please return ONLY the JSON array, with no other text.",
          },
        ],
        maxTokens: 8000,
      });

      const jsonStr = extractJSON(responseText);
      concepts = JSON.parse(jsonStr);
    }

    if (!Array.isArray(concepts)) {
      return Response.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    await saveConcepts(fid, concepts);

    return Response.json(concepts);
  } catch (err) {
    console.error("Concept generation error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
