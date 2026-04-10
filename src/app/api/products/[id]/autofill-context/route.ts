import { NextRequest } from "next/server";
import { getProduct } from "@/lib/projects";
import { getKnowledgeForContext } from "@/lib/knowledge";
import { callClaude } from "@/lib/claude";

const AUTOFILL_SYSTEM = `You are a senior product strategist helping fill out a product context questionnaire.
Given a product name, company, and any available knowledge base entries, generate realistic and specific product context data.

IMPORTANT RULES:
1. Research the actual brand/company if possible. Use real, accurate information.
2. If the brand is unknown, invent plausible, detailed context that feels authentic.
3. Every field must be specific and opinionated — no generic filler.
4. User segments should have real behavioural insights, not generic demographics.
5. Competitors should be real companies in the space.
6. Flows should be concrete user journeys (verb-first, 3-5 flows).
7. Visual direction should reference 2-3 real products whose style applies.
8. Be varied — if called multiple times for the same product, produce different angles.

Return ONLY valid JSON — no markdown fences, no explanation. Match this exact schema:
{
  "productType": "b2b" | "consumer" | "internal" | "marketplace" | "ecommerce" | "api" | "other",
  "stage": "idea" | "prelaunch" | "early" | "growth" | "mature",
  "industries": ["Industry 1", "Industry 2"],
  "audience": "tier1" | "tier2" | "allIndia" | "global" | "other",
  "platform": "desktop" | "mobile" | "responsive" | "ios" | "android" | "iosAndroid",
  "explain": "Plain language explanation a 10-year-old would understand",
  "briefWhy": "Why this design brief exists — the core business need",
  "valueProp": "Why people choose this over alternatives",
  "notThis": "2-3 things people confuse this with but it is NOT",
  "clientBrief": "Paste-style client brief with data points",
  "seg1": { "name": "...", "age": "...", "gender": "...", "loc": "...", "income": "...", "behaviour": "..." },
  "seg2": { "name": "...", "age": "...", "gender": "...", "loc": "...", "income": "...", "behaviour": "..." },
  "behInsights": "Quantitative and qualitative user behaviour insights",
  "competitors": "Direct and indirect competitors with UX notes",
  "flows": "3-5 key user flows, each starting with a verb",
  "ia": "Information architecture / sitemap overview",
  "upcoming": "Features coming in next 1-3 months",
  "dsChoice": "describe",
  "vibe": "Visual direction referencing 2-3 real products",
  "colors": "Specific hex colors with roles",
  "fonts": "Specific font choices with roles"
}

Industries must be from: "Advertising & Marketing", "Finance, Banking & Insurance", "E-commerce & Retail", "Healthcare & Wellness", "Education & Learning", "Food & Delivery", "Enterprise Software & Productivity", "Media & Entertainment", "Travel & Hospitality", "Real Estate & Property", "AI & Machine Learning", "Logistics & Supply Chain", "Other"`;

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
      maxTokens: 2500,
      model: "claude-haiku-4-5",
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
