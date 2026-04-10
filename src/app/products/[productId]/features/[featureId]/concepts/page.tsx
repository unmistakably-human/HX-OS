"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { ChatPanel } from "@/components/chat-panel";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Loader2, Check, HelpCircle, Copy } from "lucide-react";
import type { Concept, ChatMessage, Feature } from "@/lib/types";

const trackStyles: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "var(--accent-green-light)", text: "var(--accent-green-dark)", label: "Track A" },
  B: { bg: "var(--accent-purple-10)", text: "var(--accent-purple)", label: "Track B" },
  outside: { bg: "var(--feedback-warning-bg)", text: "var(--feedback-warning-text)", label: "Outside" },
};

export default function ConceptsPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const productId = params.productId;
  const featureId = params.featureId;

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreamText, setChatStreamText] = useState("");
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<"loading" | "ready">("loading");
  const [copyingToFigma, setCopyingToFigma] = useState(false);
  const [copyResult, setCopyResult] = useState<{ success: boolean; message: string } | null>(null);

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
          setSelectedConcept(feat.chosen_concept || null);
          if (Array.isArray(feat.concepts) && feat.concepts.length > 0) {
            setConcepts(feat.concepts);
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

  const handleSelectConcept = useCallback(
    async (conceptName: string) => {
      setSelectedConcept(conceptName);
      await fetch(`/api/products/${productId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosen_concept: conceptName, phase_concepts: "complete" }),
      });
    },
    [productId, featureId]
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
      />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL (60%) */}
        <div className="w-[60%] flex flex-col overflow-hidden border-r border-divider">
          {concepts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-6 h-6 text-action-primary-bg animate-spin" strokeWidth={1.5} />
              <p className="text-sm text-content-secondary">Sketching visual variations...</p>
              <p className="text-xs text-content-muted">This takes 30-60 seconds</p>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex flex-wrap gap-1 px-4 pt-3 pb-0 border-b border-divider">
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
              </div>

              {/* Concept content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentConcept && (
                  <>
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

                    {/* Action buttons */}
                    <div className="pb-4 flex gap-2">
                      {selectedConcept === currentConcept.name ? (
                        <Button variant="outline" className="flex-1 border-action-primary-bg bg-action-primary-bg text-action-primary-text" disabled>
                          <Check className="w-4 h-4 mr-1.5" strokeWidth={1.5} />Selected
                        </Button>
                      ) : (
                        <Button variant="outline" className="flex-1 border-divider text-content-primary hover:bg-surface-subtle" onClick={() => handleSelectConcept(currentConcept.name)}>
                          Select this concept
                        </Button>
                      )}

                      {/* Copy to Figma — captures wireframe div to clipboard */}
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={copyingToFigma}
                        onClick={handleCopyToFigma}
                      >
                        {copyingToFigma ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Copying...</>
                        ) : copyResult?.success ? (
                          <><Check className="w-4 h-4 mr-1.5 text-green-600" strokeWidth={1.5} />Copied!</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-1.5" strokeWidth={1.5} />Copy to Figma</>
                        )}
                      </Button>
                    </div>
                    {copyResult && (
                      <p className={`text-xs -mt-2 pb-2 ${copyResult.success ? "text-green-600" : "text-red-500"}`}>
                        {copyResult.message}
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL (40%) — Chat */}
        <div className="w-[40%] flex flex-col bg-surface-page-alt">
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
