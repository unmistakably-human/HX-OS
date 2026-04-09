import { getFeature, updateFeature } from "@/lib/projects";
import { callClaude } from "@/lib/claude";

const HMW_SYSTEM = `You are a design strategist generating How Might We questions from research insights.

Given a set of selected insights, generate 2 HMW questions per insight. Return ONLY valid JSON — no markdown, no backticks.

JSON structure:
{
  "hmw_statements": [
    {
      "id": "hmw1",
      "question": "HMW [specific, actionable question]?",
      "fromInsightId": "u1"
    }
  ]
}

RULES:
1. Each HMW must start with "HMW" (How Might We)
2. Each must be specific enough to generate a concept from
3. Each must be non-obvious — not the first thing a designer would think of
4. Each must be framed as a design challenge, not a feature request
5. Avoid vague HMWs like "HMW make this better" — be precise about the tension being addressed
6. Generate exactly 2 HMWs per insight provided`;

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
  req: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  const { fid } = await params;

  try {
    const { selectedInsightIds } = await req.json();
    const feature = await getFeature(fid);

    if (!feature.insights || !Array.isArray(selectedInsightIds) || selectedInsightIds.length === 0) {
      return Response.json({ error: "No insights selected" }, { status: 400 });
    }

    const selectedInsights = feature.insights.filter((i) =>
      selectedInsightIds.includes(i.id)
    );

    const userMessage = `Generate HMW questions for these ${selectedInsights.length} selected insights:

${selectedInsights.map((i) => `[${i.id}] ${i.tag}: ${i.headline}\n${i.body}`).join("\n\n")}

Generate exactly 2 HMW questions per insight (${selectedInsights.length * 2} total).`;

    const responseText = await callClaude({
      system: HMW_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 4000,
    });

    const jsonStr = extractJSON(responseText);
    const parsed = JSON.parse(jsonStr);
    const hmwStatements = parsed.hmw_statements || parsed;

    // Save selected insights and HMW statements
    await updateFeature(fid, {
      selected_insights: selectedInsightIds,
      hmw_statements: hmwStatements,
      phase_discovery: "complete",
      phase_hmw: "active",
    });

    return Response.json({ hmw_statements: hmwStatements });
  } catch (err) {
    console.error("HMW generation error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
