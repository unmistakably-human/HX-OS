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
import { Loader2, Check, Copy, ArrowRight } from "lucide-react";
import type { HifiDesign, ChatMessage, Feature } from "@/lib/types";

export default function HifiPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const router = useRouter();
  const productId = params.productId;
  const featureId = params.featureId;

  const [designs, setDesigns] = useState<HifiDesign[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreamText, setChatStreamText] = useState("");
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<"loading" | "ready">("loading");
  const [platform, setPlatform] = useState<string>("responsive");
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

  // Load feature + product data (fast — no generation)
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
          setChatMessages(feat.hifi_chat_messages || []);
          setSelectedDesign(feat.chosen_hifi || null);
          if (Array.isArray(feat.hifi_designs) && feat.hifi_designs.length > 0) {
            setDesigns(feat.hifi_designs);
          }
        }
        if (pRes.ok) {
          const prod = await pRes.json();
          if (prod.product_context?.platform) setPlatform(prod.product_context.platform);
        }
      } catch {
        // ignore
      }
      setLoadingState("ready");
    }
    load();
  }, [productId, featureId]);

  // Auto-trigger generation AFTER loading completes, if no designs exist
  useEffect(() => {
    if (loadingState === "ready" && designs.length === 0 && !generating && feature) {
      generateDesigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState, designs.length, feature]);

  const generateDesigns = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/products/${productId}/features/${featureId}/hifi`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setDesigns(data);
        setActiveTab(0);
      }
    } catch (err) {
      console.error("HiFi design generation failed:", err);
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
          body: JSON.stringify({ hifi_chat_messages: finalMessages }),
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

  const handleSelectDesign = useCallback(
    async (designName: string) => {
      setSelectedDesign(designName);
      await fetch(`/api/products/${productId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosen_hifi: designName, phase_hifi: "complete", phase_review: "active" }),
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

  const currentDesign = designs[activeTab];

  return (
    <div className="flex flex-col h-full">
      <PhaseHeader
        title="High Fidelity"
        subtitle={feature?.name || "HiFi Designs"}
        actions={
          designs.length > 0 ? (
            <Button
              size="sm"
              onClick={async () => {
                await fetch(`/api/products/${productId}/features/${featureId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ phase_hifi: "complete", phase_review: "active" }),
                });
                router.push(`/products/${productId}/features/${featureId}/review`);
              }}
              className="text-xs h-8"
            >
              Start Review <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL — fills remaining space */}
        <div className="flex-1 min-w-[400px] flex flex-col overflow-hidden border-r border-divider">
          {designs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-6 h-6 text-action-primary-bg animate-spin" strokeWidth={1.5} />
              <p className="text-sm text-content-secondary">Generating high-fidelity designs...</p>
              <p className="text-xs text-content-muted">This takes 30-60 seconds</p>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex flex-wrap gap-1 px-4 pt-3 pb-0 border-b border-divider">
                {designs.map((design, i) => {
                  const isActive = i === activeTab;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-body-sm transition-colors relative ${
                        isActive ? "font-semibold text-content-heading" : "text-content-tertiary hover:text-content-secondary"
                      }`}
                    >
                      {design.name}
                      {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-action-primary-bg" />}
                    </button>
                  );
                })}
              </div>

              {/* Design content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentDesign && (
                  <>
                    {/* Compact Figma copy button — top right */}
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
                    </div>

                    {/* Adaptive frame — mobile (375px centered) or desktop (full width), hugs content */}
                    <div
                      id="wireframe-render"
                      className={`border border-divider rounded-lg overflow-x-hidden ${
                        ["ios", "android", "iosAndroid", "mobile"].includes(platform)
                          ? "mx-auto"
                          : ""
                      }`}
                      style={{
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        ...(["ios", "android", "iosAndroid", "mobile"].includes(platform)
                          ? { width: 375, maxWidth: 375 }
                          : {}),
                      }}
                      dangerouslySetInnerHTML={{ __html: currentDesign.htmlContent }}
                    />

                    <Accordion>
                      <AccordionItem value="details">
                        <AccordionTrigger className="text-sm text-content-secondary">Details</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div>
                              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-1">Description</p>
                              <p className="text-sm text-content-secondary">{currentDesign.description}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-1">Priorities</p>
                              <p className="text-sm text-content-secondary">{currentDesign.priorities}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-1">Tradeoffs</p>
                              <p className="text-sm text-content-secondary">{currentDesign.tradeoffs}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
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
            <p className="text-overline text-content-muted">Discuss designs with the AI designer</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              messages={chatMessages}
              onSend={handleChatSend}
              loading={chatLoading}
              streamingText={chatStreamText}
              placeholder="Ask about a design or request changes..."
              suggestions={[
                "Improve visual hierarchy",
                "Make it more brand-aligned",
                "Increase information density",
                "Simplify the layout",
                "Add micro-interactions",
                "Optimize for mobile",
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
