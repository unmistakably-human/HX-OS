import { ReactNode } from "react";

interface PhaseHeaderProps {
  title: string;
  subtitle?: string;
  step?: { current: number; total: number };
  actions?: ReactNode;
}

export function PhaseHeader({ title, subtitle, step, actions }: PhaseHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-divider bg-surface-card px-5 py-2.5">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-content-heading">{title}</h1>
          {subtitle && (
            <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {step && (
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs font-medium text-content-secondary">
              {step.current}/{step.total}
            </span>
            <div className="w-24 h-1.5 bg-surface-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-action-primary-bg rounded-full transition-all duration-slow"
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
