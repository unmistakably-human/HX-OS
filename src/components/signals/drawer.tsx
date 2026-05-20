"use client";

// Drawer — slide-in right panel with typed variants per section.
// Ports buildVsDrawer / buildStatDrawer / buildTweetDrawer / buildRedditDrawer /
// buildVisualDrawer / buildPodcastDrawer / buildToolDrawer / buildDefaultDrawer
// from signals-final/dashboard.html.

import type {
  AnyItem,
  ClientConfig,
  CompetitorUpdate,
  DesignToolNews,
  DomainSignal,
  LeaderTweet,
  LennyPodcast,
  MetaConfig,
  RedditThread,
  SectionId,
  VisualInspiration,
} from "@/lib/signals/types";
import { SECTION_LABELS } from "@/lib/signals/types";
import { useSignals } from "./context";
import { Tag } from "./cards";
import { MockupSvg } from "./mockups";
import {
  applyEmphasis,
  avatarBg,
  domainFor,
  extractStats,
  fmtRelDate,
  initials,
  num,
  stripPlatformPrefix,
  visualBgStyle,
} from "./utils";

function DrawerHead({ item, sectionId, clients }: { item: AnyItem; sectionId: SectionId; clients: ClientConfig[] }) {
  return (
    <div className="drawer-tags">
      <Tag clientId={item.client} clients={clients} />
      <span
        className="tag"
        style={{ background: "#f0f0eb", color: "#4a4a44", marginLeft: 6 }}
      >
        {SECTION_LABELS[sectionId]}
      </span>
    </div>
  );
}

function DrawerObservation({ observation }: { observation?: string }) {
  if (!observation) return null;
  return (
    <div className="drawer-observation">
      <span className="drawer-observation-label">Observation</span>
      {observation}
    </div>
  );
}

function DrawerSourceLine({ item }: { item: AnyItem }) {
  const url = item.source_url || (item as DesignToolNews).try_it_url || (item as LennyPodcast).episode_url;
  return (
    <>
      {item.source && (
        <div className="drawer-source">
          {item.source}
          {item.published_at ? " · " + fmtRelDate(item.published_at) : ""}
        </div>
      )}
      {url && (
        <a className="drawer-link" href={url} target="_blank" rel="noopener noreferrer">
          Open source{" "}
          <svg width={11} height={11} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 2.5H2.5v9H11V8.5" />
            <path d="M7 7l4-4M7.5 2.5H11V6" />
          </svg>
        </a>
      )}
    </>
  );
}

