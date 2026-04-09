import type { ReactNode } from "react";

const TAG_COLORS = [
  { bg: "bg-hx-purple/10", fg: "text-hx-purple" },
  { bg: "bg-hx-green-light", fg: "text-hx-green-dark" },
  { bg: "bg-feedback-warning-bg", fg: "text-feedback-warning-text" },
  { bg: "bg-hx-blue-light", fg: "text-hx-blue" },
  { bg: "bg-feedback-warning-bg", fg: "text-feedback-warning-text" },
  { bg: "bg-hx-pink-light", fg: "text-hx-pink" },
];

interface PillProps {
  children: ReactNode;
  colorIndex?: number;
}

export function Pill({ children, colorIndex = 0 }: PillProps) {
  const c = TAG_COLORS[colorIndex % 6];
  return (
    <span
      className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mr-1 mb-0.5 ${c.bg} ${c.fg}`}
    >
      {children}
    </span>
  );
}
