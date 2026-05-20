"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhaseHeader } from "@/components/phase-header";
import { DeckNavigator } from "@/components/discovery/deck/deck-navigator";
import { DeckV4 } from "@/components/discovery/deck/deck-v4";
import { DiscoveryLoading } from "@/components/discovery/discovery-loading";
import type { AnyDiscoveryDeck, DiscoveryDeckV4 } from "@/lib/discovery-types";
import { isDeckV4 } from "@/lib/discovery-types";
import { ACT_CONFIGS } from "@/lib/discovery-acts";
import type { ActNumber } from "@/lib/discovery-acts";
import type { Product } from "@/lib/types";

const TOTAL_ACTS: ActNumber[] = [1, 2, 3, 4];

export function DiscoveryClient({ project: initial }: { project: Product }) {
  const router = useRouter();
  const [product, setProduct] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [snippets, setSnippets] = useState<string[]>([]);
  const [currentAct, setCurrentAct] = useState<ActNumber | null>(null);

  // Resolve existing deck — handle both string and object format, and both
  // v3 and v4 shapes (v4 is detected via the explicit "version" field on the
  // parsed JSON).
  const existingInsights = product.discovery_insights;
  let existingDeck: AnyDiscoveryDeck | null = null;
  if (existingInsights) {
    if (typeof existingInsights === "object") {
      existingDeck = existingInsights as unknown as AnyDiscoveryDeck;
    } else if (typeof existingInsights === "string") {
      try {
        existingDeck = JSON.parse(existingInsights);
      } catch {
        // not valid JSON, leave as null
      }
    }
  }

  const [deck, setDeck] = useState<AnyDiscoveryDeck | null>(existingDeck);
  const autoStarted = useRef(false);

  async function runAct(
    actNumber: ActNumber,
    prev: Partial<DiscoveryDeckV4>,
    brief: string,
  ): Promise<Partial<DiscoveryDeckV4>> {
    setCurrentAct(actNumber);
    setProgress(0);
    setSnippets([]);

    const res = await fetch(
      `/api/products/${product.id}/discover/act/${actNumber}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prev, brief }),
      },
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: `API error ${res.status}` }));
      throw new Error(errData.error || `API error ${res.status}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let actPartial: Partial<DiscoveryDeckV4> | null = null;

    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.progress) setProgress(data.progress);
          if (data.snippets) setSnippets(data.snippets);
          if (data.error) throw new Error(data.error);
          if (data.partial && data.done) {
            actPartial = data.partial as Partial<DiscoveryDeckV4>;
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
            throw parseErr;
          }
        }
      }
    }

    if (!actPartial) {
      throw new Error(`Act ${actNumber} ended without returning a partial.`);
    }
    return actPartial;
  }

  async function handleGenerate(brief: string) {
    setLoading(true);
    setError(null);

    try {
      let accumulator: Partial<DiscoveryDeckV4> = {};
      for (const actNumber of TOTAL_ACTS) {
        const actPartial = await runAct(actNumber, accumulator, brief);
        accumulator = { ...accumulator, ...actPartial };
      }

      // Final save — server stamps version, saves to DB, fans out knowledge
      // extraction.
      const saveRes = await fetch(`/api/products/${product.id}/discover/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck: accumulator }),
      });
      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({ error: `Save failed ${saveRes.status}` }));
        throw new Error(errData.error || `Save failed ${saveRes.status}`);
      }
      const saved = await saveRes.json();
      const fullDeck = (saved.deck ?? accumulator) as DiscoveryDeckV4;

      setDeck(fullDeck);
      setProduct((prev) => ({
        ...prev,
        discovery_insights: JSON.stringify(fullDeck),
        phase_discovery: "complete" as const,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setCurrentAct(null);
    }
  }

  // Auto-trigger discovery when enriched PCD exists but no deck
  useEffect(() => {
    if (product.enriched_pcd && !existingDeck && !loading && !error && !autoStarted.current) {
      autoStarted.current = true;
      handleGenerate(product.enriched_pcd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.enriched_pcd, existingDeck]);


  // STATE 1: No enriched PCD
  if (!product.enriched_pcd) {
    return (
      <>
        <PhaseHeader title="Discovery" subtitle="Research & insights" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-[400px]">
            <div className="w-12 h-12 rounded-[8px] bg-surface-page-alt flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-content-muted" strokeWidth={1.5} />
            </div>
            <h2 className="text-h3 font-bold text-content-heading mb-2">
              Complete Product Context First
            </h2>
            <p className="text-sm text-content-tertiary mb-5">
              The discovery phase requires an enriched Product Context Document.
              Go back and complete the context phase.
            </p>
            <Button
              onClick={() => router.push(`/products/${product.id}/context`)}
            >
              Go to Product Context
            </Button>
          </div>
        </div>
      </>
    );
  }

  // STATE 2: Loading
  if (loading) {
    const actConfig = currentAct ? ACT_CONFIGS[currentAct] : null;
    return (
      <>
        <PhaseHeader
          title="Discovery"
          subtitle={
            currentAct
              ? `Act ${currentAct} of 4 · ${actConfig?.shortLabel ?? ""}`
              : "Running analysis..."
          }
        />
        <DiscoveryLoading
          key={currentAct ?? "init"}
          progress={progress}
          snippets={snippets}
          actLabel={actConfig?.label}
          actNumber={currentAct ?? undefined}
          actTotal={TOTAL_ACTS.length}
          actMaxChars={actConfig ? actConfig.maxTokens * 4 : undefined}
        />
      </>
    );
  }

  // STATE 3: Error (show retry)
  if (error && !deck) {
    return (
      <>
        <PhaseHeader title="Discovery" subtitle="Research & insights" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-[400px]">
            <p className="text-sm text-feedback-error-text mb-4">Error: {error}</p>
            <Button onClick={() => { setError(null); autoStarted.current = false; }}>
              Try again
            </Button>
          </div>
        </div>
      </>
    );
  }

  // STATE 4: Deck complete
  if (deck) {
    return (
      <>
        <PhaseHeader
          title="Discovery"
          subtitle="Insights deck complete"
          actions={
            <div className="flex gap-2">
              {/* Download button is hidden in the v4 cut. Will return once
                  the v4 export + Decisions Worksheet are wired up. */}
              <Button variant="outline" size="sm" onClick={() => router.push(`/products/${product.id}/knowledge`)} className="text-xs h-8 rounded-md">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                Knowledge Base
              </Button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-[1120px] mx-auto">
            {isDeckV4(deck) ? <DeckV4 deck={deck} /> : <DeckNavigator data={deck} />}
          </div>
        </div>
      </>
    );
  }

  // STATE 5: Auto-triggering (brief flash while useEffect kicks in)
  return (
    <>
      <PhaseHeader title="Discovery" subtitle="Starting analysis..." />
      <DiscoveryLoading progress={0} snippets={[]} />
    </>
  );
}
