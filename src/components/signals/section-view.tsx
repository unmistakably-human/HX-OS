"use client";

// Section view — full-screen drill into a single section with client, strength,
// and surface filters. Also doubles as the bookmarks view (groups bookmarked
// items by section, uses the same card renderers).

import { useMemo, useState } from "react";
import { useSignals } from "./context";
import {
  type AnyItem,
  type ClientConfig,
  type CompetitorUpdate,
  type DesignSurface,
  type DesignToolNews,
  type DomainSignal,
  type LeaderTweet,
  type LennyPodcast,
  type MetaConfig,
  type RedditThread,
  type SectionId,
  type VisualInspiration,
  SECTION_LABELS,
  SECTION_IDS,
} from "@/lib/signals/types";
import {
  QuoteLedCard,
  StatCard,
  TweetCard,
  VisualCard,
  WatchCard,
} from "./cards";

function renderCard(sectionId: SectionId, item: AnyItem, clients: ClientConfig[], meta: MetaConfig) {
  switch (sectionId) {
    case "domain-signals":
      return <StatCard item={item as DomainSignal} clients={clients} />;
    case "competitor-updates":
      // Watch-card variant works for the section view (compact, no pairing).
      return <WatchCard item={item as CompetitorUpdate} clients={clients} />;
    case "leader-tweets":
      return <TweetCard item={item as LeaderTweet} />;
    case "reddit-threads":
      return <QuoteLedCard item={item as RedditThread} clients={clients} />;
    case "visual-inspiration":
      return <VisualCard item={item as VisualInspiration} clients={clients} meta={meta} />;
    case "design-tool-news":
      return <ToolDrawerCard item={item as DesignToolNews} />;
    case "lenny-podcast":
      return <PodcastCard item={item as LennyPodcast} />;
    default:
      return null;
  }
}

// Compact card for design-tool-news in section view (no dedicated component).
function ToolDrawerCard({ item }: { item: DesignToolNews }) {
  const { openDrawer } = useSignals();
  const subtype =
    item.subtype === "major-release" ? "Tool release"
      : item.subtype === "emerging-tool" ? "New tool"
        : item.subtype === "plugin-system" ? "Plugin"
          : item.subtype === "essay-opinion" ? "Essay"
            : "Update";
  return (
    <div className="card" onClick={() => openDrawer("design-tool-news", item.id)}>
      <div className="card-head">
        <span className="tag" style={{ background: "#f0f0eb", color: "#4a4a44" }}>
          {item.tool || "Tool"}
        </span>
        <span className="card-format">{subtype}</span>
      </div>
      <div className="card-body">
        <h2 className="card-title">{item.title}</h2>
        <p className="card-text">{item.summary}</p>
        <p className="card-source">{item.source}</p>
      </div>
    </div>
  );
}

function PodcastCard({ item }: { item: LennyPodcast }) {
  const { openDrawer } = useSignals();
  return (
    <div className="card wide quote" onClick={() => openDrawer("lenny-podcast", item.id)}>
      <div className="card-head">
        <span className="tag" style={{ background: "#f0f0eb", color: "#4a4a44" }}>Podcast</span>
        <span className="card-format">Featured snippet</span>
      </div>
      <div className="card-body">
        <blockquote>{item.quote}</blockquote>
        <div className="card-attribution">
          — {item.guest_name}
          {item.guest_role ? ", " + item.guest_role : ""}
        </div>
      </div>
    </div>
  );
}

