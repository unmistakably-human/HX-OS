"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PhaseHeader } from "@/components/phase-header";
import { ChatPanel } from "@/components/chat-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowLeft,
  Link as LinkIcon,
  Image as ImageIcon,
  SquareCheckBig,
  XCircle,
} from "lucide-react";
import type { ChatMessage, ReviewResult, ReviewIssue } from "@/lib/types";

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface ReviewClientProps {
  productId: string;
  featureId?: string;
  featureName?: string;
}

interface FigmaFrame {
  nodeId: string;
  name: string;
  thumbnailUrl: string;
}

interface ReviewTypeOption {
  id: string;
  icon: string;
  name: string;
  description: string;
}

type Phase = "import" | "select-type" | "loading" | "results";

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

const REVIEW_TYPES: ReviewTypeOption[] = [
  {
    id: "audit-ui",
    icon: "\uD83C\uDFA8",
    name: "Audit UI",
    description: "Check visual consistency, spacing, and layout alignment",
  },
  {
    id: "accessibility",
    icon: "\u267F",
    name: "Accessibility",
    description: "Evaluate contrast, labels, touch targets, and WCAG compliance",
  },
  {
    id: "copy-review",
    icon: "\uD83D\uDCAC",
    name: "Copy Review",
    description: "Assess microcopy clarity, tone, and actionable language",
  },
  {
    id: "edge-cases",
    icon: "\uD83D\uDEA7",
    name: "Edge Cases",
    description: "Find empty states, error paths, and boundary conditions",
  },
  {
    id: "ux-critique",
    icon: "\uD83E\uDDE0",
    name: "UX Critique",
    description: "Evaluate flows, cognitive load, and user mental models",
  },
  {
    id: "new-ideas",
    icon: "\uD83D\uDCA1",
    name: "New Ideas",
    description: "Generate creative improvements and feature suggestions",
  },
  {
    id: "quick-ds-check",
    icon: "\u26A1",
    name: "Quick DS Check",
    description: "Verify design system token usage and component consistency",
  },
];

const LOADING_STEPS = [
  "Analyzing frames...",
  "Checking brand compliance...",
  "Evaluating design patterns...",
  "Scoring dimensions...",
  "Generating recommendations...",
];

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function getScoreBarColor(score: number): string {
  if (score >= 7) return "bg-hx-green";
  if (score >= 5) return "bg-hx-amber";
  return "bg-hx-red";
}

function getSeverityClasses(severity: ReviewIssue["severity"]): {
  bg: string;
  text: string;
} {
  switch (severity) {
    case "HIGH":
      return { bg: "bg-feedback-error-bg", text: "text-feedback-error-text" };
    case "MEDIUM":
      return { bg: "bg-feedback-warning-bg", text: "text-feedback-warning-text" };
    case "LOW":
      return { bg: "bg-surface-subtle", text: "text-content-secondary" };
  }
}

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

