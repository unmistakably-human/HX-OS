"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { ChatPanel } from "@/components/chat-panel";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Loader2, Check, HelpCircle, Copy, ArrowRight } from "lucide-react";
import type { Concept, ChatMessage, Feature } from "@/lib/types";

const trackStyles: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "var(--accent-green-light)", text: "var(--accent-green-dark)", label: "Track A" },
  B: { bg: "var(--accent-purple-10)", text: "var(--accent-purple)", label: "Track B" },
  outside: { bg: "var(--feedback-warning-bg)", text: "var(--feedback-warning-text)", label: "Outside" },
};

export default function ConceptsPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const router = useRouter();
  const productId = params.productId;
  const featureId = params.featureId;

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreamText, setChatStreamText] = useState("");
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [loadingState, setLoadingState] = useState<"loading" | "ready">("loading");
  const [copyingToFigma, setCopyingToFigma] = useState(false);
  const [copyResult, setCopyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [chatWidth, setChatWidth] = useState(400);
  const isDragging = useRef(false);

  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight chat request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Inject Figma capture.js once
  useEffect(() => {
    if (document.querySelector('script[data-figma-capture]')) return;
    const s = document.createElement("script");
    s.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
    s.setAttribute("data-figma-capture", "true");
    document.head.appendChild(s);
  }, []);

  // Resize drag handler
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = chatWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX - ev.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 280), window.innerWidth - 500);
      setChatWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [chatWidth]);

  const handleCopyToFigma = useCallback(async () => {
    setCopyingToFigma(true);
    setCopyResult(null);
    try {
      const w = window as unknown as { figma?: { captureForDesign?: (opts: { selector: string }) => Promise<{ success: boolean; error?: string }> } };
      if (!w.figma?.captureForDesign) {
        throw new Error("Figma capture not loaded. Try refreshing the page.");
      }
      const result = await w.figma.captureForDesign({ selector: "#wireframe-render" });
      if (result && result.success !== false) {
        setCopyResult({ success: true, message: "Copied! Paste into Figma (Cmd+V)" });
      } else {
        throw new Error(result?.error || "Capture failed");
      }
    } catch (err) {
      setCopyResult({ success: false, message: err instanceof Error ? err.message : "Copy failed" });
    }
    setCopyingToFigma(false);
  }, []);

  // Load feature + product data
  useEffect(() => {
    async function load() {
      try {
        const [fRes, pRes] = await Promise.all([
          fetch(`/api/products/${productId}/features/${featureId}`),
          fetch(`/api/products/${productId}`),
        ]);
        if (fRes.ok) {
          const feat: Feature = await fRes.json();
          setFeature(feat);
          setChatMessages(feat.chat_messages || []);
          setSelectedConcepts(feat.chosen_concept ? feat.chosen_concept.split("|||") : []);
          if (Array.isArray(feat.concepts) && feat.concepts.length > 0) {
            setConcepts(feat.concepts);
            // Fix stale phase data if concepts exist but phase not marked complete
            if (feat.phase_concepts !== "complete") {
              fetch(`/api/products/${productId}/features/${featureId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phase_visual: "complete", phase_concepts: "complete" }),
              }).catch(() => {});
            }
          } else {
            // Auto-trigger visual variation generation
            setGenerating(true);
            try {
              const genRes = await fetch(
                `/api/products/${productId}/features/${featureId}/concepts`,
                { method: "POST" }
              );
              if (genRes.ok) {
                const data = await genRes.json();
                if (Array.isArray(data)) setConcepts(data);
              }
            } catch { /* ignore */ }
            setGenerating(false);
          }
        }
        // product data loaded if needed
        if (pRes.ok) await pRes.json();
      } catch {
        // ignore
      }
      setLoadingState("ready");
    }
    load();
  }, [productId, featureId]);

  const generateConcepts = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/products/${productId}/features/${featureId}/concepts`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setConcepts(data);
        setActiveTab(0);
      }
    } catch (err) {
      console.error("Concept generation failed:", err);
    }
    setGenerating(false);
  }, [productId, featureId]);

  const handleChatSend = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = { role: "user", content, timestamp: Date.now() };
      const updatedMessages = [...chatMessages, userMsg];
      setChatMessages(updatedMessages);
      setChatLoading(true);
      setChatStreamText("");

      try {
        abortRef.current = new AbortController();
        const res = await fetch(
          `/api/products/${productId}/features/${featureId}/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: updatedMessages }),
            signal: abortRef.current.signal,
          }
        );

        if (!res.ok) throw new Error("Chat request failed");

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
              if (data.text) {
                fullText += data.text;
                setChatStreamText(fullText);
              }
            } catch {
              // skip malformed
            }
          }
        }

        const assistantMsg: ChatMessage = { role: "assistant", content: fullText, timestamp: Date.now() };
        const finalMessages = [...updatedMessages, assistantMsg];
        setChatMessages(finalMessages);
        setChatStreamText("");

        await fetch(`/api/products/${productId}/features/${featureId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_messages: finalMessages }),
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Chat error:", err);
        }
      }
      setChatLoading(false);
    },
    [chatMessages, productId, featureId]
  );

  const toggleSelectConcept = useCallback(
    async (conceptName: string) => {
      const updated = selectedConcepts.includes(conceptName)
        ? selectedConcepts.filter((n) => n !== conceptName)
        : selectedConcepts.length >= 3
          ? selectedConcepts
          : [...selectedConcepts, conceptName];
      setSelectedConcepts(updated);
      await fetch(`/api/products/${productId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chosen_concept: updated.join("|||"),
          phase_concepts: updated.length > 0 ? "complete" : "active",
          ...(updated.length > 0 ? { phase_hifi: "active" } : {}),
        }),
      });
    },
    [productId, featureId, selectedConcepts]
  );

  if (loadingState === "loading") {
    return (
      <div className="flex items-center justify-center h-full text-content-muted">
        Loading...
      </div>
    );
  }

  const currentConcept = concepts[activeTab];

  return (
    <div className="flex flex-col h-full">
      <PhaseHeader
        title="Visual Variations"
        subtitle={feature?.name || "Concepts"}
        actions={
          concepts.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-content-muted">{selectedConcepts.length}/3 selected</span>
              <Button
                size="sm"
                onClick={async () => {
                  await fetch(`/api/products/${productId}/features/${featureId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chosen_concept: selectedConcepts.join("|||"),
                      phase_concepts: "complete",
                      phase_hifi: "active",
                    }),
                  });
                  router.push(`/products/${productId}/features/${featureId}/hifi`);
                }}
                disabled={selectedConcepts.length === 0}
                className="text-xs h-8"
              >
                Design HiFi <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL — fills remaining space */}
        <div className="flex-1 min-w-[400px] flex flex-col overflow-hidden border-r border-divider">
          {concepts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-6 h-6 text-action-primary-bg animate-spin" strokeWidth={1.5} />
              <p className="text-sm text-content-secondary">Sketching visual variations...</p>
              <p className="text-xs text-content-muted">This takes 30-60 seconds</p>
            </div>
          ) : (
            <>
              {/* Tab bar + selection counter */}
              <div className="flex flex-wrap items-end gap-1 px-4 pt-3 pb-0 border-b border-divider">
                {concepts.map((concept, i) => {
                  const track = trackStyles[concept.track] || trackStyles.A;
                  const isActive = i === activeTab;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-body-sm transition-colors relative ${
                        isActive ? "font-semibold text-content-heading" : "text-content-tertiary hover:text-content-secondary"
                      }`}
                    >
                      {concept.name}
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: track.bg, color: track.text }}
                      >
                        {track.label}
                      </span>
                      {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-action-primary-bg" />}
                    </button>
                  );
                })}
                <span className="ml-auto text-xs text-content-muted pb-2 shrink-0">
                  {selectedConcepts.length}/3 selected
                </span>
              </div>

              {/* Concept content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentConcept && (
                  <>
                    {/* Compact action bar above wireframe */}
                    <div className="flex items-center justify-end gap-2">
                      {copyResult && (
                        <span className={`text-xs mr-auto ${copyResult.success ? "text-green-600" : "text-red-500"}`}>
                          {copyResult.message}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={copyingToFigma}
                        onClick={handleCopyToFigma}
                        className="text-xs h-7 rounded-md"
                      >
                        {copyingToFigma ? (
                          <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
                        ) : copyResult?.success ? (
                          <><Check className="w-3 h-3 mr-1 text-green-600" strokeWidth={1.5} />Copied</>
                        ) : (
                          <><Copy className="w-3 h-3 mr-1" strokeWidth={1.5} />Figma</>
                        )}
                      </Button>
                      <Button
                        variant={selectedConcepts.includes(currentConcept.name) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSelectConcept(currentConcept.name)}
                        disabled={!selectedConcepts.includes(currentConcept.name) && selectedConcepts.length >= 3}
                        className="text-xs h-7 rounded-md"
                      >
                        {selectedConcepts.includes(currentConcept.name) ? (
                          <><Check className="w-3 h-3 mr-1" strokeWidth={1.5} />Selected</>
                        ) : (
                          "Select"
                        )}
                      </Button>
                    </div>

                    <div
                      id="wireframe-render"
                      className="border border-divider rounded-lg overflow-hidden"
                      style={{ minHeight: 300, padding: 16, background: "#F5F5F5", fontFamily: "system-ui, -apple-system, sans-serif", color: "#333" }}
                      dangerouslySetInnerHTML={{ __html: currentConcept.wireframeHtml }}
                    />

                    <Accordion>
                      <AccordionItem value="details">
                        <AccordionTrigger className="text-sm text-content-secondary">Details</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div>
                              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-1">Core Idea</p>
                              <p className="text-sm text-content-secondary">{currentConcept.coreIdea}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-1">Design Principles</p>
                              <ul className="space-y-1">
                                {currentConcept.principles.map((p, i) => (
                                  <li key={i} className="text-body-sm text-content-secondary flex items-start gap-2">
                                    <span className="text-content-muted mt-0.5">•</span>{p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-hx-green-dark uppercase tracking-wide mb-1">Pros</p>
                                <ul className="space-y-1">
                                  {currentConcept.pros.map((p, i) => (
                                    <li key={i} className="text-body-sm text-hx-green-dark bg-hx-green-light rounded px-2 py-1">{p}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-feedback-error-text uppercase tracking-wide mb-1">Cons</p>
                                <ul className="space-y-1">
                                  {currentConcept.cons.map((c, i) => (
                                    <li key={i} className="text-body-sm text-feedback-error-text bg-feedback-error-bg rounded px-2 py-1">{c}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div className="border-l-2 border-action-primary-bg pl-3">
                              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-1">Delight Moment</p>
                              <p className="text-body-sm text-content-secondary italic">{currentConcept.delightMoment}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <HelpCircle className="w-4 h-4 text-content-secondary mt-0.5 shrink-0" strokeWidth={1.5} />
                              <div>
                                <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-1">Stakeholder Question</p>
                                <p className="text-body-sm text-content-heading font-semibold">{currentConcept.stakeholderQuestion}</p>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Continue CTA */}
                    {selectedConcepts.length > 0 && (
                      <div className="pb-4">
                        <Button
                          onClick={() => router.push(`/products/${productId}/features/${featureId}/hifi`)}
                          className="w-full gap-1.5"
                        >
                          Design High-Fidelity
                          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          className="w-1 cursor-col-resize hover:bg-action-primary-bg/20 active:bg-action-primary-bg/30 transition-colors shrink-0"
        />

        {/* RIGHT PANEL — Chat (resizable) */}
        <div className="flex flex-col bg-surface-page-alt shrink-0" style={{ width: chatWidth, minWidth: 280 }}>
          <div className="px-4 py-2.5 border-b border-divider bg-surface-card">
            <h2 className="text-body-sm font-semibold text-content-heading">Design Chat</h2>
            <p className="text-overline text-content-muted">Discuss concepts with the AI designer</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              messages={chatMessages}
              onSend={handleChatSend}
              loading={chatLoading}
              streamingText={chatStreamText}
              placeholder="Ask about a concept or request changes..."
              suggestions={[
                "Compare Track A vs Track B",
                "Which concept fits mobile best?",
                "Simplify this wireframe",
                "Add a delight moment",
                "What are the accessibility gaps?",
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
