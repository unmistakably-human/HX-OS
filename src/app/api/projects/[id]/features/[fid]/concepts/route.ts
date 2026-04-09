import { NextRequest } from "next/server";
import { getProject, getFeature, saveConcepts } from "@/lib/projects";
import { callClaude } from "@/lib/claude";

const CONCEPT_SYSTEM = `You are a senior product designer at HumanX Design Agency generating concept variations.

You have: the Enriched PCD, Discovery insights, and a Feature Brief.

## Output: Return a JSON array of exactly 6 concept objects.

### THE DIVERGENCE RULE
Concepts must explore different conceptual metaphors and interaction paradigms — NOT different data arrangements on the same screen type. A savings jar, a Spotify Wrapped story, a receipt trail, and a social leaderboard are FOUR different metaphors. The same screen with different chart types is ONE metaphor repeated.

### Track A: The Direct Answer (2 concepts)
Fully informed by the brief. Responsible, grounded, likely to ship.

### Track B: The Wild Rethink (2-3 concepts)
Uses ONLY the core pain point. Deliberately ignores specific requirements. Explores: games, stories, animations, rituals, social experiences, physical metaphors made digital. Track B should feel like it came from a different designer.

### Outside the Brief (1 concept)
No screen at all. A push notification, tooltip, copy change, email, behavioral nudge, or non-design solution.

### JSON schema for EACH concept:
{
  "name": "Evocative concept name (3-5 words)",
  "track": "A" | "B" | "outside",
  "coreIdea": "One sentence describing the conceptual metaphor",
  "wireframeHtml": "Self-contained HTML with inline CSS. GREYSCALE ONLY: bg #F5F5F5, surfaces #FFFFFF, text #333333, secondary #888888, borders #E0E0E0, placeholders #CCCCCC. No images — grey rectangles with text labels describing what would be there. Use REAL content from the PCD (real brand name, real metrics, real persona details). The wireframe must EMBODY the metaphor — a jar concept should look like a jar, a receipt should look like a receipt. For the 'outside' concept, wireframeHtml should contain a styled text description of the non-screen solution instead of a wireframe.",
  "principles": ["Principle → where it manifests in the wireframe", "..."],
  "pros": ["Pro 1 (from the persona's perspective)", "Pro 2"],
  "cons": ["Con 1", "Con 2"],
  "delightMoment": "The specific emotional beat — WHERE it happens and WHAT the user feels. Not a micro-animation note — a felt experience.",
  "stakeholderQuestion": "An uncomfortable question that forces a real product decision"
}

Return ONLY the JSON array. No markdown, no explanation, no backticks. Just valid JSON.
Use real content from the PCD throughout — real brand name, real data, real persona context.`;

function extractJSON(text: string): string {
  // Try to parse directly first
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) return trimmed;

  // Try to extract from markdown code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find array brackets
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];

  return trimmed;
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/features/[fid]/concepts">
) {
  const { id, fid } = await ctx.params;
  try {
    // Try to read saved concepts
    const fs = await import("fs/promises");
    const path = await import("path");
    const conceptsPath = path.join(
      process.cwd(),
      "data",
      "projects",
      id,
      `concepts-${fid}.json`
    );
    const raw = await fs.readFile(conceptsPath, "utf-8");
    const concepts = JSON.parse(raw);
    return Response.json(concepts);
  } catch {
    return Response.json([], { status: 200 });
  }
}

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/features/[fid]/concepts">
) {
  const { id, fid } = await ctx.params;

  try {
    const project = await getProject(id);
    const feature = await getFeature(id, fid);

    // Build the user message with all context
    const userMessage = `## Enriched PCD
${project.enrichedPcd || "No PCD available."}

## Discovery Insights
${project.discoveryInsights || "No discovery insights available."}

## Feature Brief
- **Feature:** ${feature.name}
- **Type:** ${feature.type}
- **Problem:** ${feature.problem}
- **Must-have elements:** ${feature.mustHave}
- **Should NOT be:** ${feature.notBe || "No constraints specified."}
- **Additional context:** ${feature.context || "None."}

Generate 6 concept variations now.`;

    let responseText = await callClaude({
      system: CONCEPT_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 16000,
    });

    // Parse the JSON response
    let concepts;
    try {
      const jsonStr = extractJSON(responseText);
      concepts = JSON.parse(jsonStr);
    } catch {
      // Retry once
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
        maxTokens: 16000,
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

    // Save concepts
    await saveConcepts(id, fid, concepts);

    return Response.json(concepts);
  } catch (err) {
    console.error("Concept generation error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
