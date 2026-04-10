import { NextRequest } from "next/server";
import { getProduct } from "@/lib/projects";
import { getKnowledgeForContext } from "@/lib/knowledge";
import { callClaude } from "@/lib/claude";

const AUTOFILL_SYSTEM = `Generate realistic product context as JSON. Be specific and opinionated. Keep each string value under 200 chars. No markdown fences. No newlines inside string values.

ENUM VALUES (use exactly):
productType: b2b | consumer | internal | marketplace | ecommerce | api | other
stage: idea | prelaunch | early | growth | mature
audience: tier1 | tier2 | allIndia | global | other
platform: desktop | mobile | responsive | ios | android | iosAndroid
industries: pick from ["Advertising & Marketing","Finance, Banking & Insurance","E-commerce & Retail","Healthcare & Wellness","Education & Learning","Food & Delivery","Enterprise Software & Productivity","Media & Entertainment","Travel & Hospitality","Real Estate & Property","AI & Machine Learning","Logistics & Supply Chain","Other"]

Return ONLY this JSON:
{"productType":"...","stage":"...","industries":["..."],"audience":"...","platform":"...","explain":"...","briefWhy":"...","valueProp":"...","notThis":"...","clientBrief":"...","seg1":{"name":"...","age":"...","gender":"...","loc":"...","income":"...","behaviour":"..."},"seg2":{"name":"...","age":"...","gender":"...","loc":"...","income":"...","behaviour":"..."},"behInsights":"...","competitors":"...","flows":"...","ia":"...","upcoming":"...","dsChoice":"describe","vibe":"...","colors":"...","fonts":"..."}`;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await ctx.params;

  try {
    const product = await getProduct(productId);

    // Gather knowledge base context if available
    let knowledge = "";
    try {
      knowledge = await getKnowledgeForContext(productId, { limit: 10 });
    } catch {
      // Knowledge base may not have entries yet
    }

    const contextParts = [
      `Product name: ${product.name}`,
      product.company ? `Company: ${product.company}` : null,
    ].filter(Boolean);

    if (knowledge) {
      contextParts.push(`\n## Existing Knowledge Base\n${knowledge}`);
    }

    const userMessage = `Generate a complete, realistic product context for this product:\n\n${contextParts.join("\n")}\n\nBe specific, opinionated, and use real data where possible. Every field should feel hand-written by a product manager who knows this space deeply.`;

    const response = await callClaude({
      system: AUTOFILL_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 4096,
    });

    const cleaned = response
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return Response.json(parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate context";
    return Response.json({ error: message }, { status: 500 });
  }
}
