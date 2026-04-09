import { ReactNode } from "react";

interface PhaseHeaderProps {
  title: string;
  subtitle?: string;
  step?: { current: number; total: number };
  actions?: ReactNode;
}

export function PhaseHeader({ title, subtitle, step, actions }: PhaseHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-5 py-2.5">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-[16px] font-bold text-[#111827]">{title}</h1>
          {subtitle && (
            <p className="text-[12px] text-[#9ca3af] mt-0.5">{subtitle}</p>
          )}
        </div>
        {step && (
          <div className="flex items-center gap-2 ml-4">
            <span className="text-[12px] font-medium text-[#6b7280]">
              {step.current}/{step.total}
            </span>
            <div className="w-24 h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3b82f6] rounded-full transition-all duration-300"
                style={{
                  width: `${(step.current / step.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
