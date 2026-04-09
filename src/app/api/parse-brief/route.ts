import { callClaude } from "@/lib/claude";

const PARSE_BRIEF_SYSTEM = `You are an expert at extracting structured product information from client briefs, pitch decks, PRDs, and similar documents.

Given a brief/document, extract as many of these fields as you can. Return ONLY valid JSON — no markdown, no backticks, no preamble.

JSON schema:
{
  "productName": "string or null",
  "company": "string or null",
  "productType": "one of: b2b, consumer, internal, marketplace, ecommerce, api, other — or null",
  "stage": "one of: idea, prelaunch, early, growth, mature — or null",
  "industries": ["array of matching industries from: Advertising & Marketing, Finance Banking & Insurance, E-commerce & Retail, Healthcare & Wellness, Education & Learning, Food & Delivery, Enterprise Software & Productivity, Media & Entertainment, Travel & Hospitality, Real Estate & Property, AI & Machine Learning, Logistics & Supply Chain, Other"],
  "audience": "one of: tier1, tier2, northIndia, allIndia, global, other — or null",
  "platform": "one of: desktop, mobile, responsive, ios, android, iosAndroid, desktopApp — or null",
  "explain": "plain language explanation of what the product does — or null",
  "briefWhy": "why this design brief exists — or null",
  "valueProp": "why people choose this over alternatives — or null",
  "notThis": "what the product is NOT — or null",
  "clientBrief": "the full original brief text, summarized if very long — or null",
  "seg1": { "name": "string", "age": "string", "gender": "string", "loc": "string", "income": "string", "behaviour": "string" },
  "seg2": { "name": "string", "age": "string", "gender": "string", "loc": "string", "income": "string", "behaviour": "string" },
  "behInsights": "behavioural insights about users — or null",
  "competitors": "competitor information — or null",
  "flows": "key user flows — or null",
  "ia": "information architecture — or null",
  "figmaLink": "any Figma link mentioned — or null",
  "upcoming": "upcoming features/roadmap — or null",
  "vibe": "visual direction or references — or null",
  "colors": "brand colors mentioned — or null",
  "fonts": "fonts mentioned — or null"
}

Rules:
- Only fill fields you can confidently extract. Use null for fields not found in the brief.
- For seg1/seg2, only include if real user segment data is present. Set entire object to null if not.
- For industries, match to the exact strings in the list above.
- Keep extracted text concise — summarize long passages.
- The clientBrief field should contain a summary of the entire uploaded document.`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return Response.json(
        { error: "Brief text is too short. Please paste more content." },
        { status: 400 }
      );
    }

    const response = await callClaude({
      system: PARSE_BRIEF_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Extract structured product context from this brief:\n\n${text.slice(0, 15000)}`,
        },
      ],
      maxTokens: 4000,
    });

    // Parse the JSON response
    let parsed;
    try {
      const trimmed = response.trim();
      const jsonStr = trimmed.startsWith("{")
        ? trimmed
        : trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
      parsed = JSON.parse(jsonStr);
    } catch {
      return Response.json(
        { error: "Failed to parse brief. Try pasting a clearer document." },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("Parse brief error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to parse brief" },
      { status: 500 }
    );
  }
}
