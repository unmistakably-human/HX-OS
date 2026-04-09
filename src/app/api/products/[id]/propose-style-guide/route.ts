import { NextRequest } from "next/server";
import { getProduct } from "@/lib/projects";
import { callClaude } from "@/lib/claude";

const PROPOSE_SYSTEM = `You are a senior brand designer. Generate a complete visual style guide for a product.
Return ONLY valid JSON — no markdown, no explanation:
{
  "brandColors": [{"name":"Primary","hex":"#XXXXXX"},{"name":"Secondary","hex":"#XXXXXX"}],
  "gradient": "linear-gradient(135deg, #XXXXXX 0%, #XXXXXX 100%)",
  "neutrals": [
    {"name":"White","hex":"#FFFFFF"},
    {"name":"Light","hex":"#F5F5F5"},
    {"name":"Mid","hex":"#9CA3AF"},
    {"name":"Dark","hex":"#374151"},
    {"name":"Black","hex":"#111827"}
  ],
  "typography": [
    {"level":"H1","font":"...","weight":"Bold","size":"48px"},
    {"level":"H2","font":"...","weight":"Semi Bold","size":"32px"},
    {"level":"H3","font":"...","weight":"Semi Bold","size":"24px"},
    {"level":"Body","font":"...","weight":"Regular","size":"16px"},
    {"level":"Caption","font":"...","weight":"Regular","size":"12px"}
  ]
}

Rules:
- Choose fonts from Google Fonts that match the product's personality.
- Brand colors should feel unique and appropriate to the industry — avoid generic blue/gray unless warranted.
- Neutrals should range from pure white to near-black with 5 distinct steps.
- The gradient should blend the two brand colors or a brand color with a complementary tone.
- Consider the industry, audience, stage, and vibe description when choosing.
- Each generation should feel distinct — randomize your choices. Be creative and opinionated.`;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await ctx.params;

  try {
    const product = await getProduct(productId);
    const pc = product.product_context;

    const contextParts = [
      pc?.productName && `Product: ${pc.productName}`,
      pc?.company && `Company: ${pc.company}`,
      pc?.productType && `Type: ${pc.productType}`,
      pc?.stage && `Stage: ${pc.stage}`,
      pc?.industries?.length && `Industries: ${pc.industries.join(", ")}`,
      pc?.audience && `Audience: ${pc.audience}`,
      pc?.vibe && `Visual direction: ${pc.vibe}`,
      pc?.explain && `What it does: ${pc.explain}`,
    ].filter(Boolean);

    const userMessage = contextParts.length
      ? `Generate a visual style guide for this product:\n\n${contextParts.join("\n")}`
      : "Generate a modern, versatile visual style guide for a new digital product.";

    const response = await callClaude({
      system: PROPOSE_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });

    const cleaned = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const tokens = JSON.parse(cleaned);
    return Response.json({ ...tokens, source: "ai-proposed" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate style guide";
    return Response.json({ error: message }, { status: 500 });
  }
}
