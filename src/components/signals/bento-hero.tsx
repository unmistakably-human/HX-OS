"use client";

// Bento hero — 3-column grid of one-per-section signals, with topic chips
// above. When a topic chip is active, the grid switches to all items tagged
// with that topic (sorted by strength).

import { useMemo } from "react";
import { useSignals } from "./context";
import { BentoEmpty, BentoTile } from "./cards";
import {
  filterByClient,
  itemMatchesTopic,
  rapidFireTopics,
} from "./utils";
import {
  type AnyItem,
  type ClientConfig,
  type SectionId,
} from "@/lib/signals/types";

interface Picked {
  item: AnyItem;
  sectionId: SectionId;
  sectionLabel: string;
}

const SECTION_DEFS: { id: SectionId; label: string }[] = [
  { id: "domain-signals", label: "Market" },
  { id: "competitor-updates", label: "Competitors" },
  { id: "leader-tweets", label: "Posts" },
  { id: "design-tool-news", label: "Tools" },
  { id: "visual-inspiration", label: "Visuals" },
  { id: "reddit-threads", label: "Community" },
];

export function BentoHero({ clients, heroSkip }: { clients: ClientConfig[]; heroSkip: Set<string> }) {
  const { payload, activeTab, rapidTopic, setRapidTopic } = useSignals();
  const pool = useMemo<Picked[]>(() => {
    const out: Picked[] = [];
    for (const def of SECTION_DEFS) {
      const items = payload.sections[def.id].items as AnyItem[];
      for (const it of filterByClient(items, activeTab)) {
        out.push({ item: it, sectionId: def.id, sectionLabel: def.label });
      }
    }
    return out;
  }, [payload.sections, activeTab]);

  const allItemsAcross = useMemo<AnyItem[]>(() => pool.map((p) => p.item), [pool]);
  const topics = useMemo(() => rapidFireTopics(allItemsAcross), [allItemsAcross]);
  const activeTopic = rapidTopic && topics.some((t) => t.topic === rapidTopic) ? rapidTopic : null;

  const tiles: Picked[] = useMemo(() => {
    if (activeTopic) {
      return pool
        .filter((p) => itemMatchesTopic(p.item, activeTopic))
        .sort((a, b) => (b.item.strength || 0) - (a.item.strength || 0));
    }
    // One per section, top by strength.
    const bySection: Record<string, Picked[]> = {};
    for (const p of pool) {
      if (!bySection[p.sectionId]) bySection[p.sectionId] = [];
      bySection[p.sectionId].push(p);
    }
    const out: Picked[] = [];
    for (const rows of Object.values(bySection)) {
      rows.sort((a, b) => (b.item.strength || 0) - (a.item.strength || 0));
      if (rows[0]) out.push(rows[0]);
    }
    return out;
  }, [pool, activeTopic]);

  // Mutate the heroSkip set so downstream sections can skip what the hero shows.
  for (const t of tiles) heroSkip.add(t.item.id);

  return (
    <div className="bento-hero">
      {topics.length > 0 && (
        <div className="bento-chips">
          <button
            type="button"
            className={`rapid-chip${!activeTopic ? " active" : ""}`}
            onClick={() => setRapidTopic(null)}
          >
            All
          </button>
          {topics.map((t) => (
            <button
              key={t.topic}
              type="button"
              className={`rapid-chip${activeTopic === t.topic ? " active" : ""}`}
              onClick={() => setRapidTopic(t.topic)}
            >
              #{t.topic}
              <span className="rapid-chip-count">{t.count}</span>
            </button>
          ))}
        </div>
      )}
      <div className="bento-grid">
        {tiles.length === 0 ? (
          <BentoEmpty
            messageTitle={activeTopic ? `No #${activeTopic}` : "Quiet refresh"}
            messageBody={
              activeTopic
                ? `No signals tagged #${activeTopic}. Click All to reset.`
                : "Nothing matched this filter. Try a wider client filter."
            }
          />
        ) : (
          tiles.map((t, i) => (
            <BentoTile
              key={t.item.id}
              item={t.item}
              sectionId={t.sectionId}
              sectionLabel={t.sectionLabel}
              clients={clients}
              idx={i}
            />
          ))
        )}
      </div>
    </div>
  );
}
