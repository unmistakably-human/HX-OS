"use client";

// Per-section renderers — wrap the cards in their section divider + carousel
// (when used in the dashboard body) or a plain grid (when used in section-view).

import type {
  ClientConfig,
  CompetitorUpdate,
  DomainSignal,
  MetaConfig,
} from "@/lib/signals/types";
import { useSignals } from "./context";
import { Carousel } from "./carousel";
import { SectionDivider } from "./section-divider";
import {
  EmptyCard,
  QuoteLedCard,
  StatCard,
  TweetCard,
  VisualCard,
  VsCard,
  WatchCard,
  SpotlightCard,
  BriefBlock,
} from "./cards";
import { findMatchedDefensive } from "./drawer";
import { filterByClient } from "./utils";

// ---------------------------------------------------------------------------
// LeaderTweets — carousel of tweet cards.
// ---------------------------------------------------------------------------
export function LeaderTweetsSection({ meta, heroSkip }: { meta: MetaConfig; heroSkip: Set<string> }) {
  const { payload, activeTab } = useSignals();
  const data = payload.sections["leader-tweets"];
  const items = filterByClient(data.items, activeTab)
    .filter((it) => !heroSkip.has(it.id))
    .slice()
    .sort((a, b) => (b.strength || 0) - (a.strength || 0));
  if (!items.length) {
    return (
      <>
        <SectionDivider
          sectionId="leader-tweets"
          title="What people are posting"
          subtitle="Nothing from the people we follow this week"
          meta={meta}
          sectionData={data}
        />
        <EmptyCard
          label="Nothing on X this week"
          body="No posts from the people we follow matched this filter. Try a wider client filter."
        />
      </>
    );
  }
  // Subtitle — characterise the cohort.
  const buckets = { founder: 0, designer: 0, voice: 0 };
  for (const it of items) {
    const r = (it.author_role || "").toLowerCase();
    if (/founder|ceo|co-founder|cto|md\b/.test(r)) buckets.founder++;
    else if (/design/.test(r)) buckets.designer++;
    else buckets.voice++;
  }
  const parts: string[] = [];
  if (buckets.founder) parts.push(`${buckets.founder} founder${buckets.founder > 1 ? "s" : ""}`);
  if (buckets.designer) parts.push(`${buckets.designer} designer${buckets.designer > 1 ? "s" : ""}`);
  if (buckets.voice) parts.push(`${buckets.voice} industry voice${buckets.voice > 1 ? "s" : ""}`);
  const subtitle = parts.length ? `Posts from ${parts.join(", ")}` : `Posts from ${items.length} people`;
  return (
    <>
      <SectionDivider
        sectionId="leader-tweets"
        title="What people are posting"
        subtitle={subtitle}
        totalItems={data.items.length}
        meta={meta}
        sectionData={data}
      />
      <Carousel>
        {items.map((it) => <TweetCard key={it.id} item={it} />)}
      </Carousel>
    </>
  );
}

// ---------------------------------------------------------------------------
// Competitors — pair direct-threat moves with defensive signals; rest as watch cards.
// ---------------------------------------------------------------------------
export function CompetitorsSection({ clients, meta, heroSkip }: { clients: ClientConfig[]; meta: MetaConfig; heroSkip: Set<string> }) {
  const { payload, activeTab } = useSignals();
  const data = payload.sections["competitor-updates"];
  const domainData = payload.sections["domain-signals"];
  const items = filterByClient(data.items, activeTab)
    .filter((it) => !heroSkip.has(it.id))
    .slice()
    .sort((a, b) => (b.strength || 0) - (a.strength || 0));
  if (!items.length) {
    return (
      <>
        <SectionDivider
          sectionId="competitor-updates"
          title="What competitors shipped"
          subtitle="No competitor moves this week"
          meta={meta}
          sectionData={data}
        />
        <EmptyCard
          label="Nothing from competitors this week"
          body="No competitor moves matched this filter. Often a sign the category is between launches."
        />
      </>
    );
  }
  // Pair direct-threat moves with defensive domain-signals (cap 2 pairs).
  const used = new Set<string>();
  const pairs: { move: CompetitorUpdate; defensive: DomainSignal }[] = [];
  for (const move of items.filter((it) => it.direct_threat)) {
    if (pairs.length >= 2) break;
    const defensive = findMatchedDefensive(move, domainData.items);
    if (defensive && !used.has(move.id) && !used.has(defensive.id)) {
      pairs.push({ move, defensive });
      used.add(move.id);
      used.add(defensive.id);
    }
  }
  const watching = items.filter((it) => !used.has(it.id));
  const subtitleParts: string[] = [];
  if (pairs.length) subtitleParts.push(`${pairs.length} direct hit${pairs.length > 1 ? "s" : ""}`);
  if (watching.length) subtitleParts.push(`${watching.length} to keep an eye on`);
  const subtitle = subtitleParts.join(", ");
  return (
    <>
      <SectionDivider
        sectionId="competitor-updates"
        title="What competitors shipped"
        subtitle={subtitle}
        totalItems={data.items.length}
        meta={meta}
        sectionData={data}
      />
      <Carousel>
        {pairs.map((p) => (
          <VsCard key={p.move.id} move={p.move} defensive={p.defensive} clients={clients} />
        ))}
        {watching.map((it) => (
          <WatchCard key={it.id} item={it} clients={clients} />
        ))}
      </Carousel>
    </>
  );
}

