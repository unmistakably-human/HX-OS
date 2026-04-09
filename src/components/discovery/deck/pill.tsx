import type { ReactNode } from "react";

const TAG_COLORS = [
  { bg: "#EEEDFE", fg: "#3C3489" },
  { bg: "#E1F5EE", fg: "#085041" },
  { bg: "#FAECE7", fg: "#712B13" },
  { bg: "#E6F1FB", fg: "#0C447C" },
  { bg: "#FAEEDA", fg: "#633806" },
  { bg: "#FBEAF0", fg: "#72243E" },
];

interface PillProps {
  children: ReactNode;
  colorIndex?: number;
}

export function Pill({ children, colorIndex = 0 }: PillProps) {
  const c = TAG_COLORS[colorIndex % 6];
  return (
    <span
      className="inline-block text-[10px] px-2 py-0.5 rounded-md font-medium mr-1 mb-0.5"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}
