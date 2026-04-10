"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { ChatPanel } from "@/components/chat-panel";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Lightbulb } from "lucide-react";
import type { Feature, Product, DesignConcept, Baseline, BeyondScreen, ChatMessage } from "@/lib/types";

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

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreamText, setChatStreamText] = useState("");
  const chatAbortRef = useRef<AbortController | null>(null);

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
    // Support both HMW-based and insight-based generation
    const hasHmws = feature?.selected_hmws?.length;
    const hasInsights = feature?.selected_insights?.length;
    if (!hasHmws && !hasInsights) return;
    setGenerating(true);
    setError(null);
    try {
      const body = hasHmws
        ? { selectedHmwIds: feature.selected_hmws }
        : { selectedInsightIds: feature.selected_insights };
      const res = await fetch(`/api/products/${productId}/features/${featureId}/design-concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, [productId, featureId, feature?.selected_hmws, feature?.selected_insights]);

  // ── Save selected concepts and proceed to flow ──
  const handleContinueToFlow = useCallback(async () => {
    try {
      await fetch(`/api/products/${productId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_concepts: selectedConcepts,
          phase_design_concepts: "complete",
          phase_flow: "active",
        }),
      });
      router.push(`/products/${productId}/features/${featureId}/flow`);
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

  // Auto-trigger generation if concepts haven't been generated yet
  useEffect(() => {
    if (needsGeneration && !generating && feature?.selected_hmws?.length) {
      generateConcepts();
    }
  }, [needsGeneration, generating, feature?.selected_hmws, generateConcepts]);

  const handleChatSend = useCallback(async (content: string) => {
    const userMsg: ChatMessage = { role: "user", content, timestamp: Date.now() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatLoading(true);
    setChatStreamText("");
    try {
      chatAbortRef.current = new AbortController();
      const res = await fetch(`/api/products/${productId}/features/${featureId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
        signal: chatAbortRef.current.signal,
      });
      if (!res.ok) throw new Error("Chat failed");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) { fullText += data.text; setChatStreamText(fullText); }
          } catch { /* skip */ }
        }
      }
      setChatMessages([...updated, { role: "assistant", content: fullText, timestamp: Date.now() }]);
      setChatStreamText("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error("Chat error:", err);
    }
    setChatLoading(false);
  }, [chatMessages, productId, featureId]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-content-muted"><Loader2 className="w-5 h-5 animate-spin mr-2" strokeWidth={1.5} />Loading...</div>;
  }

  if (!product || !feature) {
    return <div className="flex items-center justify-center h-full text-content-muted">Feature not found</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PhaseHeader
        title="Design Concepts"
        subtitle={feature.name}
        actions={
          designConcepts.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-content-muted">{selectedConcepts.length}/3 selected</span>
              <Button
                size="sm"
                onClick={handleContinueToFlow}
                disabled={selectedConcepts.length === 0}
                className="text-xs h-8"
              >
                Generate Flow <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Generate concepts prompt */}
      {needsGeneration && !generating && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-feedback-warning-bg flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-6 h-6 text-content-heading" strokeWidth={1.5} />
            </div>
            <h2 className="text-h2 font-bold text-content-heading mb-2">Generate Design Concepts</h2>
            <p className="text-sm text-content-secondary mb-6">
              AI will generate design concepts based on your selected HMW statements for &ldquo;{feature.name}&rdquo;.
            </p>
            <Button onClick={generateConcepts} className="text-white gap-1.5">
              <Lightbulb className="w-4 h-4" strokeWidth={1.5} /> Generate Concepts
            </Button>
            {error && <p className="text-body-sm text-feedback-error-text mt-3">{error}</p>}
          </div>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-6 h-6 text-content-heading animate-spin" strokeWidth={1.5} />
          <p className="text-sm text-content-secondary">Generating design concepts...</p>
          <p className="text-xs text-content-muted">This takes 15-30 seconds</p>
          {error && (
            <div className="text-body-sm text-feedback-error-text mt-2">
              Error: {error}
              <Button variant="outline" size="sm" className="ml-3" onClick={() => setGenerating(false)}>Dismiss</Button>
            </div>
          )}
        </div>
      )}

      {/* Concepts display */}
      {designConcepts.length > 0 && !generating && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <p className="text-body-sm text-content-secondary">
              {designConcepts.length} concepts generated. Select up to 3 for visual variations.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-24">
            {/* Concept cards */}
            {designConcepts.map((concept) => {
              const selected = selectedConcepts.includes(concept.name);
              return (
                <button key={concept.name} onClick={() => toggleConcept(concept.name)}
                  className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${selected ? "border-action-primary-bg bg-surface-subtle shadow-sm" : "border-divider hover:border-divider-card-hover"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-h3 font-bold text-content-heading">{concept.name}</h3>
                      <p className="text-body-sm text-content-heading italic">{concept.tagline}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${selected ? "bg-action-primary-bg text-white" : "border-2 border-divider"}`}>
                      {selected && "\u2713"}
                    </div>
                  </div>
                  <p className="text-body-sm text-content-secondary leading-relaxed mb-3">{concept.idea}</p>
                  <div className="text-xs text-content-secondary mb-2">
                    <span className="font-semibold text-content-secondary">Solves for:</span> {concept.solvesFor}
                  </div>
                  {concept.onThePage?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {concept.onThePage.map((item, i) => (
                        <span key={i} className="text-overline px-2 py-1 rounded-md bg-surface-subtle text-content-secondary">{item}</span>
                      ))}
                    </div>
                  )}
                  {concept.tradeoffs?.length > 0 && (
                    <div className="border-t border-divider pt-2 mt-2">
                      <p className="text-overline font-semibold text-feedback-error-text uppercase tracking-wide mb-1">Tradeoffs</p>
                      {concept.tradeoffs.map((t, i) => (
                        <p key={i} className="text-xs text-feedback-error-text/70">{t}</p>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Baseline */}
            {baseline && (
              <div className="p-6 rounded-2xl border border-divider bg-surface-page-alt">
                <h3 className="text-sm font-bold text-content-heading uppercase tracking-wide mb-3">The Baseline</h3>
                <p className="text-xs font-semibold text-content-secondary mb-2">Must-have elements</p>
                <ul className="space-y-1 mb-4">
                  {baseline.mustHaves.map((m, i) => (
                    <li key={i} className="text-body-sm text-content-secondary flex items-start gap-2">
                      <span className="text-content-muted mt-0.5">&bull;</span>{m}
                    </li>
                  ))}
                </ul>
                {baseline.commonlyMissed?.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-feedback-error-text mb-2">Commonly missed</p>
                    <ul className="space-y-1">
                      {baseline.commonlyMissed.map((m, i) => (
                        <li key={i} className="text-body-sm text-feedback-error-text/70 flex items-start gap-2">
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
              <div className="p-6 rounded-2xl border border-divider bg-surface-page-alt">
                <h3 className="text-sm font-bold text-content-heading uppercase tracking-wide mb-3">Beyond This Screen</h3>
                <div className="space-y-3">
                  {beyondScreen.map((b, i) => (
                    <div key={i}>
                      <p className="text-body-sm font-semibold text-content-heading">{b.touchpoint}</p>
                      <p className="text-xs text-content-secondary mt-0.5">{b.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          </div>

          {/* Chat Panel */}
          <div className="w-[320px] shrink-0 flex flex-col bg-surface-page-alt border-l border-divider">
            <div className="px-4 py-2.5 border-b border-divider bg-surface-card">
              <h2 className="text-body-sm font-semibold text-content-heading">Design Chat</h2>
              <p className="text-overline text-content-muted">Discuss concepts with AI</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel
                messages={chatMessages}
                onSend={handleChatSend}
                loading={chatLoading}
                streamingText={chatStreamText}
                placeholder="Ask about a concept..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
