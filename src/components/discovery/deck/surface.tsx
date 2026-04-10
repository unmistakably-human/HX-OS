import type { ReactNode } from "react";

interface SurfaceProps {
  children: ReactNode;
  title?: string;
}

export function Surface({ children, title }: SurfaceProps) {
  return (
    <div className="bg-surface-subtle rounded-[8px] p-4 mb-2">
      {title && (
        <div className="text-sm font-medium text-content-heading mb-1">
          {title}
        </div>
      )}
      <div className="text-sm text-content-secondary leading-relaxed">
        {children}
      </div>
    </div>
  );
}
