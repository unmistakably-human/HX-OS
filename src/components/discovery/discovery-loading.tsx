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

export function DiscoveryLoading() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[400px]">
        <Loader2 className="w-10 h-10 text-[#E8713A] animate-spin mx-auto mb-6" />
        <div className="text-[16px] font-medium text-[#111827] mb-2">
          Building your insights deck
        </div>
        <div className="text-[13px] text-[#6b7280] animate-pulse">
          {STATUS_MESSAGES[msgIdx]}
        </div>
        <p className="text-[11px] text-[#9ca3af] mt-5">
          Typically 30–60 seconds
        </p>
      </div>
    </div>
  );
}
