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
      subtitle: "Research & HMW",
      href: `/products/${pid}/features/${fid}/discovery`,
      phaseField: "phase_discovery" as const,
    },
    {
      key: "design-concepts",
      num: "03",
      label: "Concepts",
      subtitle: "Design concepts",
      href: `/products/${pid}/features/${fid}/design-concepts`,
      phaseField: "phase_design_concepts" as const,
    },
    {
      key: "concepts",
      num: "04",
      label: "Visual Variations",
      subtitle: "Wireframes & chat",
      href: `/products/${pid}/features/${fid}/concepts`,
      phaseField: "phase_concepts" as const,
    },
    {
      key: "hifi",
      num: "05",
      label: "High Fidelity",
      subtitle: "Polished designs",
      href: `/products/${pid}/features/${fid}/hifi`,
      phaseField: "phase_hifi" as const,
    },
    {
      key: "review",
      num: "06",
      label: "Review",
      subtitle: "Design audit",
      href: `/products/${pid}/features/${fid}/review`,
      phaseField: "phase_review" as const,
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
    <aside className="w-[200px] min-h-screen bg-surface-sidebar flex flex-col border-r border-divider">
      <Link href="/" className="flex items-center gap-2.5 px-4 py-4 hover:bg-surface-subtle transition-colors duration-fast">
        <img src="/humanx-logo.svg" alt="" className="h-6 w-auto shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-content-heading leading-tight">HumanX Studio</div>
          <div className="text-overline text-content-section-label truncate">{product.name}</div>
        </div>
      </Link>

      <nav className="flex-1 py-2 overflow-y-auto">
        {isFeatureRoute ? (
          <>
            {/* Product-level phases (collapsed) */}
            <div className="px-3 mb-2">
              <div className="text-overline font-medium text-content-section-label uppercase tracking-wider px-2 mb-1">
                Product
              </div>
              {PRODUCT_PHASES.map((phase) => {
                const state =
                  phase.key === "context"
                    ? product.phase_context
                    : product.phase_discovery;
                // Also check if discovery_insights exist (covers stale phase field)
                const isComplete = state === "complete" || (phase.key === "discovery" && !!product.discovery_insights);

                return (
                  <Link key={phase.key} href={phase.href(productId)}>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded text-overline text-nav-item-text-default hover:text-nav-item-text-active transition-colors duration-fast">
                      {isComplete ? (
                        <Check className="w-3 h-3 text-hx-green-dark" strokeWidth={1.5} />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-content-muted inline-block" />
                      )}
                      {phase.label}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mx-3 border-t border-divider mb-2" />

            {/* Feature name */}
            <div className="px-3 mb-1">
              <div className="text-overline font-medium text-content-section-label uppercase tracking-wider px-2 mb-1">
                Feature
              </div>
              <div className="text-xs text-content-heading font-medium px-2 truncate">
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
              const isLocked = phase.key === "review" ? false : state === "locked";
              const isComplete = state === "complete";

              const content = (
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-md transition-colors duration-fast ${
                    isActive ? "bg-nav-item-active-bg" : ""
                  } ${isLocked ? "opacity-30 cursor-not-allowed" : "hover:bg-nav-item-hover-bg cursor-pointer"}`}
                >
                  <div
                    className={`w-[26px] h-[26px] rounded-md flex items-center justify-center text-overline font-bold shrink-0 ${
                      isComplete
                        ? "bg-hx-green-dark text-content-on-dark"
                        : isActive
                          ? "bg-action-primary-bg text-action-primary-text"
                          : "bg-surface-subtle text-content-muted"
                    }`}
                  >
                    {isComplete ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : phase.num}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-content-primary truncate">
                      {phase.label}
                    </div>
                    <div className="text-overline text-content-tertiary truncate">
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
            const isComplete = state === "complete" || (phase.key === "discovery" && !!product.discovery_insights);

            const content = (
              <div
                className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-md transition-colors duration-fast ${
                  isActive ? "bg-nav-item-active-bg" : ""
                } ${isLocked ? "opacity-30 cursor-not-allowed" : "hover:bg-nav-item-hover-bg cursor-pointer"}`}
              >
                <div
                  className={`w-[26px] h-[26px] rounded-md flex items-center justify-center text-overline font-bold shrink-0 ${
                    isComplete
                      ? "bg-hx-green-dark text-content-on-dark"
                      : isActive
                        ? "bg-action-primary-bg text-action-primary-text"
                        : "bg-surface-subtle text-content-muted"
                  }`}
                >
                  {isComplete ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : phase.num}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-content-primary truncate">
                    {phase.label}
                  </div>
                  <div className="text-overline text-content-tertiary truncate">
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

        {/* Features list on product-level pages */}
        {!isFeatureRoute && (
          <>
            <div className="mx-3 border-t border-[#27272a] my-2" />
            <div className="px-3">
              <div className="text-overline font-medium text-content-section-label uppercase tracking-wider px-2 mb-2">
                Features
              </div>
              <Link href={`/?newFeature=${productId}`}>
                <div className="flex items-center justify-center gap-1.5 mx-1 mb-2 py-1.5 rounded-md border border-[#3f3f46] text-overline text-nav-item-text-default hover:bg-nav-item-hover-bg hover:text-nav-item-text-active transition-colors duration-fast cursor-pointer">
                  + New Feature
                </div>
              </Link>
              {(product.features || []).map((f) => (
                <Link key={f.id} href={`/products/${productId}/features/${f.id}`}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded text-overline text-nav-item-text-default hover:bg-nav-item-hover-bg hover:text-nav-item-text-active transition-colors duration-fast cursor-pointer">
                    {f.phase_concepts === "complete" || f.phase_brief === "complete" ? (
                      <Check className="w-3 h-3 text-hx-green-dark shrink-0" strokeWidth={1.5} />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-content-muted inline-block shrink-0" />
                    )}
                    <span className="truncate">{f.name}</span>
                  </div>
                </Link>
              ))}
              {(!product.features || product.features.length === 0) && (
                <p className="text-overline text-content-muted px-2 py-1">No features yet</p>
              )}
            </div>
          </>
        )}
      </nav>

      <div className="px-4 py-3 border-t border-divider">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-overline text-content-tertiary hover:text-content-secondary transition-colors duration-fast"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
          Back to Dashboard
        </Link>
      </div>
    </aside>
  );
}