export function ReviewClient({
  productId,
  featureId,
  featureName,
}: ReviewClientProps) {
  // ── Phase state ──
  const [phase, setPhase] = useState<Phase>("import");

  // ── Phase 1: Frame import ──
  const [figmaUrl, setFigmaUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [frames, setFrames] = useState<FigmaFrame[]>([]);
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(
    new Set()
  );

  // ── Phase 2: Review type ──
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // ── Phase 3: Loading ──
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  // ── Phase 4: Results ──
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // ── Chat panel ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreamText, setChatStreamText] = useState("");
  const [chatWidth, setChatWidth] = useState(400);
  const isDragging = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Derived ──
  const allSelected = frames.length > 0 && selectedFrameIds.size === frames.length;
  const someSelected = selectedFrameIds.size > 0;

  // ── Load existing review on mount ──
  useEffect(() => {
    if (!featureId) return;
    let cancelled = false;

    async function loadFeature() {
      try {
        const res = await fetch(
          `/api/products/${productId}/features/${featureId}`
        );
        if (!res.ok || cancelled) return;
        const feat = await res.json();
        if (feat.review_result) {
          setReviewResult(feat.review_result);
          setPhase("results");
        }
        if (Array.isArray(feat.review_chat_messages) && feat.review_chat_messages.length > 0) {
          setChatMessages(feat.review_chat_messages);
        }
      } catch {
        // Silently continue — fresh review
      }
    }

    loadFeature();
    return () => { cancelled = true; };
  }, [productId, featureId]);

  // ── Abort in-flight requests on unmount ──
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ── Loading step rotation ──
  useEffect(() => {
    if (phase !== "loading") return;
    setLoadingStepIndex(0);
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) =>
        prev < LOADING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Resize drag handler (same pattern as HiFi page) ──
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startWidth = chatWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = startX - ev.clientX;
        const newWidth = Math.min(
          Math.max(startWidth + delta, 280),
          window.innerWidth - 500
        );
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
    },
    [chatWidth]
  );

  // ═══════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════

  /** Phase 1: Import frames from Figma URL */
  const handleImportFrames = useCallback(async () => {
    if (!figmaUrl.trim()) return;
    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch(`/api/products/${productId}/figma-frames`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaUrl: figmaUrl.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || `Import failed (${res.status})`
        );
      }

      const data: FigmaFrame[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No frames found in the provided Figma URL");
      }

      setFrames(data);
      setSelectedFrameIds(new Set(data.map((f) => f.nodeId)));
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import frames"
      );
    } finally {
      setImporting(false);
    }
  }, [figmaUrl, productId]);

  /** Toggle frame selection */
  const toggleFrame = useCallback((nodeId: string) => {
    setSelectedFrameIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  /** Select / clear all frames */
  const handleSelectAll = useCallback(() => {
    setSelectedFrameIds(new Set(frames.map((f) => f.nodeId)));
  }, [frames]);

  const handleClearAll = useCallback(() => {
    setSelectedFrameIds(new Set());
  }, []);

  /** Proceed to review type selection */
  const handleProceedToType = useCallback(() => {
    if (selectedFrameIds.size === 0) return;
    setPhase("select-type");
  }, [selectedFrameIds]);

  /** Phase 3 + 4: Run the audit */
  const handleRunAudit = useCallback(async () => {
    if (!selectedType) return;
    setPhase("loading");
    setReviewError(null);

    try {
      // Fetch base64 frame data for selected frames
      const framesRes = await fetch(
        `/api/products/${productId}/figma-frames`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            figmaUrl: figmaUrl.trim(),
            selectedNodeIds: Array.from(selectedFrameIds),
          }),
        }
      );

      if (!framesRes.ok) {
        const err = await framesRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch frame images");
      }

      const frameData = await framesRes.json();

      // Run review
      const reviewRes = await fetch(
        `/api/products/${productId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frames: frameData,
            reviewType: selectedType,
            featureId: featureId || undefined,
          }),
        }
      );

      if (!reviewRes.ok) {
        const err = await reviewRes.json().catch(() => ({}));
        throw new Error(err.error || "Review failed");
      }

      const result: ReviewResult = await reviewRes.json();
      setReviewResult(result);
      setPhase("results");

      // Persist to feature if applicable
      if (featureId) {
        await fetch(`/api/products/${productId}/features/${featureId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_result: result,
            phase_review: "complete",
          }),
        }).catch(() => {});
      }
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Review failed"
      );
      setPhase("select-type");
    }
  }, [selectedType, productId, figmaUrl, selectedFrameIds, featureId]);

  /** Go back to frame selection from results */
  const handleRunAnother = useCallback(() => {
    setReviewResult(null);
    setSelectedType(null);
    setPhase("import");
  }, []);

  /** Chat send handler */
  const handleChatSend = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        role: "user",
        content,
        timestamp: Date.now(),
      };
      const updatedMessages = [...chatMessages, userMsg];
      setChatMessages(updatedMessages);
      setChatLoading(true);
      setChatStreamText("");

      try {
        abortRef.current = new AbortController();

        // Build chat endpoint based on feature context
        const chatUrl = featureId
          ? `/api/products/${productId}/features/${featureId}/chat`
          : `/api/products/${productId}/review/chat`;

        const res = await fetch(chatUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
            context: reviewResult
              ? { reviewResult, reviewType: selectedType }
              : undefined,
          }),
          signal: abortRef.current.signal,
        });

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
              // skip malformed chunks
            }
          }
        }

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: fullText,
          timestamp: Date.now(),
        };
        const finalMessages = [...updatedMessages, assistantMsg];
        setChatMessages(finalMessages);
        setChatStreamText("");

        // Persist chat messages to feature if applicable
        if (featureId) {
          await fetch(
            `/api/products/${productId}/features/${featureId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                review_chat_messages: finalMessages,
              }),
            }
          ).catch(() => {});
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Review chat error:", err);
        }
      }
      setChatLoading(false);
    },
    [chatMessages, productId, featureId, reviewResult, selectedType]
  );

  // ═══════════════════════════════════════════════════
  // SUB-RENDERS
  // ═══════════════════════════════════════════════════

  /** Phase 1: Figma URL input + frame picker */
  const renderImportPhase = useMemo(() => {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* URL Input */}
        <div className="max-w-2xl space-y-3">
          <label className="text-body-sm font-medium text-content-heading">
            Figma File URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted"
                strokeWidth={1.5}
              />
              <Input
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/design/..."
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleImportFrames();
                }}
              />
            </div>
            <Button
              onClick={handleImportFrames}
              disabled={!figmaUrl.trim() || importing}
            >
              {importing ? (
                <Loader2
                  className="w-4 h-4 animate-spin"
                  strokeWidth={1.5}
                />
              ) : (
                <ImageIcon className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              )}
              Import Frames
            </Button>
          </div>
          {importError && (
            <p className="text-body-sm text-feedback-error-text flex items-center gap-1.5">
              <XCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {importError}
            </p>
          )}
        </div>

        {/* Frame grid */}
        {frames.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-content-secondary">
                {frames.length} frame{frames.length !== 1 ? "s" : ""} found
                {someSelected && (
                  <span className="ml-2 text-content-muted">
                    ({selectedFrameIds.size} selected)
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={allSelected}
                >
                  <SquareCheckBig
                    className="w-3.5 h-3.5 mr-1"
                    strokeWidth={1.5}
                  />
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={!someSelected}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {frames.map((frame) => {
                const isSelected = selectedFrameIds.has(frame.nodeId);
                return (
                  <button
                    key={frame.nodeId}
                    type="button"
                    onClick={() => toggleFrame(frame.nodeId)}
                    className={`group relative rounded-lg border p-2 transition-all text-left ${
                      isSelected
                        ? "border-action-primary-bg bg-surface-card shadow-sm"
                        : "border-divider bg-surface-page-alt hover:border-divider-card-hover hover:bg-surface-card"
                    }`}
                  >
                    {/* Checkbox overlay */}
                    <div className="absolute top-3 right-3 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFrame(frame.nodeId)}
                      />
                    </div>

                    {/* Thumbnail */}
                    <div className="aspect-[4/3] rounded-md overflow-hidden bg-surface-subtle mb-2">
                      <img
                        src={frame.thumbnailUrl}
                        alt={frame.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Frame name */}
                    <p className="text-xs text-content-secondary truncate">
                      {frame.name}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Proceed button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleProceedToType}
                disabled={!someSelected}
              >
                Continue with {selectedFrameIds.size} Frame
                {selectedFrameIds.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Empty state when no URL entered */}
        {frames.length === 0 && !importing && !importError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-subtle flex items-center justify-center mb-4">
              <ImageIcon
                className="w-6 h-6 text-content-muted"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-body-sm text-content-secondary mb-1">
              Paste a Figma file URL to get started
            </p>
            <p className="text-xs text-content-muted max-w-sm">
              We will extract all top-level frames so you can choose which ones
              to include in the design review.
            </p>
          </div>
        )}
      </div>
    );
  }, [
    figmaUrl,
    importing,
    importError,
    frames,
    selectedFrameIds,
    someSelected,
    allSelected,
    handleImportFrames,
    handleSelectAll,
    handleClearAll,
    handleProceedToType,
    toggleFrame,
  ]);

  /** Phase 2: Review type cards */
  const renderSelectTypePhase = useMemo(() => {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPhase("import")}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Button>
          <div>
            <h3 className="text-body-sm font-semibold text-content-heading">
              Choose Review Type
            </h3>
            <p className="text-xs text-content-muted">
              {selectedFrameIds.size} frame
              {selectedFrameIds.size !== 1 ? "s" : ""} selected
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {REVIEW_TYPES.map((type) => {
            const isActive = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                  isActive
                    ? "border-action-primary-bg bg-action-primary-bg/10"
                    : "border-divider bg-surface-card hover:border-divider-card-hover hover:bg-surface-card-hover"
                }`}
              >
                <span className="text-xl leading-none mt-0.5">{type.icon}</span>
                <div className="min-w-0">
                  <p
                    className={`text-body-sm font-medium ${
                      isActive
                        ? "text-content-heading"
                        : "text-content-secondary"
                    }`}
                  >
                    {type.name}
                  </p>
                  <p className="text-xs text-content-muted mt-0.5 leading-relaxed">
                    {type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {reviewError && (
          <p className="text-body-sm text-feedback-error-text flex items-center gap-1.5">
            <XCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            {reviewError}
          </p>
        )}

        <div className="flex justify-end max-w-2xl pt-2">
          <Button onClick={handleRunAudit} disabled={!selectedType}>
            Run Audit
          </Button>
        </div>
      </div>
    );
  }, [selectedType, selectedFrameIds, reviewError, handleRunAudit]);

  /** Phase 3: Loading / analysis in progress */
  const renderLoadingPhase = useMemo(() => {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        <Loader2
          className="w-8 h-8 text-action-primary-bg animate-spin"
          strokeWidth={1.5}
        />
        <div className="text-center space-y-2">
          <p className="text-body-sm font-medium text-content-heading">
            {LOADING_STEPS[loadingStepIndex]}
          </p>
          <p className="text-xs text-content-muted">
            This usually takes 20-40 seconds
          </p>
        </div>
        {/* Indeterminate progress bar */}
        <div className="w-64 h-1.5 bg-surface-subtle rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-action-primary-bg rounded-full animate-indeterminate-bar" />
        </div>
      </div>
    );
  }, [loadingStepIndex]);

  /** Phase 4: Results display */
  const renderResultsPhase = useMemo(() => {
    if (!reviewResult) return null;

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Score card */}
        <div className="rounded-lg border border-divider bg-surface-card p-6 space-y-5">
          <div className="flex items-start gap-5">
            {/* Large score */}
            <div className="flex flex-col items-center shrink-0">
              <span
                className={`text-4xl font-bold ${
                  reviewResult.overallScore >= 7
                    ? "text-hx-green"
                    : reviewResult.overallScore >= 5
                      ? "text-hx-amber"
                      : "text-hx-red"
                }`}
              >
                {reviewResult.overallScore}
              </span>
              <span className="text-xs text-content-muted">/10</span>
            </div>

            {/* Summary */}
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-content-secondary leading-relaxed">
                {reviewResult.summary}
              </p>
            </div>
          </div>

          {/* Dimension bars */}
          {reviewResult.dimensions.length > 0 && (
            <div className="space-y-3 pt-2">
              {reviewResult.dimensions.map((dim) => (
                <div key={dim.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-content-secondary">
                      {dim.name}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        dim.score >= 7
                          ? "text-hx-green"
                          : dim.score >= 5
                            ? "text-hx-amber"
                            : "text-hx-red"
                      }`}
                    >
                      {dim.score}/10
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(dim.score)}`}
                      style={{ width: `${(dim.score / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible sections */}
        <Accordion defaultValue={["strengths", "issues", "ideas"]}>
          {/* Strengths */}
          {reviewResult.strengths.length > 0 && (
            <AccordionItem value="strengths">
              <AccordionTrigger className="text-sm font-semibold text-content-heading">
                Strengths ({reviewResult.strengths.length})
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2 pt-1">
                  {reviewResult.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle
                        className="w-4 h-4 text-hx-green shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                      <span className="text-body-sm text-content-secondary leading-relaxed">
                        {strength}
                      </span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Issues */}
          {reviewResult.issues.length > 0 && (
            <AccordionItem value="issues">
              <AccordionTrigger className="text-sm font-semibold text-content-heading">
                Issues ({reviewResult.issues.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-1">
                  {reviewResult.issues.map((issue, i) => {
                    const severity = getSeverityClasses(issue.severity);
                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-divider bg-surface-page-alt p-4 space-y-2"
                      >
                        {/* Severity badge + problem */}
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${severity.bg} ${severity.text}`}
                          >
                            {issue.severity}
                          </span>
                          <p className="text-body-sm font-medium text-content-heading leading-relaxed">
                            {issue.problem}
                          </p>
                        </div>

                        {/* Why */}
                        <p className="text-xs text-content-muted leading-relaxed pl-[calc(theme(spacing.2.5)+theme(spacing.2))]">
                          {issue.why}
                        </p>

                        {/* Fix suggestion */}
                        <div className="rounded-md bg-feedback-success-bg/50 border border-feedback-success-border/30 px-3 py-2 ml-[calc(theme(spacing.2.5)+theme(spacing.2))]">
                          <p className="text-xs text-content-secondary leading-relaxed">
                            <span className="font-medium text-feedback-success-text">
                              Fix:
                            </span>{" "}
                            {issue.fix}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Redesign Ideas */}
          {reviewResult.ideas.length > 0 && (
            <AccordionItem value="ideas">
              <AccordionTrigger className="text-sm font-semibold text-content-heading">
                Redesign Ideas ({reviewResult.ideas.length})
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2 pt-1">
                  {reviewResult.ideas.map((idea, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Lightbulb
                        className="w-4 h-4 text-hx-amber shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                      <span className="text-body-sm text-content-secondary leading-relaxed">
                        {idea}
                      </span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Run Another button */}
        <div className="flex justify-center pt-2 pb-4">
          <Button variant="outline" onClick={handleRunAnother}>
            <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
            Run Another Review
          </Button>
        </div>
      </div>
    );
  }, [reviewResult, handleRunAnother]);

  // ═══════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════

  const phaseContent = (() => {
    switch (phase) {
      case "import":
        return renderImportPhase;
      case "select-type":
        return renderSelectTypePhase;
      case "loading":
        return renderLoadingPhase;
      case "results":
        return renderResultsPhase;
    }
  })();

  return (
    <div className="flex flex-col h-full">
      <PhaseHeader
        title="Design Review"
        subtitle={featureName || "Audit your designs with AI"}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="flex-1 min-w-[400px] flex flex-col overflow-hidden border-r border-divider">
          {phaseContent}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          className="w-1 cursor-col-resize hover:bg-action-primary-bg/20 active:bg-action-primary-bg/30 transition-colors shrink-0"
        />

        {/* RIGHT PANEL — Chat */}
        <div
          className="flex flex-col bg-surface-page-alt shrink-0"
          style={{ width: chatWidth, minWidth: 280 }}
        >
          <div className="px-4 py-2.5 border-b border-divider bg-surface-card">
            <h2 className="text-body-sm font-semibold text-content-heading">
              Review Chat
            </h2>
            <p className="text-overline text-content-muted">
              Ask follow-up questions about the review
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              messages={chatMessages}
              onSend={handleChatSend}
              loading={chatLoading}
              streamingText={chatStreamText}
              placeholder="Ask about findings or request deeper analysis..."
              suggestions={[
                "Explain the top issue in detail",
                "How to fix accessibility gaps?",
                "What would improve the score?",
                "Compare against best practices",
                "Prioritize the fixes for me",
                "Generate a handoff checklist",
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