export function SectionView({ clients, meta }: { clients: ClientConfig[]; meta: MetaConfig }) {
  const { sectionView, closeSectionView, activeTab, payload, clearBookmarks } = useSignals();
  const [clientFilter, setClientFilter] = useState<string>(activeTab);
  const [strengthFilter, setStrengthFilter] = useState<1 | 2 | 3 | null>(null);
  const [surfaceFilter, setSurfaceFilter] = useState<DesignSurface | null>(null);
  const open = sectionView !== null;

  const isBookmarks = sectionView === "bookmarks";

  // Group bookmarked items by section
  const bookmarksGrouped = useMemo(() => {
    if (!isBookmarks) return null;
    const groups: Record<SectionId, AnyItem[]> = {
      "domain-signals": [],
      "competitor-updates": [],
      "leader-tweets": [],
      "design-tool-news": [],
      "visual-inspiration": [],
      "lenny-podcast": [],
      "reddit-threads": [],
    };
    const ids = new Set(payload.bookmarks);
    for (const sectionId of SECTION_IDS) {
      for (const it of payload.sections[sectionId].items) {
        if (ids.has(it.id)) groups[sectionId].push(it);
      }
    }
    return groups;
  }, [isBookmarks, payload]);

  // Apply filters when in section drill
  const filteredItems: AnyItem[] = useMemo(() => {
    if (isBookmarks || !sectionView) return [];
    const data = payload.sections[sectionView as SectionId];
    return data.items.filter((it) => {
      if (clientFilter !== "all") {
        if (clientFilter === "cross" && it.client !== "all") return false;
        if (clientFilter !== "cross" && it.client !== clientFilter) return false;
      }
      if (strengthFilter != null && (it.strength || 0) !== strengthFilter) return false;
      if (surfaceFilter && !(it.design_surface || []).includes(surfaceFilter)) return false;
      return true;
    });
  }, [isBookmarks, sectionView, payload.sections, clientFilter, strengthFilter, surfaceFilter]);

  const surfacesInSection: DesignSurface[] = useMemo(() => {
    if (isBookmarks || !sectionView) return [];
    const set = new Set<DesignSurface>();
    for (const it of payload.sections[sectionView as SectionId].items) {
      for (const s of it.design_surface || []) set.add(s);
    }
    return Array.from(set).sort();
  }, [isBookmarks, sectionView, payload.sections]);

  if (!sectionView) return <section className="section-view" aria-hidden="true" />;

  // Bookmarks view
  if (isBookmarks) {
    const totalLive = bookmarksGrouped
      ? Object.values(bookmarksGrouped).reduce((s, arr) => s + arr.length, 0)
      : 0;
    const totalSaved = payload.bookmarks.length;
    const liveStale = totalSaved - totalLive;
    return (
      <section className={`section-view${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="sv-head">
          <div className="sv-head-row">
            <button className="sv-back" onClick={closeSectionView}>← Back</button>
            <h1 className="sv-title">Bookmarks</h1>
            <span className="sv-count">
              {totalLive}
              {liveStale ? ` live · ${liveStale} from past refreshes` : " saved"}
            </span>
          </div>
          {totalSaved > 0 && (
            <div className="sv-filters" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="sv-chip"
                onClick={() => {
                  if (window.confirm(`Clear all ${totalSaved} bookmarks? This cannot be undone.`)) {
                    void clearBookmarks();
                  }
                }}
              >
                Clear all bookmarks
              </button>
            </div>
          )}
        </div>
        {totalLive === 0 ? (
          <div className="sv-body">
            <div className="bookmarks-empty">
              <div className="icon">
                <svg width={32} height={32} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1.5l1.7 3.5 3.8.5-2.7 2.7.6 3.8L7 10.2 3.6 12l.6-3.8L1.5 5.5l3.8-.5z" />
                </svg>
              </div>
              <h2>No bookmarks yet</h2>
              <p>Hover any card on the dashboard and click the star to save it here.</p>
            </div>
          </div>
        ) : (
          <div className="sv-body">
            {SECTION_IDS.map((sId) => {
              const items = bookmarksGrouped?.[sId] || [];
              if (!items.length) return null;
              const label = SECTION_LABELS[sId];
              const renderedItems = items.map((it) => (
                <span key={it.id}>{renderCard(sId, it, clients, meta)}</span>
              ));
              return (
                <span key={sId}>
                  <div className="bookmarks-section-head">
                    <span>{label}</span>
                    <span className="count">{items.length} bookmark{items.length > 1 ? "s" : ""}</span>
                  </div>
                  {sId === "visual-inspiration" ? (
                    <div className="visual-grid" style={{ gridColumn: "1 / -1" }}>
                      {renderedItems}
                    </div>
                  ) : (
                    renderedItems
                  )}
                </span>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  // Per-section drill
  const sectionId = sectionView as SectionId;
  const data = payload.sections[sectionId];
  const sectionLabel = SECTION_LABELS[sectionId];

  return (
    <section className={`section-view${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="sv-head">
        <div className="sv-head-row">
          <button className="sv-back" onClick={closeSectionView}>← Back</button>
          <h1 className="sv-title">{sectionLabel}</h1>
          <span className="sv-count">
            {filteredItems.length} of {data.items.length}
          </span>
        </div>
        <div className="sv-filters">
          <span className="sv-filter-label">Client</span>
          {(["all", ...clients.map((c) => c.id), "cross"] as const).map((cid) => {
            const label = cid === "all" ? "All clients" : cid === "cross" ? "Cross-client" : (clients.find((c) => c.id === cid)?.name || cid);
            return (
              <button
                key={cid}
                type="button"
                className={`sv-chip${clientFilter === cid ? " active" : ""}`}
                onClick={() => setClientFilter(cid)}
              >
                {label}
              </button>
            );
          })}
          <span className="sv-filter-label">Strength</span>
          <button
            type="button"
            className={`sv-chip${strengthFilter == null ? " active" : ""}`}
            onClick={() => setStrengthFilter(null)}
          >
            Any
          </button>
          {[3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              className={`sv-chip${strengthFilter === s ? " active" : ""}`}
              onClick={() => setStrengthFilter(s as 1 | 2 | 3)}
            >
              S{s}
            </button>
          ))}
          {surfacesInSection.length > 0 && (
            <>
              <span className="sv-filter-label">Surface</span>
              <button
                type="button"
                className={`sv-chip${surfaceFilter == null ? " active" : ""}`}
                onClick={() => setSurfaceFilter(null)}
              >
                All surfaces
              </button>
              {surfacesInSection.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`sv-chip${surfaceFilter === s ? " active" : ""}`}
                  onClick={() => setSurfaceFilter(s)}
                >
                  {s}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="sv-body">
        {filteredItems.length === 0 ? (
          <div className="sv-empty">
            No items match these filters.{" "}
            <button
              type="button"
              className="sv-chip"
              style={{ marginLeft: 6 }}
              onClick={() => {
                setClientFilter("all");
                setStrengthFilter(null);
                setSurfaceFilter(null);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : sectionId === "visual-inspiration" ? (
          <div className="visual-grid">
            {filteredItems.map((it) => <span key={it.id}>{renderCard(sectionId, it, clients, meta)}</span>)}
          </div>
        ) : (
          filteredItems.map((it) => <span key={it.id}>{renderCard(sectionId, it, clients, meta)}</span>)
        )}
      </div>
    </section>
  );
}
