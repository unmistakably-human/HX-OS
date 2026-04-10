import { NextRequest } from "next/server";
import { getProduct, getFeature, saveHifiDesigns } from "@/lib/projects";
import { callClaude } from "@/lib/claude";
import { getKnowledgeForContext } from "@/lib/knowledge";
import { buildProductContext } from "@/lib/context-utils";

const HIFI_SYSTEM = `You are a senior product designer generating HIGH FIDELITY design variations.

Return a JSON array of exactly 3 hifi design objects. ONLY valid JSON — no markdown, no backticks, no explanation.

DIVERGENCE RULE: Each design must explore a DIFFERENT layout approach, information density, or spatial model while staying true to the brand.

You are generating PRODUCTION-QUALITY HTML with real brand colors, fonts, and spacing. This is NOT a wireframe — this is a polished, high-fidelity representation.

Requirements:
- Apply the product's actual design tokens (colors, fonts, spacing) provided in the brief
- Use real content from the product brief (brand names, real data, personas, copy)
- Create polished, visually refined HTML that looks like a real product
- Each design explores a different layout density, visual hierarchy, or spatial arrangement
- HTML must be fully self-contained with inline styles (no external CSS or JS)
- Target 1500-2500 characters per htmlContent (richer and more detailed than greyscale wireframes)
- Use the brand colors, font families, and spacing from the design tokens
- Include subtle visual polish: shadows, border-radius, proper padding, consistent spacing

AUTO-LAYOUT RULES (MANDATORY — this HTML will be imported into Figma):
- EVERY container must use display:flex; flex-direction:column (or row where appropriate)
- Use gap, padding, and margin for spacing — NEVER use position:absolute or position:fixed
- All child elements must use width:100% or flex properties — no fixed pixel widths that exceed their parent
- Use box-sizing:border-box on all elements
- The root element must be a single flex column container with the full screen design inside
- This ensures clean Figma auto-layout conversion when captured

JSON schema per design:
{"name":"3-5 word name","description":"2-3 sentences describing the layout approach and visual strategy","htmlContent":"<div style='display:flex;flex-direction:column;box-sizing:border-box;width:100%'>...full color, production-quality HTML with inline flex styles...</div>","priorities":"What this layout prioritizes (e.g. scannability, immersion, density)","tradeoffs":"What this layout trades off (e.g. information density vs whitespace)"}

CRITICAL: htmlContent must use flexbox layout throughout (no absolute positioning). Self-contained with inline styles using the brand's actual colors and fonts. Escape all quotes inside HTML attributes with &quot; since this is inside JSON strings.`;

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

    // Build cached product context
    const cachedContext = buildProductContext(product);

    // Use knowledge base with semantic search based on feature context
    const searchQuery = `${feature.name} ${feature.problem || ""} ${feature.must_have || ""}`;
    const knowledge = await getKnowledgeForContext(id, {
      query: searchQuery,
      limit: 15,
    });

    // Gather chosen concepts for context — filter by chosen_concept or use all
    const concepts = feature.concepts || [];
    const chosenConcepts = feature.chosen_concept
      ? concepts.filter((c) => c.name === feature.chosen_concept)
      : concepts;

    const conceptContext = chosenConcepts.length > 0
      ? chosenConcepts
          .map(
            (c) =>
              `- **${c.name}**: ${c.coreIdea}\n  Wireframe: ${c.wireframeHtml?.slice(0, 500) || "N/A"}`
          )
          .join("\n")
      : "No concepts available.";

    const userMessage = `## Knowledge Base (key insights & research)
${knowledge || "No knowledge entries yet."}

## Selected Concept(s) from Visual Variations
${conceptContext}

## Feature Brief
- **Feature:** ${feature.name}
- **Type:** ${feature.feature_type}
- **Problem:** ${feature.problem}
- **Must-have elements:** ${feature.must_have}
- **Should NOT be:** ${feature.not_be || "No constraints specified."}
- **Additional context:** ${feature.additional_context || "None."}

${feature.feature_discovery ? `## Feature-Specific Discovery\n${feature.feature_discovery.slice(0, 3000)}` : ""}

## Platform
${product.product_context?.platform === "ios" || product.product_context?.platform === "android" || product.product_context?.platform === "iosAndroid" || product.product_context?.platform === "mobile" ? "MOBILE APP — htmlContent must use max-width:375px, min-height:667px (phone aspect ratio). Design as a mobile screen." : product.product_context?.platform === "desktop" ? "DESKTOP — htmlContent should use min-width:800px." : "RESPONSIVE — htmlContent should work at 375px mobile width."}

Generate 3 high-fidelity design variations now. Each htmlContent should be 1500-2500 characters of polished, production-quality HTML using the brand's actual colors, fonts, and real content from the brief. Each design must explore a distinctly different layout approach.
Return ONLY valid JSON. Start with [ and end with ].`;

    let responseText = await callClaude({
      system: HIFI_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 10000,
      model: "claude-opus-4-6",
      cachedContext,
    });

    let designs;
    try {
      const jsonStr = extractJSON(responseText);
      designs = JSON.parse(jsonStr);
    } catch {
      responseText = await callClaude({
        system:
          HIFI_SYSTEM +
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
        maxTokens: 10000,
        model: "claude-opus-4-6",
        cachedContext,
      });

      const jsonStr = extractJSON(responseText);
      designs = JSON.parse(jsonStr);
    }

    if (!Array.isArray(designs)) {
      return Response.json(
        { error: "Invalid response format" },
        { status: 500 }
      );
    }

    await saveHifiDesigns(fid, designs);

    return Response.json(designs);
  } catch (err) {
    console.error("Hifi design generation error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
