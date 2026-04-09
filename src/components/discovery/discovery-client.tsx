"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Download, Plus, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFeature } from "@/lib/projects";
import { PhaseHeader } from "@/components/phase-header";
import { DeckNavigator } from "@/components/discovery/deck/deck-navigator";
import { DiscoveryLoading } from "@/components/discovery/discovery-loading";
import { downloadDeckHtml } from "@/lib/discovery-export";
import type { DiscoveryDeck } from "@/lib/discovery-types";
import type { Product } from "@/lib/types";

export function DiscoveryClient({ project: initial }: { project: Product }) {
  const router = useRouter();
  const [product, setProduct] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [snippets, setSnippets] = useState<string[]>([]);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [creatingFeature, setCreatingFeature] = useState(false);

  const handleCreateFeature = useCallback(async () => {
    if (!newFeatureName.trim()) return;
    setCreatingFeature(true);
    try {
      const feature = await createFeature(product.id, newFeatureName.trim(), "screen");
      router.push(`/products/${product.id}/features/${feature.id}`);
    } catch (err) {
      console.error("Failed to create feature:", err);
      setCreatingFeature(false);
    }
  }, [product.id, newFeatureName, router]);

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
  const autoStarted = useRef(false);

  async function handleGenerate(brief: string) {
    setLoading(true);
    setError(null);
    setProgress(0);
    setSnippets([]);
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
            if (data.snippets) setSnippets(data.snippets);
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
    return (
      <>
        <PhaseHeader title="Discovery" subtitle="Running analysis..." />
        <DiscoveryLoading progress={progress} snippets={snippets} />
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
              <Button variant="outline" size="sm" onClick={() => downloadDeckHtml(deck)} className="text-xs h-8 rounded-md">
                <Download className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push(`/products/${product.id}/knowledge`)} className="text-xs h-8 rounded-md">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                Knowledge Base
              </Button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="max-w-[900px] mx-auto bg-white border border-divider rounded-[8px] p-5">
            <DeckNavigator data={deck} />
          </div>
          <div className="mt-6 pt-4 border-t border-divider max-w-[900px] mx-auto space-y-4">
            <div>
              <p className="text-sm font-medium text-content-heading mb-2">Create your first feature</p>
              <div className="flex gap-2">
                <Input
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                  placeholder="e.g., Product Detail Page"
                  onKeyDown={(e) => e.key === "Enter" && !creatingFeature && handleCreateFeature()}
                />
                <Button
                  onClick={handleCreateFeature}
                  disabled={!newFeatureName.trim() || creatingFeature}
                  className="shrink-0"
                >
                  {creatingFeature ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                      New Feature
                    </>
                  )}
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push(`/products/${product.id}/knowledge`)} className="text-body-sm rounded-md">
              <BookOpen className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Knowledge Base
            </Button>
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
