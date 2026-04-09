"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface ExpandableCardProps {
  label: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function ExpandableCard({ label, title, children, defaultOpen = false }: ExpandableCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      onClick={() => setOpen((v) => !v)}
      className={`bg-white border rounded-[8px] px-4 py-3.5 mb-2 cursor-pointer transition-colors ${
        open ? "border-content-heading/40" : "border-divider hover:border-divider"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium text-content-heading mb-0.5">
            {label}
          </div>
          <div className="text-[13px] font-medium text-content-heading leading-snug">
            {title}
          </div>
        </div>
        <ChevronDown
          strokeWidth={1.5}
          className={`w-4 h-4 text-content-muted shrink-0 mt-1 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>
      {open && (
        <div className="mt-2.5 pt-2.5 border-t border-divider-light text-[12px] text-content-secondary leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}