function StatDrawer({ item, sectionId, clients }: { item: DomainSignal; sectionId: SectionId; clients: ClientConfig[] }) {
  const stats = Array.isArray(item.hero_stats) && item.hero_stats.length
    ? item.hero_stats.slice(0, 4)
    : extractStats((item.title || "") + " · " + (item.summary || "") + " · " + (item.observation || ""));
  const d = domainFor(item.client, clients);
  const titleSegments = applyEmphasis(stripPlatformPrefix(item.title), item.hero_emphasis);
  const cols = stats.length === 1 ? 1 : stats.length <= 2 ? 2 : stats.length === 3 ? 3 : 2;
  return (
    <>
      <DrawerHead item={item} sectionId={sectionId} clients={clients} />
      <h2 className="drawer-title">
        {titleSegments.map((seg, i) =>
          seg.emphasis ? (
            <em key={i} style={{ fontStyle: "italic", color: d.color }}>{seg.text}</em>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </h2>
      {stats.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols},1fr)`,
            gap: "18px 24px",
            margin: "14px 0 22px",
            padding: "18px 0",
            borderTop: "1px solid var(--hairline-2)",
            borderBottom: "1px solid var(--hairline-2)",
          }}
        >
          {stats.map((s, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontWeight: 400,
                  lineHeight: 1,
                  letterSpacing: "-0.024em",
                  fontSize: s.n.length > 12 ? "var(--t-6)" : "var(--t-7)",
                }}
              >
                {s.n}
              </div>
              {s.l && (
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "var(--t-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--ink-4)",
                    marginTop: 6,
                  }}
                >
                  {s.l}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {item.summary && <p className="drawer-text">{item.summary}</p>}
      <DrawerObservation observation={item.observation} />
      {item.provenance?.derivation_note && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            background: "var(--ink-soft)",
            borderRadius: 10,
            fontSize: "var(--t-3)",
            color: "var(--ink-3)",
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "var(--t-1)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--ink-5)",
              marginBottom: 5,
            }}
          >
            Methodology
          </div>
          {item.provenance.derivation_note}
        </div>
      )}
      <div style={{ marginTop: 18 }}>
        <DrawerSourceLine item={item} />
      </div>
    </>
  );
}

function VsDrawer({
  move,
  defensive,
  sectionId,
  clients,
}: {
  move: CompetitorUpdate;
  defensive: DomainSignal | null;
  sectionId: SectionId;
  clients: ClientConfig[];
}) {
  const us = clients.find((c) => c.id === move.client);
  const usName = us ? us.name : "You";
  const themName = move.competitor || move.source || "Competitor";
  const sharedSurface = (() => {
    if (!defensive) return (move.design_surface || [])[0] || "";
    const a = new Set(move.design_surface || []);
    const b = (defensive.design_surface || []).find((s) => a.has(s));
    return b || (move.design_surface || [])[0] || "";
  })();
  return (
    <>
      <DrawerHead item={move} sectionId={sectionId} clients={clients} />
      <h2 className="drawer-title">
        Conflict on <em>{sharedSurface || "a shared surface"}</em>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "10px 0 18px" }}>
        <div
          style={{
            padding: "14px 16px",
            background: "#fafaf6",
            border: "1px solid var(--hairline-2)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "var(--t-1)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--ink-5)",
              marginBottom: 4,
            }}
          >
            {usName} · holds
          </div>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: "var(--t-5)",
              lineHeight: 1.32,
              color: "var(--ink)",
            }}
          >
            {defensive ? stripPlatformPrefix(defensive.title) : "No matched defensive signal in current refresh."}
          </div>
        </div>
        <div
          style={{
            padding: "14px 16px",
            background: "var(--paper)",
            border: "1px solid var(--hairline-2)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "var(--t-1)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--ink-5)",
              marginBottom: 4,
            }}
          >
            {themName} · move
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: "var(--t-5)", lineHeight: 1.32 }}>
            {stripPlatformPrefix(move.title)}
          </div>
        </div>
      </div>
      {move.summary && <p className="drawer-text">{move.summary}</p>}
      <DrawerObservation observation={move.observation} />
      {defensive && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--hairline-2)" }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "var(--t-1)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--ink-5)",
              marginBottom: 6,
            }}
          >
            Defensive signal
          </div>
          <div style={{ fontSize: "var(--t-3)", color: "var(--ink-2)", lineHeight: 1.6 }}>{defensive.summary || ""}</div>
          {defensive.source && (
            <div className="drawer-source" style={{ marginTop: 8 }}>
              {defensive.source}
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 18 }}>
        <DrawerSourceLine item={move} />
      </div>
    </>
  );
}

function TweetDrawer({ item, sectionId, clients }: { item: LeaderTweet; sectionId: SectionId; clients: ClientConfig[] }) {
  const e = item.engagement || { replies: 0, likes: 0, retweets: 0 };
  const stats: string[] = [];
  if (e.likes != null) stats.push(num(e.likes) + " likes");
  if (e.replies != null) stats.push(num(e.replies) + " replies");
  if (e.retweets != null) stats.push(num(e.retweets) + " RTs");
  return (
    <>
      <DrawerHead item={item} sectionId={sectionId} clients={clients} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 14px" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: "var(--t-5)",
            background: avatarBg(item.author_name || ""),
          }}
        >
          {initials(item.author_name || "")}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: "var(--t-4)", color: "var(--ink)" }}>{item.author_name}</div>
          <div style={{ fontSize: "var(--t-3)", color: "var(--ink-4)" }}>
            {item.author_handle}
            {item.author_role ? " · " + item.author_role : ""}
          </div>
        </div>
      </div>
      {item.tweet_text && <div className="drawer-quote">{item.tweet_text}</div>}
      <DrawerObservation observation={item.observation} />
      {stats.length > 0 && (
        <div style={{ marginTop: 8, fontSize: "var(--t-2)", color: "var(--ink-4)", fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
          {stats.join(" · ")}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <DrawerSourceLine item={item} />
      </div>
    </>
  );
}

function RedditDrawer({ item, sectionId, clients }: { item: RedditThread; sectionId: SectionId; clients: ClientConfig[] }) {
  const meta: string[] = [];
  if (item.subreddit) meta.push(item.subreddit);
  if (item.comment_count) meta.push(item.comment_count + " comments");
  if (item.upvotes) meta.push(num(item.upvotes) + " upvotes");
  return (
    <>
      <DrawerHead item={item} sectionId={sectionId} clients={clients} />
      {item.top_comment_excerpt && (
        <div
          style={{
            margin: "8px 0 16px",
            padding: "18px 22px",
            background: "#fafaf6",
            borderLeft: "3px solid #d5d5d0",
            borderRadius: "0 12px 12px 0",
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontSize: "var(--t-5)",
            lineHeight: 1.5,
            color: "var(--ink)",
          }}
        >
          {item.top_comment_excerpt}
        </div>
      )}
      <h2 className="drawer-title" style={{ fontSize: "var(--t-6)" }}>{stripPlatformPrefix(item.title)}</h2>
      {item.summary && <p className="drawer-text">{item.summary}</p>}
      <DrawerObservation observation={item.observation} />
      {meta.length > 0 && (
        <div style={{ marginTop: 12, fontSize: "var(--t-2)", color: "var(--ink-4)", fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
          {meta.join(" · ")}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <DrawerSourceLine item={item} />
      </div>
    </>
  );
}

function VisualDrawer({ item, sectionId, clients, metaConfig }: { item: VisualInspiration; sectionId: SectionId; clients: ClientConfig[]; metaConfig: MetaConfig }) {
  const accent = domainFor(item.client, clients).color;
  const hasRealImage = !!(item.thumbnail_url && (item.thumbnail_url.startsWith("data:") || item.thumbnail_url.startsWith("http") || item.thumbnail_url.startsWith("/")));
  return (
    <>
      {hasRealImage ? (
        <div
          className="drawer-thumb"
          style={{
            backgroundImage: `url('${item.thumbnail_url}')`,
          }}
        />
      ) : (
        <div className="drawer-thumb" style={visualBgStyle(item, metaConfig)}>
          <MockupSvg pattern={item.pattern} accent={accent} />
        </div>
      )}
      <DrawerHead item={item} sectionId={sectionId} clients={clients} />
      <h2 className="drawer-title">{stripPlatformPrefix(item.title)}</h2>
      {item.pattern && (
        <div style={{ margin: "6px 0 10px" }}>
          <span className="tag" style={{ background: "#f0f0eb", color: "#4a4a44" }}>
            #{item.pattern}
          </span>
        </div>
      )}
      {item.pattern_caption && (
        <div
          style={{
            background: "var(--ink)",
            color: "#fff",
            padding: "14px 16px",
            borderRadius: 10,
            margin: "10px 0 16px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "var(--t-1)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.55)",
              marginBottom: 6,
            }}
          >
            What to notice
          </div>
          <div style={{ fontSize: "var(--t-3)", lineHeight: 1.5 }}>{item.pattern_caption}</div>
        </div>
      )}
      {item.summary && <p className="drawer-text">{item.summary}</p>}
      {item.relevance_note && (
        <div
          style={{
            padding: "14px 16px",
            background: "var(--ink-soft)",
            borderRadius: 10,
            margin: "14px 0",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "var(--t-1)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--ink-5)",
              marginBottom: 5,
            }}
          >
            Why this pattern matters
          </div>
          <div style={{ fontSize: "var(--t-3)", color: "var(--ink-2)", lineHeight: 1.6 }}>{item.relevance_note}</div>
        </div>
      )}
      <DrawerObservation observation={item.observation} />
      <div style={{ marginTop: 14 }}>
        <DrawerSourceLine item={item} />
      </div>
    </>
  );
}

function PodcastDrawer({ item, sectionId, clients }: { item: LennyPodcast; sectionId: SectionId; clients: ClientConfig[] }) {
  return (
    <>
      <DrawerHead item={item} sectionId={sectionId} clients={clients} />
      {item.quote && (
        <div className="drawer-quote" style={{ fontSize: "var(--t-5)", padding: "14px 0 14px 18px" }}>
          {item.quote}
        </div>
      )}
      {item.guest_name && (
        <div style={{ fontSize: "var(--t-3)", color: "var(--ink-3)", margin: "0 0 14px" }}>
          — {item.guest_name}
          {item.guest_role ? ", " + item.guest_role : ""}
        </div>
      )}
      {item.episode_title && (
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--t-4)",
            fontStyle: "italic",
            color: "var(--ink-2)",
            margin: "14px 0 4px",
          }}
        >
          &quot;{item.episode_title}&quot;
        </div>
      )}
      {item.summary && <p className="drawer-text">{item.summary}</p>}
      {item.quote_context && (
        <div style={{ fontSize: "var(--t-3)", color: "var(--ink-3)", lineHeight: 1.6, marginTop: 8 }}>
          {item.quote_context}
        </div>
      )}
      <DrawerObservation observation={item.observation} />
      <div style={{ marginTop: 14 }}>
        <DrawerSourceLine item={item} />
      </div>
    </>
  );
}

function ToolDrawer({ item, sectionId, clients }: { item: DesignToolNews; sectionId: SectionId; clients: ClientConfig[] }) {
  const subtype =
    item.subtype === "major-release" ? "Release"
      : item.subtype === "emerging-tool" ? "New tool"
        : item.subtype === "plugin-system" ? "Plugin"
          : item.subtype === "essay-opinion" ? "Essay"
            : "Update";
  return (
    <>
      <DrawerHead item={item} sectionId={sectionId} clients={clients} />
      <h2 className="drawer-title">{stripPlatformPrefix(item.title)}</h2>
      <div
        style={{
          margin: "4px 0 14px",
          fontFamily: "var(--mono)",
          fontSize: "var(--t-2)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
        }}
      >
        {item.tool || ""} · {subtype}
      </div>
      {item.summary && <p className="drawer-text">{item.summary}</p>}
      <DrawerObservation observation={item.observation} />
      <div style={{ marginTop: 14 }}>
        <DrawerSourceLine item={item} />
      </div>
    </>
  );
}

function DefaultDrawer({ item, sectionId, clients }: { item: AnyItem; sectionId: SectionId; clients: ClientConfig[] }) {
  return (
    <>
      <DrawerHead item={item} sectionId={sectionId} clients={clients} />
      <h2 className="drawer-title">{stripPlatformPrefix(item.title)}</h2>
      {item.summary && <p className="drawer-text">{item.summary}</p>}
      <DrawerObservation observation={item.observation} />
      <div style={{ marginTop: 14 }}>
        <DrawerSourceLine item={item} />
      </div>
    </>
  );
}

// Build the section-specific drawer body. The drawer is always mounted; only
// visible when `drawer` is set in context.
export function Drawer({ clients, metaConfig }: { clients: ClientConfig[]; metaConfig: MetaConfig }) {
  const { drawer, closeDrawer, itemIndex, payload } = useSignals();
  const open = !!drawer;
  let body: React.ReactNode = null;
  if (drawer) {
    const found = itemIndex[drawer.itemId];
    if (found) {
      const { item, sectionId } = found;
      if (sectionId === "domain-signals") body = <StatDrawer item={item as DomainSignal} sectionId={sectionId} clients={clients} />;
      else if (sectionId === "competitor-updates") {
        const move = item as CompetitorUpdate;
        // Match a defensive signal
        const defensive = move.direct_threat
          ? findMatchedDefensive(move, payload.sections["domain-signals"].items as DomainSignal[])
          : null;
        body = defensive
          ? <VsDrawer move={move} defensive={defensive} sectionId={sectionId} clients={clients} />
          : <DefaultDrawer item={item} sectionId={sectionId} clients={clients} />;
      } else if (sectionId === "leader-tweets") body = <TweetDrawer item={item as LeaderTweet} sectionId={sectionId} clients={clients} />;
      else if (sectionId === "reddit-threads") body = <RedditDrawer item={item as RedditThread} sectionId={sectionId} clients={clients} />;
      else if (sectionId === "visual-inspiration") body = <VisualDrawer item={item as VisualInspiration} sectionId={sectionId} clients={clients} metaConfig={metaConfig} />;
      else if (sectionId === "lenny-podcast") body = <PodcastDrawer item={item as LennyPodcast} sectionId={sectionId} clients={clients} />;
      else if (sectionId === "design-tool-news") body = <ToolDrawer item={item as DesignToolNews} sectionId={sectionId} clients={clients} />;
      else body = <DefaultDrawer item={item} sectionId={sectionId} clients={clients} />;
    }
  }
  return (
    <>
      <div
        className={`drawer-bg${open ? " open" : ""}`}
        onClick={closeDrawer}
      />
      <aside
        className={`drawer${open ? " open" : ""}`}
        aria-hidden={!open}
      >
        <div className="drawer-head">
          <span className="drawer-head-label">Deep read</span>
          <button type="button" className="drawer-close" onClick={closeDrawer} title="Close">
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>
        <div className="drawer-body">{body}</div>
      </aside>
    </>
  );
}

// Helper used by the drawer + the vs-card renderer in cards.tsx.
export function findMatchedDefensive(move: CompetitorUpdate, domainItems: DomainSignal[]): DomainSignal | null {
  const targetClient = move.client;
  const targetSurfaces = new Set(move.design_surface || []);
  if (!targetClient || targetClient === "all" || !targetSurfaces.size) return null;
  const candidates = domainItems.filter((it) => {
    if (it.client !== targetClient) return false;
    return (it.design_surface || []).some((s) => targetSurfaces.has(s));
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const s = (b.strength || 0) - (a.strength || 0);
    if (s !== 0) return s;
    return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
  });
  return candidates[0];
}
