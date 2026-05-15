"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ArrowLeft, Plus, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFeature } from "@/lib/projects";
import { ShareProjectDialog } from "@/components/share-project-dialog";
import { UserMenu } from "@/components/user-menu";
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
      key: "flow",
      num: "04",
      label: "User Flow",
      subtitle: "Screen flowchart",
      href: `/products/${pid}/features/${fid}/flow`,
      phaseField: "phase_flow" as const,
    },
  ];
}

export function Sidebar({ product, productId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNewFeature, setShowNewFeature] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [creatingFeature, setCreatingFeature] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function handleCreateFeature() {
    if (!newFeatureName.trim() || creatingFeature) return;
    setCreatingFeature(true);
    try {
      const feature = await createFeature(productId, newFeatureName.trim(), "screen");
      setShowNewFeature(false);
      setNewFeatureName("");
      router.push(`/products/${productId}/features/${feature.id}`);
    } catch (err) {
      console.error("Failed to create feature:", err);
    }
    setCreatingFeature(false);
  }

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
          <div className="text-sm font-bold text-content-heading leading-tight">HumanX Labs</div>
          <div className="text-overline text-content-section-label truncate">{product.name}</div>
        </div>
      </Link>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-divider bg-surface-card px-2 py-1.5 text-xs font-medium text-content-heading transition-colors hover:bg-surface-subtle"
        >
          <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
          Share project
        </button>
      </div>
      <ShareProjectDialog
        projectId={productId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

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
              {showNewFeature ? (
                <div className="mx-1 mb-2 flex gap-1">
                  <Input
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    placeholder="Feature name"
                    className="h-7 text-xs"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFeature()}
                  />
                  <Button size="sm" onClick={handleCreateFeature} disabled={!newFeatureName.trim() || creatingFeature} className="h-7 text-xs px-2 shrink-0">
                    {creatingFeature ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Plus className="w-3 h-3" strokeWidth={1.5} />}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full text-xs mx-1 mb-2" onClick={() => setShowNewFeature(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                  New Feature
                </Button>
              )}
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

      <div className="px-4 py-3 border-t border-divider flex items-center justify-between gap-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-overline text-content-tertiary hover:text-content-secondary transition-colors duration-fast"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
          Back to Dashboard
        </Link>
        <UserMenu side="top" align="end" />
      </div>
    </aside>
  );
}
