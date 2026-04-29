"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const STATUS_MESSAGES = [
  "Analyzing brief...",
  "Researching category...",
  "Mapping audiences...",
  "Benchmarking globally...",
  "Evaluating conversion...",
  "Comparing features...",
  "Cross-category scan...",
  "Identifying opportunities...",
  "Building glossary...",
  "Assembling deck...",
];

interface DiscoveryLoadingProps {
  progress?: number;
  snippets?: string[];
}

export function DiscoveryLoading({ progress = 0, snippets = [] }: DiscoveryLoadingProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [snippetIdx, setSnippetIdx] = useState(0);

  // Rotate status messages every 5 seconds
  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 5000);
    return () => clearInterval(msgTimer);
  }, []);

  // Rotate insight snippets every 10 seconds. Initial index is 0 (from useState).
  // When snippets.length changes mid-stream, the modulo on render keeps the
  // visible snippet in range without a synchronous reset in the effect body.
  useEffect(() => {
    if (snippets.length === 0) return;
    const snippetTimer = setInterval(() => {
      setSnippetIdx((i) => (i + 1) % snippets.length);
    }, 10000);
    return () => clearInterval(snippetTimer);
  }, [snippets.length]);

  const currentSnippet = snippets.length > 0 ? snippets[snippetIdx % snippets.length] : null;

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[400px]">
        <Loader2 className="w-10 h-10 text-action-primary-bg animate-spin mx-auto mb-6" strokeWidth={1.5} />
        <div className="text-base font-medium text-content-heading mb-2">
          Building your insights deck
        </div>
        <div className="text-body-sm text-content-secondary animate-pulse mb-4">
          {STATUS_MESSAGES[msgIdx]}
        </div>

        {/* Progress bar — always visible, no numbers */}
        <div className="mb-4">
          <div className="w-64 h-1.5 bg-divider rounded-full mx-auto overflow-hidden">
            {progress > 0 ? (
              <div
                className="h-full bg-action-primary-bg rounded-full transition-all duration-500"
                style={{ width: `${Math.min((progress / 12000) * 100, 95)}%` }}
              />
            ) : (
              <div className="h-full w-1/3 bg-action-primary-bg rounded-full animate-indeterminate-bar" />
            )}
          </div>
        </div>

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
