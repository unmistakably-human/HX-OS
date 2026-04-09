"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhaseHeader } from "@/components/phase-header";
import { DeckNavigator } from "@/components/discovery/deck/deck-navigator";
import { DiscoveryLoading } from "@/components/discovery/discovery-loading";
import { DiscoveryBriefInput } from "@/components/discovery/discovery-brief-input";
import { downloadDeckHtml } from "@/lib/discovery-export";
import type { DiscoveryDeck } from "@/lib/discovery-types";
import type { Product } from "@/lib/types";

export function DiscoveryClient({ project: initial }: { project: Product }) {
  const router = useRouter();
  const [product, setProduct] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Resolve existing deck — handle both string and object format
  const existingInsights = product.discovery_insights;
  let existingDeck: DiscoveryDeck | null = null;
  if (existingInsights) {
    if (typeof existingInsights === "object") {
      existingDeck = existingInsights as unknown as DiscoveryDeck;
    } else if (typeof existingInsights === "string") {
      try {
        existingDeck = JSON.parse(existingInsights);
      } catch {
        // not valid JSON, leave as null
      }
    }
  }

  const [deck, setDeck] = useState<DiscoveryDeck | null>(existingDeck);

  async function handleGenerate(brief: string) {
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      const res = await fetch(`/api/products/${product.id}/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `API error ${res.status}` }));
        throw new Error(errData.error || `API error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
            if (data.error) throw new Error(data.error);
            if (data.deck) {
              setDeck(data.deck);
              setProduct((prev) => ({
                ...prev,
                discovery_insights: JSON.stringify(data.deck),
                phase_discovery: "complete" as const,
              }));
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setLoading(false);
  }

  function handleRerun() {
    setDeck(null);
    setError(null);
  }

  // STATE 1: No enriched PCD
  if (!product.enriched_pcd) {
    return (
      <>
        <PhaseHeader title="Discovery" subtitle="Research & insights" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-[400px]">
            <div className="w-12 h-12 rounded-xl bg-[#f4f4f5] flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-[#a1a1aa]" />
            </div>
            <h2 className="text-[18px] font-bold text-[#111827] mb-2">
              Complete Product Context First
            </h2>
            <p className="text-[14px] text-[#71717a] mb-5">
              The discovery phase requires an enriched Product Context Document.
              Go back and complete the context phase.
            </p>
            <Button
              onClick={() => router.push(`/products/${product.id}/context`)}
              className="bg-[#18181b] text-white"
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
    return (
      <>
        <PhaseHeader title="Discovery" subtitle="Running analysis..." />
        <DiscoveryLoading progress={progress} />
      </>
    );
  }

  // STATE 3: Deck complete
  if (deck) {
    return (
      <>
        <PhaseHeader
          title="Discovery"
          subtitle="Insights deck complete"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadDeckHtml(deck)} className="text-[12px] h-8">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={handleRerun} className="text-[12px] h-8">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Re-run
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/`)}
                className="bg-[#E8713A] hover:bg-[#d4652f] text-white text-[12px] h-8"
              >
                Back to Dashboard
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="max-w-[900px] mx-auto bg-white border border-[#e5e7eb] rounded-xl p-5">
            <DeckNavigator data={deck} />
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#e5e7eb] max-w-[900px] mx-auto">
            <Button variant="outline" onClick={handleRerun} className="text-[13px]">
              <RotateCcw className="w-4 h-4 mr-2" />
              Re-run Discovery
            </Button>
            <Button
              onClick={() => router.push(`/`)}
              className="bg-[#E8713A] hover:bg-[#d4652f] text-white text-[14px] px-6"
            >
              Back to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </>
    );
  }

  // STATE 4: Ready — show brief input
  return (
    <>
      <PhaseHeader title="Discovery" subtitle="Research & insights" />
      <DiscoveryBriefInput
        enrichedPcd={product.enriched_pcd}
        onGenerate={handleGenerate}
        error={error}
      />
    </>
  );
}
