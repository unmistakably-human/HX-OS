"use client";

// Masthead — title, live-dot health, bookmarks link with count, read-state
// actions, date pill. Ports applyMastheadHealth + renderHeaderCounter from
// dashboard.html.

import { useMemo, useSyncExternalStore } from "react";
import { useSignals } from "./context";
import { fmtFullDate } from "./utils";
import { SECTION_IDS, type MetaConfig } from "@/lib/signals/types";

// Subscribe-free external store so hydration matches: server renders "", client
// renders today's date in the user's locale.
const subscribeNoop = () => () => {};
function useTodayLabel() {
  return useSyncExternalStore(
    subscribeNoop,
    () => fmtFullDate(),
    () => "",
  );
}

export function Masthead({ meta }: { meta: MetaConfig }) {
  const { payload, isRead, markAllRead, resetRead, openSectionView } = useSignals();
  const date = useTodayLabel();

  const degradedCount = useMemo(
    () => Object.values(meta.section_freshness).filter((s) => s?.degraded).length,
    [meta.section_freshness],
  );

  const allItems = useMemo(() => {
    const out = [];
    for (const s of SECTION_IDS) out.push(...payload.sections[s].items);
    return out;
  }, [payload.sections]);
  const total = allItems.length;
  const unread = allItems.filter((it) => !isRead(it.id)).length;

  let healthLabel: string;
  let healthColor: string | undefined;
  if (degradedCount >= 3) {
    healthLabel = `Refresh degraded · ${degradedCount} sections`;
    healthColor = "#991b1b";
  } else if (degradedCount >= 1) {
    healthLabel = `${degradedCount} section${degradedCount > 1 ? "s" : ""} stale`;
    healthColor = "#b45309";
  } else {
    healthLabel = "Updated today";
    healthColor = undefined;
  }

  const counterText = unread === 0 ? "0 new · all read" : total === unread ? `${total} new` : `${unread} of ${total} new`;

  const bookmarkCount = payload.bookmarks.length;

  return (
    <header className="masthead">
      <div className="masthead-l">
        <h1>
          Signal <span className="light">/ design intelligence</span>
        </h1>
        <p>Design signals from across your space, refreshed daily</p>
      </div>
      <div className="masthead-r">
        <span className="live-dot" style={healthColor ? { color: healthColor } : undefined}>
          {healthLabel}
          <span className={`read-counter${unread > 0 ? " has-new" : ""}`}>{counterText}</span>
        </span>
        <button
          type="button"
          className={`bookmarks-link${bookmarkCount > 0 ? " has-items" : ""}`}
          title="Open bookmarks"
          onClick={() => openSectionView("bookmarks")}
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1.5l1.7 3.5 3.8.5-2.7 2.7.6 3.8L7 10.2 3.6 12l.6-3.8L1.5 5.5l3.8-.5z" />
          </svg>
          Bookmarks <span className="bookmarks-link-count">{bookmarkCount}</span>
        </button>
        <span className="read-actions">
          <button onClick={markAllRead} title="Mark everything on the page as read">Mark all read</button>
          <button onClick={resetRead} title="Clear read state">Reset</button>
        </span>
        {date && <span className="date-pill">{date}</span>}
      </div>
    </header>
  );
}