// ---------------------------------------------------------------------------
// Domain signals — stat cards in a carousel.
// ---------------------------------------------------------------------------
export function DomainSignalsSection({ clients, meta, heroSkip }: { clients: ClientConfig[]; meta: MetaConfig; heroSkip: Set<string> }) {
  const { payload, activeTab } = useSignals();
  const data = payload.sections["domain-signals"];
  const items = filterByClient(data.items, activeTab)
    .filter((it) => !heroSkip.has(it.id))
    .slice()
    .sort((a, b) => (b.strength || 0) - (a.strength || 0));
  if (!items.length) {
    return (
      <>
        <SectionDivider
          sectionId="domain-signals"
          title="Market signals"
          subtitle="Nothing new from your space this week"
          meta={meta}
          sectionData={data}
        />
        <EmptyCard
          label="No market signals"
          body="No signals from your space matched this filter. Try a wider client filter."
        />
      </>
    );
  }
  const types: Record<string, number> = {};
  for (const it of items) {
    const t = it.signal_type || "signal";
    types[t] = (types[t] || 0) + 1;
  }
  const parts = Object.entries(types).map(([t, n]) => `${n} ${t}`);
  const subtitle = parts.length ? `Picked up ${parts.join(", ")}` : `${items.length} signals`;
  return (
    <>
      <SectionDivider
        sectionId="domain-signals"
        title="Market signals"
        subtitle={subtitle}
        totalItems={data.items.length}
        meta={meta}
        sectionData={data}
      />
      <Carousel>
        {items.map((it) => <StatCard key={it.id} item={it} clients={clients} />)}
      </Carousel>
    </>
  );
}

