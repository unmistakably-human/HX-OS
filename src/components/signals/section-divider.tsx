"use client";

// Section divider — serif title + sans subtitle + meta row (why-link,
// stale-badge, see-all button). Title is a clickable trigger that opens
// the full section view.

import { useRef, useSyncExternalStore } from "react";
import { useSignals } from "./context";
import type { AnySectionId, MetaConfig, SectionId, SectionData } from "@/lib/signals/types";

const subscribeNoop = () => () => {};
function useNowMs(): number {
  return useSyncExternalStore(subscribeNoop, () => Date.now(), () => 0);
}

export function anchorId(sectionId: AnySectionId): string {
  return `anchor-${sectionId}`;
}

export function SectionDivider({
  sectionId,
  title,
  subtitle,
  totalItems,
  meta,
  sectionData,
}: {
  sectionId: SectionId;
  title: string;
  subtitle?: string;
  totalItems?: number;
  meta: MetaConfig;
  sectionData?: SectionData;
}) {
  const { openSectionView, openRunLog } = useSignals();
  const whyRef = useRef<HTMLButtonElement>(null);

  const fr = meta.section_freshness[sectionId];
  const nowMs = useNowMs();
  const ageDays = fr?.last_success
    ? Math.floor((nowMs - new Date(fr.last_success).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const showStale = fr?.degraded || (ageDays != null && ageDays >= 3);
  const severe = !!fr?.degraded && ageDays != null && ageDays >= 7;
  const staleText = fr?.degraded
    ? `Stale · ${ageDays != null ? ageDays + "d ago" : "last good copy"}`
    : ageDays != null && ageDays >= 3
      ? `Aged · ${ageDays}d`
      : "";

  return (
    <div className="divider" id={anchorId(sectionId)}>
      <h2 className="divider-title">
        <button
          type="button"
          className="section-title-btn"
          title="Open full section view"
          onClick={() => openSectionView(sectionId)}
        >
          <span>{title}</span>
          <span className="section-title-arrow" aria-hidden>↗</span>
        </button>
      </h2>
      {subtitle && <p className="divider-subtitle">{subtitle}</p>}
      <div className="divider-meta">
        {showStale && (
          <span className={`stale-badge${severe ? " severe" : ""}`}>{staleText}</span>
        )}
        <button
          ref={whyRef}
          type="button"
          className="why-link"
          onClick={(e) => {
            e.stopPropagation();
            openRunLog(sectionId, e.currentTarget);
          }}
        >
          How this was picked
        </button>
        {totalItems != null && totalItems > 0 && (
          <button
            type="button"
            className="see-all-btn"
            onClick={(e) => {
              e.stopPropagation();
              openSectionView(sectionId);
            }}
          >
            See all {totalItems} →
          </button>
        )}
      </div>
      <span style={{ display: "none" }}>{sectionData?.items.length ?? 0}</span>
    </div>
  );
}

// Simple divider — no section anchor or controls. Used by Hero ("At a glance"
// substitute, threads briefing).
export function PlainDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="divider">
      <h2 className="divider-title">
        <span>{title}</span>
      </h2>
      {subtitle && <p className="divider-subtitle">{subtitle}</p>}
    </div>
  );
}
