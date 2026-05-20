"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const STATUS_MESSAGES_PER_ACT: Record<number, string[]> = {
  1: [
    "Reading the brief…",
    "Researching the client…",
    "Mapping the surfaces in scope…",
    "Reading the category…",
  ],
  2: [
    "Mapping the audience…",
    "Walking the customer journey…",
    "Listening for what trips users up…",
    "Mining forums and reviews for real complaints…",
  ],
  3: [
    "Pulling the competitor set…",
    "Reading what each competitor does well…",
    "Drawing the feature heatmap…",
    "Plotting the positioning map…",
  ],
  4: [
    "Synthesising ideas to pressure-test…",
    "Surfacing the live tensions…",
    "Mapping KPIs to design moves…",
    "Reaching outside the category for delighters…",
    "Drafting the kickoff agenda…",
  ],
};

const FALLBACK_MESSAGES = [
  "Analysing brief…",
  "Building your insights deck…",
  "Assembling deck…",
];

interface DiscoveryLoadingProps {
  progress?: number;
  snippets?: string[];
  actLabel?: string;
  actNumber?: number;
  actTotal?: number;
  // The expected total character count for this Act — used to scale the
  // per-Act progress bar so it doesn't appear stuck.
  actMaxChars?: number;
}

export function DiscoveryLoading({
  progress = 0,
  snippets = [],
  actLabel,
  actNumber,
  actTotal,
  actMaxChars,
}: DiscoveryLoadingProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [snippetIdx, setSnippetIdx] = useState(0);

  const messages = actNumber && STATUS_MESSAGES_PER_ACT[actNumber]
    ? STATUS_MESSAGES_PER_ACT[actNumber]
    : FALLBACK_MESSAGES;

  // We don't reset msgIdx when the act changes; the parent passes a key
  // tied to the current Act, so this component remounts and the state
  // starts at zero naturally.

  // Rotate status messages every 6 seconds
  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, messages.length - 1));
    }, 6000);
    return () => clearInterval(msgTimer);
  }, [messages.length]);

  // Rotate snippets every 10 seconds. Modulo on render keeps the visible
  // snippet in range when the array changes mid-stream.
  useEffect(() => {
    if (snippets.length === 0) return;
    const snippetTimer = setInterval(() => {
      setSnippetIdx((i) => (i + 1) % snippets.length);
    }, 10000);
    return () => clearInterval(snippetTimer);
  }, [snippets.length]);

  const currentSnippet = snippets.length > 0 ? snippets[snippetIdx % snippets.length] : null;

  // Compute progress fill. If we have a per-Act char target, scale to that;
  // otherwise indeterminate.
  const progressPct = actMaxChars && progress > 0
    ? Math.min((progress / actMaxChars) * 100, 95)
    : null;

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[440px]">
        <Loader2 className="w-10 h-10 text-action-primary-bg animate-spin mx-auto mb-6" strokeWidth={1.5} />
        <div className="text-base font-medium text-content-heading mb-2">
          {actLabel || "Building your insights deck"}
        </div>
        <div className="text-body-sm text-content-secondary animate-pulse mb-4">
          {messages[msgIdx]}
        </div>

        {/* Per-Act progress bar */}
        <div className="mb-4">
          <div className="w-72 h-1.5 bg-divider rounded-full mx-auto overflow-hidden">
            {progressPct !== null ? (
              <div
                className="h-full bg-action-primary-bg rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            ) : (
              <div className="h-full w-1/3 bg-action-primary-bg rounded-full animate-indeterminate-bar" />
            )}
          </div>
        </div>

        {/* Act-of-N pip indicator */}
        {actNumber && actTotal ? (
          <div className="flex justify-center gap-1.5 mb-4">
            {Array.from({ length: actTotal }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={`h-[6px] rounded-full transition-all duration-300 ${
                  n < actNumber
                    ? "w-5 bg-action-primary-bg/80"
                    : n === actNumber
                      ? "w-8 bg-action-primary-bg"
                      : "w-5 bg-divider"
                }`}
              />
            ))}
          </div>
        ) : null}

        {/* Real-time insight snippets */}
        {currentSnippet && (
          <div className="mt-4 px-4 py-3 bg-surface-subtle rounded-[8px] transition-opacity duration-500">
            <p className="text-xs text-content-secondary italic leading-relaxed">
              &ldquo;{currentSnippet}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
