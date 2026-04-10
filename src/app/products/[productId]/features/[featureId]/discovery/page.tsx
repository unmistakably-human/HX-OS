"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ArrowRight, ArrowLeft, Search } from "lucide-react";
import { Star } from "lucide-react";
import type { Feature, Product, Insight, HMWStatement, KnowledgeEntry } from "@/lib/types";

const MAX_INSIGHTS = 5;
const MAX_HMW = 3;

const CATEGORY_CONFIG = [
  { key: "user" as const, label: "User Behaviour", icon: "U", color: "var(--accent-green)", dimColor: "var(--accent-green-light)" },
  { key: "domain" as const, label: "Domain / Category", icon: "D", color: "var(--accent-amber)", dimColor: "var(--raw-warning-light)" },
  { key: "competitor" as const, label: "Benchmarks", icon: "B", color: "var(--accent-blue)", dimColor: "var(--accent-blue-light)" },
];

export default function FeatureInsightsPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const router = useRouter();
  const productId = params.productId;
  const featureId = params.featureId;

  const [product, setProduct] = useState<Product | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);

  // Step: 0 = generate insights, 1 = select insights, 2 = select HMWs
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [insights, setInsights] = useState<Insight[]>([]);
  const [catPage, setCatPage] = useState(0);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [hmwStatements, setHmwStatements] = useState<HMWStatement[]>([]);
  const [selectedHmws, setSelectedHmws] = useState<string[]>([]);
  const [relatedEntries, setRelatedEntries] = useState<(KnowledgeEntry & { product_name?: string })[]>([]);

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
            if (feat.hmw_statements?.length && feat.selected_hmws?.length) {
              // HMWs already selected — show completed state (step 2 with selections)
              setSelectedInsights(feat.selected_insights || []);
              setHmwStatements(feat.hmw_statements);
              setSelectedHmws(feat.selected_hmws);
              setStep(2);
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
  }, [productId, featureId, router]);

  // Load cross-product related entries when insights are available
  useEffect(() => {
    if (!feature || insights.length === 0) return;
    const query = `${feature.name} ${feature.problem || ""}`;
    fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}&excludeProduct=${productId}&limit=6`)
      .then((r) => r.ok ? r.json() : [])
      .then(setRelatedEntries)
      .catch(() => {});
  }, [insights, feature, productId]);

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

  // ── Save selected HMWs, generate concepts, then navigate ──
  const handleIdeateConcepts = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      // Save selected HMWs
      await fetch(`/api/products/${productId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_hmws: selectedHmws,
          phase_discovery: "complete",
          phase_design_concepts: "active",
        }),
      });

      // Trigger concept generation
      const res = await fetch(`/api/products/${productId}/features/${featureId}/design-concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedHmwIds: selectedHmws }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Concept generation failed");
      }

      router.push(`/products/${productId}/features/${featureId}/design-concepts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate concepts");
      setGenerating(false);
    }
  }, [productId, featureId, selectedHmws, router]);

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

  if (loading) {
    return <div className="flex items-center justify-center h-full text-content-muted"><Loader2 className="w-5 h-5 animate-spin mr-2" strokeWidth={1.5} />Loading...</div>;
  }

  if (!product || !feature) {
    return <div className="flex items-center justify-center h-full text-content-muted">Feature not found</div>;
  }

  if (!product.enriched_pcd) {
    return (
      <>
        <PhaseHeader title="Feature Insights" subtitle={feature.name} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <p className="text-sm text-content-secondary mb-4">Complete product context first.</p>
            <Button onClick={() => router.push(`/products/${productId}/context`)} variant="outline">Go to Product Context</Button>
          </div>
        </div>
      </>
    );
  }

  const stepLabels = [
    { n: 1, label: "Select Insights", sub: `Max ${MAX_INSIGHTS}` },
    { n: 2, label: "How Might We", sub: `Select ${MAX_HMW}` },
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
            <div className="w-14 h-14 rounded-full bg-feedback-info-bg flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-feedback-info-text" strokeWidth={1.5} />
            </div>
            <h2 className="text-h2 font-bold text-content-heading mb-2">Generate Insights</h2>
            <p className="text-sm text-content-secondary mb-6">
              AI will research and generate insights across 3 categories for &ldquo;{feature.name}&rdquo;.
            </p>
            <Button onClick={generateInsights} className="gap-1.5">
              <Search className="w-4 h-4" strokeWidth={1.5} /> Generate Insights
            </Button>
            {error && <p className="text-body-sm text-feedback-error-text mt-3">{error}</p>}
          </div>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-6 h-6 text-action-primary-bg animate-spin" strokeWidth={1.5} />
          <p className="text-sm text-content-secondary">
            {step === 0 ? "Generating insights..." : step === 1 ? "Generating HMW statements..." : "Ideating concepts..."}
          </p>
          <p className="text-xs text-content-muted">This takes 15-30 seconds</p>
          {error && (
            <div className="text-body-sm text-feedback-error-text mt-2">
              Error: {error}
              <Button variant="outline" size="sm" className="ml-3" onClick={() => setGenerating(false)}>Dismiss</Button>
            </div>
          )}
        </div>
      )}

      {/* Steps 1-2 */}
      {step >= 1 && !generating && (
        <>
          {/* Stepper */}
          <div className="flex gap-0 px-5 py-3 border-b border-divider bg-white">
            {stepLabels.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              return (
                <div key={i} className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: active ? "var(--surface-page-alt)" : "transparent" }}>
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-overline font-bold shrink-0 ${done ? "bg-hx-green-dark text-content-on-dark" : active ? "bg-action-primary-bg text-content-on-dark" : "bg-surface-subtle text-content-muted"}`}>
                    {done ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : s.n}
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${active ? "text-content-heading" : "text-content-muted"}`}>{s.label}</div>
                    <div className="text-overline text-content-muted">{s.sub}</div>
                  </div>
                  {i < stepLabels.length - 1 && <span className="ml-auto text-content-muted">&rsaquo;</span>}
                </div>
              );
            })}
          </div>

          {/* ── STEP 1: Insight Selection ── */}
          {step === 1 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Category tabs */}
              <div className="flex gap-2 px-5 py-3 border-b border-divider">
                {CATEGORY_CONFIG.map((c, i) => {
                  const active = catPage === i;
                  const count = selectedInsights.filter((id) => insights.filter((ins) => ins.category === c.key).some((ins) => ins.id === id)).length;
                  return (
                    <button key={i} onClick={() => setCatPage(i)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${active ? "border-current" : "border-transparent bg-surface-subtle"}`}
                      style={active ? { background: c.dimColor, borderColor: c.color + "40", color: c.color } : {}}
                    >
                      <span className="text-xs font-semibold" style={active ? { color: c.color } : { color: "var(--content-secondary)" }}>{c.label}</span>
                      {count > 0 && (
                        <span className="text-overline font-bold text-content-on-dark px-2 py-0.5 rounded-full" style={{ background: c.color }}>{count}</span>
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
                      className={`w-full text-left p-4 rounded-xl border transition-all relative ${selected ? "border-content-heading bg-content-heading/[0.03] shadow-sm" : disabled ? "border-divider opacity-40 cursor-not-allowed" : "border-divider hover:border-content-muted"}`}
                    >
                      <div className={`absolute top-4 right-4 w-5 h-5 rounded flex items-center justify-center text-overline font-bold transition-all ${selected ? "bg-content-heading text-content-on-dark" : "border border-divider"}`}>
                        {selected && "✓"}
                      </div>
                      <span className="inline-block text-overline font-semibold tracking-wider uppercase px-2 py-0.5 rounded mb-2 bg-surface-subtle text-content-secondary">
                        {ins.tag}
                      </span>
                      <div className="text-body-base font-semibold text-content-heading leading-snug mb-1.5 pr-8">{ins.headline}</div>
                      <div className="text-body-sm text-content-secondary leading-relaxed">{ins.body}</div>
                    </button>
                  );
                })}
              </div>

              {/* Related from other products */}
              {relatedEntries.length > 0 && (
                <div className="px-5 pb-6 pt-4 border-t border-[#e5e7eb] mt-4">
                  <h3 className="text-[13px] font-bold text-[#111827] uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-[#F59E0B]" strokeWidth={1.5} />
                    Related from other products
                  </h3>
                  <div className="space-y-2">
                    {relatedEntries.map((entry) => (
                      <div key={entry.id} className="p-3 bg-[#fafafa] border border-[#e5e7eb] rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded">
                            {entry.product_name}
                          </span>
                          <span className="text-[10px] text-[#9ca3af]">
                            {entry.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold text-[#111827] leading-snug">{entry.title}</p>
                        <p className="text-[12px] text-[#6b7280] mt-0.5">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom bar */}
              <div className="border-t border-divider bg-surface-frosted backdrop-blur px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-h2 font-bold text-content-heading">{selectedInsights.length}</span>
                  <span className="text-body-sm text-content-muted ml-1.5">/ {MAX_INSIGHTS} insights</span>
                </div>
                {selectedInsights.length >= MAX_INSIGHTS && catPage === CATEGORY_CONFIG.length - 1 ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={async () => {
                      // Skip HMW — save insights and go directly to concept generation
                      setGenerating(true);
                      try {
                        await fetch(`/api/products/${productId}/features/${featureId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            selected_insights: selectedInsights,
                            phase_discovery: "complete",
                            phase_design_concepts: "active",
                          }),
                        });
                        await fetch(`/api/products/${productId}/features/${featureId}/design-concepts`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ selectedInsightIds: selectedInsights }),
                        });
                        router.push(`/products/${productId}/features/${featureId}/design-concepts`);
                      } catch { setGenerating(false); }
                    }}>
                      Skip to Concepts <ArrowRight className="w-4 h-4 ml-1" strokeWidth={1.5} />
                    </Button>
                    <Button onClick={generateHmws}>
                      Write HMWs <ArrowRight className="w-4 h-4 ml-1" strokeWidth={1.5} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (catPage < CATEGORY_CONFIG.length - 1) {
                        setCatPage(catPage + 1);
                      }
                    }}
                    disabled={catPage === CATEGORY_CONFIG.length - 1 && selectedInsights.length < MAX_INSIGHTS}
                  >
                    {catPage === CATEGORY_CONFIG.length - 1
                      ? `Select ${MAX_INSIGHTS - selectedInsights.length} more`
                      : "Next"}
                    <ArrowRight className="w-4 h-4 ml-1" strokeWidth={1.5} />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: HMW Selection ── */}
          {step === 2 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-h1 font-bold text-content-heading">How Might We...</h2>
                <p className="text-body-sm text-content-secondary mt-1">
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
                      className={`w-full text-left p-4 rounded-xl border transition-all relative ${selected ? "border-content-heading bg-content-heading/[0.03] shadow-sm" : disabled ? "border-divider opacity-40 cursor-not-allowed" : "border-divider hover:border-content-muted"}`}
                    >
                      <div className={`absolute top-4 right-4 w-5 h-5 rounded flex items-center justify-center text-overline font-bold ${selected ? "bg-content-heading text-content-on-dark" : "border border-divider"}`}>
                        {selected && "✓"}
                      </div>
                      {parentCat && (
                        <span className="inline-block text-overline font-semibold tracking-wider uppercase px-2 py-0.5 rounded mb-2 bg-surface-subtle text-content-secondary">
                          {parentInsight?.tag}
                        </span>
                      )}
                      <div className="text-sm font-medium text-content-heading leading-snug pr-8">{hmw.question}</div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-divider bg-surface-frosted backdrop-blur px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}><ArrowLeft className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} /> Back</Button>
                  <span className="text-h2 font-bold text-content-heading">{selectedHmws.length}</span>
                  <span className="text-body-sm text-content-muted">/ {MAX_HMW} HMWs</span>
                </div>
                <Button onClick={handleIdeateConcepts} disabled={selectedHmws.length === 0 || generating}>
                  Ideate Concepts <ArrowRight className="w-4 h-4 ml-1" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}
