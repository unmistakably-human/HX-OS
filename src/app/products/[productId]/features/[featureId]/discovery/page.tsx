"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ArrowRight, ArrowLeft, Search } from "lucide-react";
import type { Feature, Product, Insight, HMWStatement, DesignConcept, Baseline, BeyondScreen } from "@/lib/types";

const MAX_INSIGHTS = 5;
const MAX_HMW = 3;

const CATEGORY_CONFIG = [
  { key: "user" as const, label: "User Behaviour", icon: "U", color: "#10B981", dimColor: "rgba(16,185,129,0.08)" },
  { key: "domain" as const, label: "Domain / Category", icon: "D", color: "#F59E0B", dimColor: "rgba(245,158,11,0.08)" },
  { key: "competitor" as const, label: "Benchmarks", icon: "B", color: "#3B82F6", dimColor: "rgba(59,130,246,0.08)" },
];

export default function FeatureInsightsPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const router = useRouter();
  const productId = params.productId;
  const featureId = params.featureId;

  const [product, setProduct] = useState<Product | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);

  // Step: 0 = generate insights, 1 = select insights, 2 = select HMWs, 3 = view concepts
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [insights, setInsights] = useState<Insight[]>([]);
  const [catPage, setCatPage] = useState(0);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [hmwStatements, setHmwStatements] = useState<HMWStatement[]>([]);
  const [selectedHmws, setSelectedHmws] = useState<string[]>([]);
  const [designConcepts, setDesignConcepts] = useState<DesignConcept[]>([]);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [beyondScreen, setBeyondScreen] = useState<BeyondScreen[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);

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
          if (feat.insights?.length) {
            setInsights(feat.insights);
            if (feat.design_concepts?.length) {
              setSelectedInsights(feat.selected_insights || []);
              setHmwStatements(feat.hmw_statements || []);
              setSelectedHmws(feat.selected_hmws || []);
              setDesignConcepts(feat.design_concepts);
              setBaseline(feat.baseline || null);
              setBeyondScreen(feat.beyond_screen || []);
              setSelectedConcepts(feat.selected_concepts || []);
              setStep(3);
            } else if (feat.hmw_statements?.length) {
              setSelectedInsights(feat.selected_insights || []);
              setHmwStatements(feat.hmw_statements);
              setSelectedHmws(feat.selected_hmws || []);
              setStep(2);
            } else if (feat.selected_insights?.length) {
              setSelectedInsights(feat.selected_insights);
              setStep(1);
            } else {
              setStep(1);
            }
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [productId, featureId]);

  // ── Generate Insights ──
  const generateInsights = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/features/${featureId}/insights`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error ${res.status}`);
      }
      const data = await res.json();
      setInsights(data.insights);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights");
    }
    setGenerating(false);
  }, [productId, featureId]);

  // ── Generate HMWs ──
  const generateHmws = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/features/${featureId}/hmw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedInsightIds: selectedInsights }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error ${res.status}`);
      }
      const data = await res.json();
      setHmwStatements(data.hmw_statements);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate HMWs");
    }
    setGenerating(false);
  }, [productId, featureId, selectedInsights]);

  // ── Generate Concepts ──
  const generateConcepts = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/features/${featureId}/design-concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedHmwIds: selectedHmws }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error ${res.status}`);
      }
      const data = await res.json();
      setDesignConcepts(data.concepts);
      setBaseline(data.baseline);
      setBeyondScreen(data.beyondScreen || []);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate concepts");
    }
    setGenerating(false);
  }, [productId, featureId, selectedHmws]);

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

  const toggleInsight = (id: string) => {
    setSelectedInsights((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_INSIGHTS) return prev;
      return [...prev, id];
    });
  };

  const toggleHmw = (id: string) => {
    setSelectedHmws((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_HMW) return prev;
      return [...prev, id];
    });
  };

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

  if (!product.enriched_pcd) {
    return (
      <>
        <PhaseHeader title="Feature Insights" subtitle={feature.name} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <p className="text-[14px] text-[#6b7280] mb-4">Complete product context first.</p>
            <Button onClick={() => router.push(`/products/${productId}/context`)} variant="outline">Go to Product Context</Button>
          </div>
        </div>
      </>
    );
  }

  const stepLabels = [
    { n: 1, label: "Select Insights", sub: `Max ${MAX_INSIGHTS}` },
    { n: 2, label: "How Might We", sub: `Select ${MAX_HMW}` },
    { n: 3, label: "Concepts", sub: "Select up to 3" },
  ];

  const cat = CATEGORY_CONFIG[catPage];
  const catInsights = insights.filter((i) => i.category === cat.key);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PhaseHeader title="Feature Insights" subtitle={feature.name} />

      {/* Step 0: Generate insights */}
      {step === 0 && !generating && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-[#eff6ff] flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <h2 className="text-[18px] font-bold text-[#111827] mb-2">Generate Insights</h2>
            <p className="text-[14px] text-[#6b7280] mb-6">
              AI will research and generate insights across 3 categories for &ldquo;{feature.name}&rdquo;.
            </p>
            <Button onClick={generateInsights} className="bg-[#E8713A] hover:bg-[#d4652f] text-white gap-1.5">
              <Search className="w-4 h-4" /> Generate Insights
            </Button>
            {error && <p className="text-[13px] text-red-500 mt-3">{error}</p>}
          </div>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-6 h-6 text-[#E8713A] animate-spin" />
          <p className="text-[14px] text-[#4b5563]">
            {step === 0 ? "Generating insights..." : step === 1 ? "Generating HMW statements..." : "Generating concepts..."}
          </p>
          <p className="text-[12px] text-[#9ca3af]">This takes 15-30 seconds</p>
          {error && (
            <div className="text-[13px] text-red-500 mt-2">
              Error: {error}
              <Button variant="outline" size="sm" className="ml-3" onClick={() => setGenerating(false)}>Dismiss</Button>
            </div>
          )}
        </div>
      )}

      {/* Steps 1-3 */}
      {step >= 1 && !generating && (
        <>
          {/* Stepper */}
          <div className="flex gap-0 px-5 py-3 border-b border-[#e5e7eb] bg-white">
            {stepLabels.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              return (
                <div key={i} className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: active ? "#f4f4f5" : "transparent" }}>
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${done ? "bg-[#065f46] text-white" : active ? "bg-[#18181b] text-white" : "bg-[#f4f4f5] text-[#9ca3af]"}`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : s.n}
                  </div>
                  <div>
                    <div className={`text-[12px] font-semibold ${active ? "text-[#18181b]" : "text-[#9ca3af]"}`}>{s.label}</div>
                    <div className="text-[10px] text-[#9ca3af]">{s.sub}</div>
                  </div>
                  {i < 2 && <span className="ml-auto text-[#d1d5db]">&rsaquo;</span>}
                </div>
              );
            })}
          </div>

          {/* ── STEP 1: Insight Selection ── */}
          {step === 1 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Category tabs */}
              <div className="flex gap-2 px-5 py-3 border-b border-[#e5e7eb]">
                {CATEGORY_CONFIG.map((c, i) => {
                  const active = catPage === i;
                  const count = selectedInsights.filter((id) => insights.filter((ins) => ins.category === c.key).some((ins) => ins.id === id)).length;
                  return (
                    <button key={i} onClick={() => setCatPage(i)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${active ? "border-current" : "border-transparent bg-[#f4f4f5]"}`}
                      style={active ? { background: c.dimColor, borderColor: c.color + "40", color: c.color } : {}}
                    >
                      <span className="text-[12px] font-semibold" style={active ? { color: c.color } : { color: "#6b7280" }}>{c.label}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: c.color }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Insight cards */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-24">
                {catInsights.map((ins) => {
                  const selected = selectedInsights.includes(ins.id);
                  const disabled = !selected && selectedInsights.length >= MAX_INSIGHTS;
                  return (
                    <button key={ins.id} onClick={() => !disabled && toggleInsight(ins.id)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all relative ${selected ? "border-current shadow-sm" : disabled ? "border-[#e5e7eb] opacity-40 cursor-not-allowed" : "border-[#e5e7eb] hover:border-[#d1d5db]"}`}
                      style={selected ? { borderColor: cat.color, background: cat.dimColor } : {}}
                    >
                      <div className={`absolute top-4 right-4 w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-bold transition-all ${selected ? "text-white" : "border-2 border-[#e5e7eb]"}`}
                        style={selected ? { background: cat.color } : {}}>
                        {selected && "✓"}
                      </div>
                      <span className="inline-block text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md mb-3"
                        style={{ color: cat.color, background: cat.dimColor }}>
                        {ins.tag}
                      </span>
                      <div className="text-[15px] font-bold text-[#111827] leading-snug mb-2 pr-8">{ins.headline}</div>
                      <div className="text-[13px] text-[#6b7280] leading-relaxed">{ins.body}</div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom bar */}
              <div className="border-t border-[#e5e7eb] bg-white/90 backdrop-blur px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-[20px] font-bold text-[#18181b]">{selectedInsights.length}</span>
                  <span className="text-[13px] text-[#9ca3af] ml-1.5">/ {MAX_INSIGHTS} insights</span>
                </div>
                <Button onClick={generateHmws} disabled={selectedInsights.length === 0} className="bg-[#18181b] hover:bg-[#333] text-white">
                  Generate HMWs <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: HMW Selection ── */}
          {step === 2 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-[20px] font-bold text-[#111827]">How Might We...</h2>
                <p className="text-[13px] text-[#6b7280] mt-1">
                  {hmwStatements.length} questions generated. Select up to {MAX_HMW} to generate concepts.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-24">
                {hmwStatements.map((hmw) => {
                  const selected = selectedHmws.includes(hmw.id);
                  const disabled = !selected && selectedHmws.length >= MAX_HMW;
                  const parentInsight = insights.find((i) => i.id === hmw.fromInsightId);
                  const parentCat = parentInsight ? CATEGORY_CONFIG.find((c) => c.key === parentInsight.category) : null;
                  return (
                    <button key={hmw.id} onClick={() => !disabled && toggleHmw(hmw.id)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all relative ${selected ? "border-[#8B5CF6] bg-[rgba(139,92,246,0.06)] shadow-sm" : disabled ? "border-[#e5e7eb] opacity-40 cursor-not-allowed" : "border-[#e5e7eb] hover:border-[#d1d5db]"}`}
                    >
                      <div className={`absolute top-4 right-4 w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-bold ${selected ? "bg-[#8B5CF6] text-white" : "border-2 border-[#e5e7eb]"}`}>
                        {selected && "✓"}
                      </div>
                      {parentCat && (
                        <span className="inline-block text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md mb-3"
                          style={{ color: parentCat.color, background: parentCat.dimColor }}>
                          {parentInsight?.tag}
                        </span>
                      )}
                      <div className="text-[14px] font-semibold text-[#111827] leading-snug pr-8">{hmw.question}</div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-[#e5e7eb] bg-white/90 backdrop-blur px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back</Button>
                  <span className="text-[20px] font-bold text-[#8B5CF6]">{selectedHmws.length}</span>
                  <span className="text-[13px] text-[#9ca3af]">/ {MAX_HMW} HMWs</span>
                </div>
                <Button onClick={generateConcepts} disabled={selectedHmws.length === 0} className="bg-[#8B5CF6] hover:bg-[#7c3aed] text-white">
                  Generate Concepts <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Concepts + Baseline + Beyond ── */}
          {step === 3 && (
            <div className="flex-1 flex flex-col overflow-hidden">
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
                          {selected && "✓"}
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
                          <span className="text-[#9ca3af] mt-0.5">•</span>{m}
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
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back</Button>
                  <span className="text-[20px] font-bold text-[#E8713A]">{selectedConcepts.length}</span>
                  <span className="text-[13px] text-[#9ca3af]">/ 3 concepts</span>
                </div>
                <Button onClick={handleContinueToVisual} disabled={selectedConcepts.length === 0} className="bg-[#E8713A] hover:bg-[#d4652f] text-white">
                  Continue to Visual Variations <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
