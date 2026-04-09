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
import { Loader2, Check, HelpCircle, ExternalLink } from "lucide-react";
import type { Concept, ChatMessage, Feature, Product } from "@/lib/types";

const trackStyles: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "#ecfdf5", text: "#065f46", label: "Track A" },
  B: { bg: "#f3e8ff", text: "#6b21a8", label: "Track B" },
  outside: { bg: "#fffbeb", text: "#92400e", label: "Outside" },
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

  const abortRef = useRef<AbortController | null>(null);

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
      <div className="flex items-center justify-center h-full text-[#9ca3af]">
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
        <div className="w-[60%] flex flex-col overflow-hidden border-r border-[#e5e7eb]">
          {concepts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              {generating ? (
                <>
                  <Loader2 className="w-6 h-6 text-[#E8713A] animate-spin" />
                  <p className="text-[14px] text-[#4b5563]">Generating concept variations...</p>
                  <p className="text-[12px] text-[#9ca3af]">This takes 30-60 seconds</p>
                </>
              ) : (
                <>
                  <p className="text-[14px] text-[#4b5563]">Ready to generate concepts</p>
                  <Button onClick={generateConcepts} className="bg-[#E8713A] hover:bg-[#d4632e] text-white px-6">
                    Generate 6 Concepts
                  </Button>
                  <p className="text-[12px] text-[#9ca3af]">Takes 30-60 seconds</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex flex-wrap gap-1 px-4 pt-3 pb-0 border-b border-[#e5e7eb]">
                {concepts.map((concept, i) => {
                  const track = trackStyles[concept.track] || trackStyles.A;
                  const isActive = i === activeTab;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-[13px] transition-colors relative ${
                        isActive ? "font-semibold text-[#18181b]" : "text-[#71717a] hover:text-[#4b5563]"
                      }`}
                    >
                      {concept.name}
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: track.bg, color: track.text }}
                      >
                        {track.label}
                      </span>
                      {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E8713A]" />}
                    </button>
                  );
                })}
              </div>

              {/* Concept content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentConcept && (
                  <>
                    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;background:#F5F5F5;color:#333;}</style></head><body>${currentConcept.wireframeHtml}</body></html>`}
                        className="w-full border-0"
                        style={{ minHeight: 400 }}
                        title={currentConcept.name}
                        sandbox="allow-same-origin"
                        onLoad={(e) => {
                          const iframe = e.target as HTMLIFrameElement;
                          try {
                            const height = iframe.contentDocument?.body?.scrollHeight;
                            if (height && height > 400) iframe.style.height = `${height + 32}px`;
                          } catch { /* cross-origin */ }
                        }}
                      />
                    </div>

                    <Accordion>
                      <AccordionItem value="details">
                        <AccordionTrigger className="text-[14px] text-[#374151]">Details</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div>
                              <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Core Idea</p>
                              <p className="text-[14px] text-[#374151]">{currentConcept.coreIdea}</p>
                            </div>
                            <div>
                              <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Design Principles</p>
                              <ul className="space-y-1">
                                {currentConcept.principles.map((p, i) => (
                                  <li key={i} className="text-[13px] text-[#4b5563] flex items-start gap-2">
                                    <span className="text-[#9ca3af] mt-0.5">•</span>{p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[12px] font-semibold text-[#065f46] uppercase tracking-wide mb-1">Pros</p>
                                <ul className="space-y-1">
                                  {currentConcept.pros.map((p, i) => (
                                    <li key={i} className="text-[13px] text-[#065f46] bg-[#ecfdf5] rounded px-2 py-1">{p}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-[12px] font-semibold text-[#991b1b] uppercase tracking-wide mb-1">Cons</p>
                                <ul className="space-y-1">
                                  {currentConcept.cons.map((c, i) => (
                                    <li key={i} className="text-[13px] text-[#991b1b] bg-[#fef2f2] rounded px-2 py-1">{c}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div className="border-l-2 border-[#E8713A] pl-3">
                              <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Delight Moment</p>
                              <p className="text-[13px] text-[#4b5563] italic">{currentConcept.delightMoment}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <HelpCircle className="w-4 h-4 text-[#6b7280] mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Stakeholder Question</p>
                                <p className="text-[13px] text-[#18181b] font-semibold">{currentConcept.stakeholderQuestion}</p>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Action buttons */}
                    <div className="pb-4 flex gap-2">
                      {selectedConcept === currentConcept.name ? (
                        <Button variant="outline" className="flex-1 border-[#E8713A] bg-[#E8713A] text-white hover:bg-[#d4632e]" disabled>
                          <Check className="w-4 h-4 mr-1.5" />Selected
                        </Button>
                      ) : (
                        <Button variant="outline" className="flex-1 border-[#E8713A] text-[#E8713A] hover:bg-[#E8713A]/5" onClick={() => handleSelectConcept(currentConcept.name)}>
                          Select this concept
                        </Button>
                      )}

                      {/* Open wireframe preview for Figma capture */}
                      <a
                        href={`/preview/${featureId}/${activeTab}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="w-4 h-4 mr-1.5" />
                          Open Preview
                        </Button>
                      </a>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL (40%) — Chat */}
        <div className="w-[40%] flex flex-col bg-[#fafafa]">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb] bg-white">
            <h2 className="text-[13px] font-semibold text-[#18181b]">Design Chat</h2>
            <p className="text-[11px] text-[#9ca3af]">Discuss concepts with the AI designer</p>
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
