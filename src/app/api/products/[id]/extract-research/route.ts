import { callClaude } from "@/lib/claude";

const RESEARCH_EXTRACT_SYSTEM = `You are analysing a research / insights document for a product designer. Extract the most useful structured findings as JSON. Return ONLY valid JSON — no markdown, no backticks, no commentary.

Schema:
{
  "key_insights": [string],   // 3-7 most important findings about users, behaviour, or context
  "pain_points":  [string],   // 2-6 specific frustrations, blockers, or unmet needs
  "opportunities":[string],   // 2-5 concrete design or product opportunities the document surfaces
  "quotes":       [string]    // 0-5 verbatim user quotes, only if the document contains them
}

RULES:
1. Each item must be 1-2 short sentences max — no paragraphs.
2. Use the document's own framing and vocabulary where possible. Do not invent facts.
3. If a category has no clear evidence in the document, return an empty array for it (still include the key).
4. Quotes must be verbatim if included; do not paraphrase.
5. Output VALID JSON only — no prose around it.`;

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
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
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

interface ResearchSummary {
  key_insights: string[];
  pain_points: string[];
  opportunities: string[];
  quotes: string[];
}

function coerceList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  let text: string;
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text || text.trim().length < 50) {
    return Response.json(
      { error: "Document text is too short — paste at least a paragraph or two." },
      { status: 400 },
    );
  }

  const truncated = text.slice(0, 30000);
  let raw: string;
  try {
    raw = await callClaude({
      system: RESEARCH_EXTRACT_SYSTEM,
      messages: [{ role: "user", content: truncated }],
      maxTokens: 2000,
    });
  } catch (err) {
    console.error("extract-research call failed:", err);
    return Response.json({ error: "AI call failed" }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch {
    return Response.json({ error: "AI returned non-JSON response" }, { status: 502 });
  }

  const obj = parsed as Partial<ResearchSummary>;
  const summary: ResearchSummary = {
    key_insights: coerceList(obj.key_insights),
    pain_points: coerceList(obj.pain_points),
    opportunities: coerceList(obj.opportunities),
    quotes: coerceList(obj.quotes),
  };

  return Response.json(summary);
}
