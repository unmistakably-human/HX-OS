import type { ReactNode } from "react";

interface SurfaceProps {
  children: ReactNode;
  title?: string;
}

export function Surface({ children, title }: SurfaceProps) {
  return (
    <div className="bg-[#f4f4f5] rounded-xl p-4 mb-2">
      {title && (
        <div className="text-[13px] font-medium text-[#E8713A] mb-1">
          {title}
        </div>
      )}
      <div className="text-[12px] text-[#6b7280] leading-relaxed">
        {children}
      </div>
    </div>
  );
}
