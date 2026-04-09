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
}

export function DiscoveryLoading({ progress = 0 }: DiscoveryLoadingProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 5000);
    const clockTimer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      clearInterval(msgTimer);
      clearInterval(clockTimer);
    };
  }, []);

  const hasProgress = progress > 0;

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[400px]">
        <Loader2 className="w-10 h-10 text-action-primary-bg animate-spin mx-auto mb-6" strokeWidth={1.5} />
        <div className="text-[16px] font-medium text-content-heading mb-2">
          Building your insights deck
        </div>
        <div className="text-[13px] text-content-secondary animate-pulse mb-3">
          {STATUS_MESSAGES[msgIdx]}
        </div>

        {hasProgress && (
          <div className="mb-3">
            <div className="w-64 h-1.5 bg-divider rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-action-primary-bg rounded-full transition-all duration-500"
                style={{ width: `${Math.min((progress / 12000) * 100, 95)}%` }}
              />
            </div>
            <div className="text-[11px] text-content-muted mt-1.5">
              {Math.round(progress / 1000)}k chars generated
            </div>
          </div>
        )}

        <p className="text-[11px] text-content-muted">
          {elapsed}s elapsed — typically takes 30–90 seconds
        </p>
      </div>
    </div>
  );
}
