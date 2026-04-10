import { NextRequest } from "next/server";
import { getProduct, getFeature } from "@/lib/projects";
import { getKnowledgeForContext } from "@/lib/knowledge";
import { buildProductContext } from "@/lib/context-utils";
import { callClaude } from "@/lib/claude";

const AUTOFILL_SYSTEM = `You are a senior UX designer filling out a feature brief for a design project.
Given a product context and feature name/type, generate a realistic, specific feature brief.

IMPORTANT RULES:
1. The brief must be SPECIFIC to this product — reference the product's domain, users, and business model.
2. The problem statement should cite realistic metrics or user pain points.
3. Must-have elements should be concrete UI components, not vague concepts.
4. "Should NOT be" should name specific anti-patterns or competitor approaches to avoid.
5. Be opinionated and specific — no generic filler.
6. If a feature name is vague (e.g., "Homepage"), make assumptions and state them clearly.

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "problem": "Specific problem statement with metrics or user pain points",
  "mustHave": "Comma-separated list of concrete UI elements and features",
  "notBe": "2-3 specific things this should NOT be or look like",
  "context": "Additional context, constraints, or references"
}`;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; fid: string }> }
) {
  const { id: productId, fid: featureId } = await ctx.params;

  try {
    const [product, feature] = await Promise.all([
      getProduct(productId),
      getFeature(featureId),
    ]);

    const productContext = buildProductContext(product);

    // Gather relevant knowledge
    let knowledge = "";
    try {
      knowledge = await getKnowledgeForContext(productId, {
        query: `${feature.name} ${feature.feature_type || ""}`,
        limit: 10,
      });
    } catch {
      // Knowledge base may not have entries yet
    }

    const userMessage = [
      `## Product Context\n${productContext}`,
      knowledge ? `## Relevant Knowledge\n${knowledge}` : null,
      `## Feature to Brief`,
      `- Name: ${feature.name}`,
      `- Type: ${feature.feature_type || "screen"}`,
      `\nGenerate a specific, detailed feature brief for this feature within this product. The problem statement should feel like it came from a real product manager with access to analytics data.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await callClaude({
      system: AUTOFILL_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      cachedContext: productContext,
      maxTokens: 1500,
    });

    const cleaned = response
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return Response.json(parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate brief";
    return Response.json({ error: message }, { status: 500 });
  }
}
