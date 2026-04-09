"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ArrowLeft } from "lucide-react";
import type { Product } from "@/lib/types";

interface SidebarProps {
  product: Product;
  productId: string;
}

const PRODUCT_PHASES = [
  {
    key: "context",
    num: "01",
    label: "Product Context",
    subtitle: "Define the product",
    href: (pid: string) => `/products/${pid}/context`,
  },
  {
    key: "discovery",
    num: "02",
    label: "Discovery",
    subtitle: "Research & insights",
    href: (pid: string) => `/products/${pid}/discovery`,
  },
];

function getFeaturePhases(pid: string, fid: string) {
  return [
    {
      key: "brief",
      num: "01",
      label: "Feature Brief",
      subtitle: "Define the feature",
      href: `/products/${pid}/features/${fid}`,
      phaseField: "phase_brief" as const,
    },
    {
      key: "discovery",
      num: "02",
      label: "Insights",
      subtitle: "Research & HMW & Concepts",
      href: `/products/${pid}/features/${fid}/discovery`,
      phaseField: "phase_discovery" as const,
    },
    {
      key: "concepts",
      num: "03",
      label: "Visual Variations",
      subtitle: "Wireframes & chat",
      href: `/products/${pid}/features/${fid}/concepts`,
      phaseField: "phase_concepts" as const,
    },
  ];
}

export function Sidebar({ product, productId }: SidebarProps) {
  const pathname = usePathname();

  // Detect if we're in a feature-level route
  const featureMatch = pathname.match(/\/products\/[^/]+\/features\/([^/]+)/);
  const featureId = featureMatch?.[1] || null;
  const isFeatureRoute = !!featureId;

  // Find current feature name from product features list
  const featureName = isFeatureRoute
    ? product.features?.find((f) => f.id === featureId)?.name || "Feature"
    : null;

  return (
    <aside className="w-[200px] min-h-screen bg-[#18181b] flex flex-col border-r border-[#27272a]">
      <div className="px-4 py-5 border-b border-[#27272a]">
        <div className="text-[15px] font-bold text-white">HumanX Studio</div>
        <div className="text-[10px] text-[#52525b] mt-0.5">
          AI Design Workflow
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {isFeatureRoute ? (
          <>
            {/* Product-level phases (collapsed) */}
            <div className="px-3 mb-2">
              <div className="text-[10px] font-medium text-[#52525b] uppercase tracking-wider px-2 mb-1">
                Product
              </div>
              {PRODUCT_PHASES.map((phase) => {
                const state =
                  phase.key === "context"
                    ? product.phase_context
                    : product.phase_discovery;
                const isComplete = state === "complete";

                return (
                  <Link key={phase.key} href={phase.href(productId)}>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-[#71717a] hover:text-white/80 transition-colors">
                      {isComplete ? (
                        <Check className="w-3 h-3 text-[#065f46]" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-[#52525b] inline-block" />
                      )}
                      {phase.label}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mx-3 border-t border-[#27272a] mb-2" />

            {/* Feature name */}
            <div className="px-3 mb-1">
              <div className="text-[10px] font-medium text-[#52525b] uppercase tracking-wider px-2 mb-1">
                Feature
              </div>
              <div className="text-[12px] text-[#E8713A] font-medium px-2 truncate">
                {featureName}
              </div>
            </div>

            {/* Feature-level phases */}
            {getFeaturePhases(productId, featureId!).map((phase) => {
              const featureSummary = product.features?.find((f) => f.id === featureId);
              const state = featureSummary
                ? (featureSummary[phase.phaseField] as string)
                : "locked";
              const isActive = pathname.includes(phase.href) || pathname === phase.href;
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
                    {isComplete ? <Check className="w-3.5 h-3.5" /> : phase.num}
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

              if (isLocked) return <div key={phase.key}>{content}</div>;

              return (
                <Link key={phase.key} href={phase.href}>
                  {content}
                </Link>
              );
            })}
          </>
        ) : (
          /* Product-level phases (full) */
          PRODUCT_PHASES.map((phase) => {
            const state =
              phase.key === "context"
                ? product.phase_context
                : product.phase_discovery;
            const isActive = pathname.includes(phase.href(productId));
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
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : phase.num}
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

            if (isLocked) return <div key={phase.key}>{content}</div>;

            return (
              <Link key={phase.key} href={phase.href(productId)}>
                {content}
              </Link>
            );
          })
        )}
      </nav>

      <div className="px-4 py-3 border-t border-[#27272a]">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[11px] text-[#52525b] hover:text-[#9ca3af] transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Dashboard
        </Link>
      </div>
    </aside>
  );
}
