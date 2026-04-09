"use client";

import Link from "next/link";
import { Check } from "lucide-react";

interface SidebarProps {
  currentPhase: string;
  phases: Record<string, "locked" | "active" | "complete">;
  projectId: string;
}

const PHASE_CONFIG = [
  {
    key: "context",
    num: "01",
    label: "Product Context",
    subtitle: "Define the product",
    href: (pid: string) => `/projects/${pid}/context`,
  },
  {
    key: "discovery",
    num: "02",
    label: "Discovery",
    subtitle: "Research & insights",
    href: (pid: string) => `/projects/${pid}/discovery`,
  },
  {
    key: "features",
    num: "03",
    label: "Feature Brief",
    subtitle: "Define what to build",
    href: (pid: string) => `/projects/${pid}/features`,
  },
  {
    key: "concepts",
    num: "04",
    label: "Concepts",
    subtitle: "Generate variations",
    href: (pid: string) => `/projects/${pid}/concepts`,
  },
];

export function Sidebar({ currentPhase, phases, projectId }: SidebarProps) {
  return (
    <aside className="w-[200px] min-h-screen bg-[#18181b] flex flex-col border-r border-[#27272a]">
      <div className="px-4 py-5 border-b border-[#27272a]">
        <div className="text-[15px] font-bold text-white">HumanX Studio</div>
        <div className="text-[10px] text-[#52525b] mt-0.5">
          AI Design Workflow
        </div>
      </div>

      <nav className="flex-1 py-2">
        {PHASE_CONFIG.map((phase) => {
          const state = phases[phase.key] || "locked";
          const isActive = currentPhase === phase.key;
          const isLocked = state === "locked";
          const isComplete = state === "complete";

          const content = (
            <div
              className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-colors ${
                isActive ? "bg-[#27272a]" : ""
              } ${isLocked ? "opacity-30 cursor-not-allowed" : "hover:bg-[#27272a]/50 cursor-pointer"}`}
            >
              <div
                className={`w-[26px] h-[26px] rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  isComplete
                    ? "bg-[#065f46] text-white"
                    : isActive
                      ? "bg-[#E8713A] text-white"
                      : "bg-[#3f3f46] text-[#71717a]"
                }`}
              >
                {isComplete ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  phase.num
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-white truncate">
                  {phase.label}
                </div>
                <div className="text-[10px] text-[#71717a] truncate">
                  {phase.subtitle}
                </div>
              </div>
            </div>
          );

          if (isLocked) {
            return <div key={phase.key}>{content}</div>;
          }

          return (
            <Link key={phase.key} href={phase.href(projectId)}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[#27272a]">
        <div className="text-[10px] text-[#52525b]">Powered by Claude</div>
      </div>
    </aside>
  );
}
