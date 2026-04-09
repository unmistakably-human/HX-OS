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
      className={`bg-white border rounded-xl px-4 py-3.5 mb-2 cursor-pointer transition-colors ${
        open ? "border-[#E8713A]/40" : "border-[#e5e7eb] hover:border-[#d1d5db]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium text-[#E8713A] mb-0.5">
            {label}
          </div>
          <div className="text-[13px] font-medium text-[#111827] leading-snug">
            {title}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#9ca3af] shrink-0 mt-1 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>
      {open && (
        <div className="mt-2.5 pt-2.5 border-t border-[#f3f4f6] text-[12px] text-[#6b7280] leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}
