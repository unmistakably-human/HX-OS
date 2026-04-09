import { getProject, saveDiscovery } from "@/lib/projects";
import { streamClaude } from "@/lib/claude";

const DISCOVERY_SYSTEM = `You are a senior product strategist at HumanX Design Agency. Run structured discovery producing an Insights Deck.

Produce 5 analyses, each with exactly 5 sharp insights. Use web search extensively (run 15+ searches across all sections).

## 1. Category Insights
For each insight: **Statement** (1-2 sentences) → **Evidence** (specific products, data points, market shifts) → **Implication** (what this means for the product being designed).
Cover: category evolution (5yr timeline), structural shifts (tech/economic/demographic), contradictions (what customers want vs need), competitive clustering (who dominates which segment).
At least 2 insights should challenge conventional wisdom in this space.

## 2. Audience Insights
For each insight: **Who** (specific segment) → **Current State** (how they solve this today) → **What's Changing** (behavior shifts, new entrants) → **The Gap** (latent needs, unmet moments).
Cover 3+ distinct segments. At least 1 insight should reveal a say/do contradiction.

## 3. Competitive Benchmarking
Organize by ATTRIBUTE (onboarding, navigation, product discovery, product page, checkout, retention) — NOT by competitor.
For each attribute: **Dominant pattern** (what 3+ competitors do), **Contrarian approach** (what 2+ do differently and why), **Global standout** (best-in-class from any market worldwide), **Underexplored space** (what nobody is doing).
80% within-category competitors, 20% cross-category inspiration (best UX patterns from unrelated industries that solve analogous problems).

## 4. Opportunity Areas
5 opportunities ranked by potential (most disruptive first). Each: **Opportunity statement** → **Why now** (what changed to make this viable) → **Who benefits** (which audience segments) → **Competitive advantage** (why hard to copy) → **Key risk** (biggest reason this could fail).
Each opportunity must trace back to 2+ insights from the prior analyses.

## 5. Reference Glossary
8-12 must-study platforms from multiple markets worldwide. Each: **Platform name**, **Market** (country/region), **Why it matters** (1-2 sentences specific to this product), **Key flows to study** (2-3 specific screens/journeys to screenshot and review).

QUALITY RULES:
- Every insight must name specific products, cite specific data, or describe specific behaviors — no vague "users want better X"
- Every insight must reveal a tension or contradiction — not just state an obvious fact
- Every insight must be actionable — the design team can immediately ask "how might we..." based on it
- Apply a GLOBAL lens — include platforms from US, UK, Europe, Southeast Asia, not just the target market`;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    return new Response(
      JSON.stringify({ error: "Project not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!project.enrichedPcd) {
    return new Response(
      JSON.stringify({
        error: "No enriched PCD found. Complete Product Context first.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const messageStream = await streamClaude({
          system: DISCOVERY_SYSTEM,
          userMessage: `Here is the enriched Product Context Document:\n\n${project.enrichedPcd}\n\nRun full discovery and produce the Insights Deck.`,
          useSearch: true,
          maxTokens: 16000,
        });

        let fullText = "";

        messageStream.on("text", (text: string) => {
          fullText += text;
          send({ text });
        });

        messageStream.on("error", (err: Error) => {
          send({ error: err.message });
          controller.close();
        });

        await messageStream.finalMessage();

        // Save the discovery insights
        await saveDiscovery(id, fullText);

        send({ done: true });
        controller.close();
      } catch (err) {
        send({
          error: err instanceof Error ? err.message : "Discovery failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
