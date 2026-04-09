"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Lightbulb } from "lucide-react";
import type { Feature, Product, DesignConcept, Baseline, BeyondScreen } from "@/lib/types";

export default function DesignConceptsPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const router = useRouter();
  const productId = params.productId;
  const featureId = params.featureId;

  const [product, setProduct] = useState<Product | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [designConcepts, setDesignConcepts] = useState<DesignConcept[]>([]);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [beyondScreen, setBeyondScreen] = useState<BeyondScreen[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [needsGeneration, setNeedsGeneration] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, fRes] = await Promise.all([
          fetch(`/api/products/${productId}`),
          fetch(`/api/products/${productId}/features/${featureId}`),
        ]);
        if (pRes.ok) setProduct(await pRes.json());
        if (fRes.ok) {
          const feat: Feature = await fRes.json();
          setFeature(feat);
          // Restore state from saved data
          if (feat.design_concepts?.length) {
            setDesignConcepts(feat.design_concepts);
            setBaseline(feat.baseline || null);
            setBeyondScreen(feat.beyond_screen || []);
            setSelectedConcepts(feat.selected_concepts || []);
          } else {
            setNeedsGeneration(true);
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [productId, featureId]);

  // ── Generate Concepts ──
  const generateConcepts = useCallback(async () => {
    if (!feature?.selected_hmws?.length) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/features/${featureId}/design-concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedHmwIds: feature.selected_hmws }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error ${res.status}`);
      }
      const data = await res.json();
      setDesignConcepts(data.concepts);
      setBaseline(data.baseline);
      setBeyondScreen(data.beyondScreen || []);
      setNeedsGeneration(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate concepts");
    }
    setGenerating(false);
  }, [productId, featureId, feature?.selected_hmws]);

  // ── Save selected concepts and proceed ──
  const handleContinueToVisual = useCallback(async () => {
    try {
      await fetch(`/api/products/${productId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_concepts: selectedConcepts,
          phase_design_concepts: "complete",
          phase_visual: "active",
          phase_concepts: "active",
        }),
      });
      router.push(`/products/${productId}/features/${featureId}/concepts`);
    } catch {
      // ignore
    }
  }, [productId, featureId, selectedConcepts, router]);

  const toggleConcept = (name: string) => {
    setSelectedConcepts((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name);
      if (prev.length >= 3) return prev;
      return [...prev, name];
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#9ca3af]"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...</div>;
  }

  if (!product || !feature) {
    return <div className="flex items-center justify-center h-full text-[#9ca3af]">Feature not found</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PhaseHeader title="Design Concepts" subtitle={feature.name} />

      {/* Generate concepts prompt */}
      {needsGeneration && !generating && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-[#fef3c7] flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-6 h-6 text-[#E8713A]" />
            </div>
            <h2 className="text-[18px] font-bold text-[#111827] mb-2">Generate Design Concepts</h2>
            <p className="text-[14px] text-[#6b7280] mb-6">
              AI will generate design concepts based on your selected HMW statements for &ldquo;{feature.name}&rdquo;.
            </p>
            <Button onClick={generateConcepts} className="bg-[#E8713A] hover:bg-[#d4652f] text-white gap-1.5">
              <Lightbulb className="w-4 h-4" /> Generate Concepts
            </Button>
            {error && <p className="text-[13px] text-red-500 mt-3">{error}</p>}
          </div>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-6 h-6 text-[#E8713A] animate-spin" />
          <p className="text-[14px] text-[#4b5563]">Generating design concepts...</p>
          <p className="text-[12px] text-[#9ca3af]">This takes 15-30 seconds</p>
          {error && (
            <div className="text-[13px] text-red-500 mt-2">
              Error: {error}
              <Button variant="outline" size="sm" className="ml-3" onClick={() => setGenerating(false)}>Dismiss</Button>
            </div>
          )}
        </div>
      )}

      {/* Concepts display */}
      {designConcepts.length > 0 && !generating && (
        <>
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[20px] font-bold text-[#111827]">Design Concepts</h2>
            <p className="text-[13px] text-[#6b7280] mt-1">
              {designConcepts.length} concepts generated. Select up to 3 for visual variations.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-24">
            {/* Concept cards */}
            {designConcepts.map((concept) => {
              const selected = selectedConcepts.includes(concept.name);
              return (
                <button key={concept.name} onClick={() => toggleConcept(concept.name)}
                  className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${selected ? "border-[#E8713A] bg-[rgba(232,113,58,0.04)] shadow-sm" : "border-[#e5e7eb] hover:border-[#d1d5db]"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-[16px] font-bold text-[#111827]">{concept.name}</h3>
                      <p className="text-[13px] text-[#E8713A] italic">{concept.tagline}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0 ${selected ? "bg-[#E8713A] text-white" : "border-2 border-[#e5e7eb]"}`}>
                      {selected && "\u2713"}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#4b5563] leading-relaxed mb-3">{concept.idea}</p>
                  <div className="text-[12px] text-[#6b7280] mb-2">
                    <span className="font-semibold text-[#374151]">Solves for:</span> {concept.solvesFor}
                  </div>
                  {concept.onThePage?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {concept.onThePage.map((item, i) => (
                        <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-[#f4f4f5] text-[#4b5563]">{item}</span>
                      ))}
                    </div>
                  )}
                  {concept.tradeoffs?.length > 0 && (
                    <div className="border-t border-[#e5e7eb] pt-2 mt-2">
                      <p className="text-[11px] font-semibold text-[#991b1b] uppercase tracking-wide mb-1">Tradeoffs</p>
                      {concept.tradeoffs.map((t, i) => (
                        <p key={i} className="text-[12px] text-[#991b1b]/70">{t}</p>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Baseline */}
            {baseline && (
              <div className="p-6 rounded-2xl border border-[#e5e7eb] bg-[#fafafa]">
                <h3 className="text-[14px] font-bold text-[#111827] uppercase tracking-wide mb-3">The Baseline</h3>
                <p className="text-[12px] font-semibold text-[#374151] mb-2">Must-have elements</p>
                <ul className="space-y-1 mb-4">
                  {baseline.mustHaves.map((m, i) => (
                    <li key={i} className="text-[13px] text-[#4b5563] flex items-start gap-2">
                      <span className="text-[#9ca3af] mt-0.5">&bull;</span>{m}
                    </li>
                  ))}
                </ul>
                {baseline.commonlyMissed?.length > 0 && (
                  <>
                    <p className="text-[12px] font-semibold text-[#991b1b] mb-2">Commonly missed</p>
                    <ul className="space-y-1">
                      {baseline.commonlyMissed.map((m, i) => (
                        <li key={i} className="text-[13px] text-[#991b1b]/70 flex items-start gap-2">
                          <span className="mt-0.5">!</span>{m}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* Beyond the Screen */}
            {beyondScreen.length > 0 && (
              <div className="p-6 rounded-2xl border border-[#e5e7eb] bg-[#fafafa]">
                <h3 className="text-[14px] font-bold text-[#111827] uppercase tracking-wide mb-3">Beyond This Screen</h3>
                <div className="space-y-3">
                  {beyondScreen.map((b, i) => (
                    <div key={i}>
                      <p className="text-[13px] font-semibold text-[#111827]">{b.touchpoint}</p>
                      <p className="text-[12px] text-[#6b7280] mt-0.5">{b.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#e5e7eb] bg-white/90 backdrop-blur px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[20px] font-bold text-[#E8713A]">{selectedConcepts.length}</span>
              <span className="text-[13px] text-[#9ca3af]">/ 3 concepts</span>
            </div>
            <Button onClick={handleContinueToVisual} disabled={selectedConcepts.length === 0} className="bg-[#E8713A] hover:bg-[#d4652f] text-white">
              Continue to Visual Variations <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