// ---------------------------------------------------------------------------
// Visual references — 5-col grid (no carousel).
// ---------------------------------------------------------------------------
export function VisualInspirationSection({ meta }: { meta: MetaConfig }) {
  const { payload, activeTab } = useSignals();
  const data = payload.sections["visual-inspiration"];
  const items = filterByClient(data.items, activeTab).slice(0, 5);
  const clients = meta.clients;
  if (!items.length) {
    return (
      <>
        <SectionDivider
          sectionId="visual-inspiration"
          title="Visual references"
          subtitle="No patterns to show this week"
          meta={meta}
          sectionData={data}
        />
        <EmptyCard
          label="No visual references"
          body="No patterns matched this filter. Try a wider client filter."
        />
      </>
    );
  }
  const plats: Record<string, number> = {};
  for (const it of items) {
    const p = it.platform || it.source || "source";
    plats[p] = (plats[p] || 0) + 1;
  }
  const subtitle =
    "Pulled from " +
    Object.entries(plats)
      .map(([p, n]) => `${n}× ${p}`)
      .join(", ");
  return (
    <>
      <SectionDivider
        sectionId="visual-inspiration"
        title="Visual references"
        subtitle={subtitle}
        totalItems={data.items.length}
        meta={meta}
        sectionData={data}
      />
      <div className="visual-grid">
        {items.map((it) => (
          <VisualCard key={it.id} item={it} clients={clients} meta={meta} />
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Community (reddit threads) — quote-led cards in a carousel.
// ---------------------------------------------------------------------------
export function CommunitySection({ clients, meta }: { clients: ClientConfig[]; meta: MetaConfig }) {
  const { payload, activeTab } = useSignals();
  const data = payload.sections["reddit-threads"];
  const items = filterByClient(data.items, activeTab)
    .slice()
    .sort((a, b) => (b.strength || 0) - (a.strength || 0));
  if (!items.length) {
    return (
      <>
        <SectionDivider
          sectionId="reddit-threads"
          title="Community reactions"
          subtitle="No threads with real discussion this week"
          meta={meta}
          sectionData={data}
        />
        <EmptyCard
          label="No threads to show"
          body="No Reddit threads with enough discussion matched this filter."
        />
      </>
    );
  }
  const totalComments = items.reduce((s, it) => s + (it.comment_count || 0), 0);
  const subs = new Set(items.map((it) => it.subreddit).filter(Boolean));
  const subtitle = `${totalComments} comments across ${subs.size} subreddit${subs.size > 1 ? "s" : ""}`;
  return (
    <>
      <SectionDivider
        sectionId="reddit-threads"
        title="Community reactions"
        subtitle={subtitle}
        totalItems={data.items.length}
        meta={meta}
        sectionData={data}
      />
      <Carousel>
        {items.map((it) => <QuoteLedCard key={it.id} item={it} clients={clients} />)}
      </Carousel>
    </>
  );
}

// ---------------------------------------------------------------------------
// Brief (combined lenny-podcast + design-tool-news) — single full-width block.
// ---------------------------------------------------------------------------
export function BriefSection({ meta }: { meta: MetaConfig }) {
  const { payload, activeTab } = useSignals();
  const podcastData = payload.sections["lenny-podcast"];
  const toolData = payload.sections["design-tool-news"];
  const podcast = podcastData.items[0] || null;
  const inScopePodcast =
    podcast &&
    (activeTab === "all" || activeTab === "cross" || podcast.client === "all" || podcast.client === activeTab);
  const tools = filterByClient(toolData.items, activeTab)
    .slice()
    .sort((a, b) => (b.strength || 0) - (a.strength || 0))
    .slice(0, 3);
  if (!inScopePodcast && !tools.length) {
    return (
      <>
        <SectionDivider
          sectionId="design-tool-news"
          title="Tools and reading"
          subtitle="Nothing picked this week"
          meta={meta}
          sectionData={toolData}
        />
        <EmptyCard
          label="Nothing this week"
          body="No featured podcast and no tool or essay picks this week."
        />
      </>
    );
  }
  const subtitle =
    (inScopePodcast ? "1 podcast worth listening to" : "No podcast this week") +
    (tools.length ? `, ${tools.length} tool${tools.length > 1 ? "s" : ""} & essay${tools.length > 1 ? "s" : ""}` : "");
  return (
    <>
      <SectionDivider
        sectionId="design-tool-news"
        title="Tools and reading"
        subtitle={subtitle}
        totalItems={toolData.items.length}
        meta={meta}
        sectionData={toolData}
      />
      <BriefBlock podcast={inScopePodcast ? podcast : null} tools={tools} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Closing — strongest leader tweet not already shown.
// ---------------------------------------------------------------------------
export function ClosingSection() {
  const { payload, activeTab } = useSignals();
  const tweets = filterByClient(payload.sections["leader-tweets"].items, activeTab)
    .slice()
    .sort((a, b) => (b.strength || 0) - (a.strength || 0));
  if (!tweets.length) return null;
  const skip = new Set(tweets.slice(0, 3).map((t) => t.id));
  const remaining = tweets.find((t) => !skip.has(t.id));
  if (!remaining) return null;
  return (
    <>
      <div className="divider">
        <h2 className="divider-title">
          <span>One last thought</span>
        </h2>
        <p className="divider-subtitle">A post worth ending the week on</p>
      </div>
      <SpotlightCard item={remaining} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Threads briefing — top-of-page line + per-thread cards (rendered as cards).
// ---------------------------------------------------------------------------
export function ThreadsBriefing() {
  const { payload } = useSignals();
  const threads = payload.threads;
  if (!threads || !threads.briefing_line) return null;
  return (
    <p className="briefing-line">{threads.briefing_line}</p>
  );
}
