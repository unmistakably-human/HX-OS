"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface DiscoveryBriefInputProps {
  enrichedPcd: string;
  onGenerate: (brief: string) => void;
  error: string | null;
}

const DELIVERABLES = [
  "Category insights (5)",
  "Audience segments (5)",
  "UX benchmarking (global)",
  "Conversion & retention",
  "Feature benchmark: local vs. global",
  "Cross-category inspiration (5)",
  "Opportunity areas (5)",
  "Global reference glossary",
];

export function DiscoveryBriefInput({
  enrichedPcd,
  onGenerate,
  error,
}: DiscoveryBriefInputProps) {
  const [brief, setBrief] = useState(enrichedPcd);
  const wordCount = brief.split(/\s+/).filter(Boolean).length;
  const ready = brief.trim().length > 0;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6">
      <div className="max-w-[700px] mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-[8px] bg-action-primary-bg/10 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-action-primary-bg" strokeWidth={1.5} />
          </div>
          <h2 className="text-[20px] font-bold text-content-heading mb-1.5">
            Brief to Insights Deck
          </h2>
          <p className="text-[14px] text-content-secondary max-w-md mx-auto leading-relaxed">
            Review the enriched PCD below, then generate a structured insights
            deck with global benchmarking.
          </p>
        </div>

        {/* Brief card */}
        <div className="bg-white border border-divider rounded-[8px] p-5 mb-4">
          <label className="block text-[12px] font-medium text-content-secondary mb-2">
            Product context (editable)
          </label>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            className="min-h-[140px] bg-surface-subtle text-[14px] leading-relaxed resize-y"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-[11px] text-content-muted">
              {wordCount > 0 ? `${wordCount} words` : "Paste or edit your brief"}
            </span>
            <Button
              onClick={() => onGenerate(brief.trim())}
              disabled={!ready}
              className="bg-action-primary-bg hover:bg-action-primary-hover text-action-primary-text px-6 rounded-md"
            >
              Generate insights deck
              <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-[13px] text-red-800">
            {error}
          </div>
        )}

        {/* Deliverables preview */}
        <div className="mt-6">
          <div className="text-[12px] font-medium text-content-secondary mb-2.5">
            What you will get
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DELIVERABLES.map((x, i) => (
              <div
                key={i}
                className="bg-surface-page-alt rounded-lg px-3 py-2 text-[12px] text-content-secondary"
              >
                {x}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
