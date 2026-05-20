// One Vercel function invocation per Act. Each fits comfortably under the
// Hobby 300s ceiling. The client (DiscoveryClient) calls n=1..4 in order,
// merging each Act's partial JSON into an accumulating deck. After n=4
// succeeds, the client POSTs the merged deck to /discover/save.

import { getProduct } from "@/lib/projects";
import { streamClaude } from "@/lib/claude";
import { fixJsonV4 } from "@/lib/discovery-types";
import { ACT_CONFIGS, buildPrevActSummary } from "@/lib/discovery-acts";
import type { ActNumber } from "@/lib/discovery-acts";
import type { DiscoveryDeckV4 } from "@/lib/discovery-types";

// Hobby plan ceiling. Pro/Team can raise this, but Acts are tuned to fit
// in well under 300s each.
export const maxDuration = 300;

function isActNumber(n: number): n is ActNumber {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; n: string }> },
) {
  const { id, n: nStr } = await params;
  const n = Number(nStr);
  if (!isActNumber(n)) {
    return Response.json({ error: `Invalid Act number: ${nStr}` }, { status: 400 });
  }
  const act = ACT_CONFIGS[n];

  let product;
  try {
    product = await getProduct(id);
  } catch {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  if (!product.enriched_pcd) {
    return Response.json(
      { error: "No enriched PCD found. Complete Product Context first." },
      { status: 400 },
    );
  }

  // Pull the discovery-scope inputs from product_context and surface them
  // explicitly to the model so the in-scope thread, KPI strip, and inline
  // benchmark chips render even if enrichment paraphrased them.
  const ctx = (product.product_context ?? {}) as {
    inScopeSurface?: string;
    clientKpis?: { direction: string; label: string }[];
    clientBenchmarks?: { name: string; country: string }[];
  };

  let prev: Partial<DiscoveryDeckV4> = {};
  let brief = product.enriched_pcd;
  try {
    const body = await request.json();
    if (body?.prev && typeof body.prev === "object") {
      prev = body.prev as Partial<DiscoveryDeckV4>;
    }
    if (typeof body?.brief === "string") {
      brief = body.brief;
    }
  } catch {
    // No body — use defaults (no prev acts, enriched_pcd as brief).
  }

  const scopeLines: string[] = [];
  if (ctx.inScopeSurface) scopeLines.push(`In-scope surface: ${ctx.inScopeSurface}`);
  if (ctx.clientKpis?.length) {
    scopeLines.push(
      "Client KPIs: " +
        ctx.clientKpis
          .map((k) => `${k.direction === "down" ? "↓" : k.direction === "neutral" ? "→" : "↑"} ${k.label}`)
          .join(" · "),
    );
  }
  if (ctx.clientBenchmarks?.length) {
    scopeLines.push(
      "Client benchmarks: " +
        ctx.clientBenchmarks
          .map((b) => (b.country ? `${b.name} (${b.country})` : b.name))
          .join(", "),
    );
  }
  const cachedContext = scopeLines.length
    ? `${brief}\n\n---\nDiscovery v4 inputs:\n${scopeLines.join("\n")}`
    : brief;

  const prevSummary = buildPrevActSummary(prev);
  const userMessage =
    n === 1
      ? `Brief is in context. Generate Act I of the v4 Insights Deck as a JSON object with only the Act I top-level keys. JSON only.`
      : `Brief is in context. Earlier Acts' wiring IDs and headlines follow — reference them where it lands.\n\n${prevSummary}\n\nGenerate Act ${
          n === 2 ? "II" : n === 3 ? "III" : "IV"
        } of the v4 Insights Deck as a JSON object with only this Act's top-level keys. JSON only.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Emit the Act metadata up front so the client can switch its
        // loading copy before any text has streamed.
        send({ act: n, label: act.label, started: true });

        const messageStream = await streamClaude({
          system: act.systemPrompt,
          userMessage,
          useSearch: true,
          searchMaxUses: act.searchMaxUses,
          maxTokens: act.maxTokens,
          cachedContext,
        });

        let fullText = "";
        let charCount = 0;
        let lastSnippetCount = 0;

        messageStream.on("text", (text: string) => {
          fullText += text;
          charCount += text.length;
          // Every ~500 chars, sample readable headlines as snippets so the
          // loader has something living to show. Statement / hook / persona
          // are short and on-message for any of the 4 Acts.
          if (charCount % 500 < text.length) {
            const matches = [
              ...fullText.matchAll(/"statement"\s*:\s*"([^"]{10,140})"/g),
              ...fullText.matchAll(/"hook"\s*:\s*"([^"]{10,140})"/g),
              ...fullText.matchAll(/"persona"\s*:\s*"([^"]{6,120})"/g),
              ...fullText.matchAll(/"name"\s*:\s*"([^"]{6,120})"/g),
            ];
            const snippets = matches.map((m) => m[1]).slice(0, 8);
            if (snippets.length > lastSnippetCount) {
              lastSnippetCount = snippets.length;
              send({ act: n, progress: charCount, snippets });
            } else {
              send({ act: n, progress: charCount });
            }
          }
        });

        messageStream.on("error", (err: Error) => {
          send({ error: err.message, act: n });
          controller.close();
        });

        await messageStream.finalMessage();

        const actPartial = fixJsonV4(fullText) as Partial<DiscoveryDeckV4>;

        send({ act: n, partial: actPartial, done: true });
        controller.close();
      } catch (err) {
        send({
          error: err instanceof Error ? err.message : `Act ${n} failed`,
          act: n,
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
