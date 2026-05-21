"use client";

// Domain nav — colored-dot tabs derived from meta.clients. The active tab
// drives the per-domain tint stripe + page background tint.

import { useEffect, useMemo } from "react";
import { useSignals } from "./context";
import type { AnyItem, ClientConfig, MetaConfig } from "@/lib/signals/types";
import { SECTION_IDS } from "@/lib/signals/types";
import { ALL_DOMAIN, CROSS_DOMAIN, tintFor } from "./utils";

function countItemsPerClient(payload: { sections: Record<string, { items: AnyItem[] }> }, clients: ClientConfig[]) {
  const counts: Record<string, number> = { all: 0, cross: 0 };
  for (const c of clients) counts[c.id] = 0;
  const all: AnyItem[] = [];
  for (const s of SECTION_IDS) all.push(...payload.sections[s].items);
  counts.all = all.length;
  for (const it of all) {
    if (it.client === "all") counts.cross++;
    else if (Object.prototype.hasOwnProperty.call(counts, it.client)) counts[it.client]++;
  }
  return counts;
}

export function DomainNav({ meta }: { meta: MetaConfig }) {
  const { payload, activeTab, setActiveTab } = useSignals();
  const counts = useMemo(
    () => countItemsPerClient(payload, meta.clients),
    [payload, meta.clients],
  );

  const domains = useMemo(() => {
    const list = [
      ALL_DOMAIN,
      ...meta.clients.map((c) => ({ id: c.id, label: c.name, color: c.color, bg: tintFor(c.color) })),
      CROSS_DOMAIN,
    ];
    // Hide tabs with 0 content (always keep "all").
    return list.filter((d) => d.id === "all" || (counts[d.id] || 0) > 0);
  }, [meta.clients, counts]);

  // If the active tab is no longer visible, reset to "all".
  useEffect(() => {
    if (!domains.find((d) => d.id === activeTab)) setActiveTab("all");
  }, [domains, activeTab, setActiveTab]);

  return (
    <nav className="domains">
      {domains.map((d) => (
        <button
          key={d.id}
          type="button"
          className={`domain-btn${activeTab === d.id ? " active" : ""}`}
          onClick={() => setActiveTab(d.id)}
        >
          <span className="dot" style={{ background: d.color }} />
          {d.label}
          {d.id !== "all" && counts[d.id] != null && (
            <span className="count"> {counts[d.id]}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
