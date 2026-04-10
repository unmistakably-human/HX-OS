import type { ReactNode } from "react";

interface PillProps {
  children: ReactNode;
  colorIndex?: number;
}

export function Pill({ children }: PillProps) {
  return (
    <span className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mr-1 mb-0.5 bg-[#f4f4f5] text-[#4b5563]">
      {children}
    </span>
  );
}
