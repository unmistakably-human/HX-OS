"use client";

// All card variants for the Signals dashboard.
//
// Each card matches a render function from signals-final/dashboard.html:
//   StatCard       ← statCardEl       (domain-signals)
//   VsCard         ← vsCardEl         (competitor head-to-head with defensive pair)
//   WatchCard      ← watchCardEl      (competitor non-paired)
//   TweetCard      ← tweetCardEl      (leader-tweets)
//   QuoteLedCard   ← quoteLedCardEl   (reddit-threads)
//   VisualCard     ← visualCardEl     (visual-inspiration; uses MockupSvg)
//   BentoTile      ← renderBentoTile  (hero)
//   SpotlightCard  ← renderClosing    (closing spotlight, full-width)
//   BriefBlock     ← renderBrief      (lenny + design-tool-news combined)
//
// Helpers exported here so other components can re-render the same shapes
// inside the section-view drill and bookmarks page.

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
import { useSignals } from "./context";
import {
  avatarBg,
  cleanRedditTitle,
  CROSS_DOMAIN,
  domainFor,
  extractStats,
  fmtRelDate,
  initials,
  looksNumeric,
  num,
  stripPlatformPrefix,
  visualBgStyle,
} from "./utils";
import { MockupSvg } from "./mockups";
import { SECTION_SHORT_LABELS, type SectionId as SectionIdT } from "@/lib/signals/types";

// ---------------------------------------------------------------------------
// Tag — domain badge.
// ---------------------------------------------------------------------------
export function Tag({ clientId, clients }: { clientId: string; clients: ClientConfig[] }) {
  const d = domainFor(clientId, clients);
  return (
    <span
      className="tag"
      style={{ background: d.bg, color: d.color }}
    >
      {d.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// BookmarkButton — star toggle on every card.
// ---------------------------------------------------------------------------
export function BookmarkButton({ itemId, sectionId }: { itemId: string; sectionId: SectionId }) {
  const { isBookmarked, toggleBookmark } = useSignals();
  const filled = isBookmarked(itemId);
  return (
    <button
      type="button"
      className={`bookmark-btn${filled ? " is-bookmarked" : ""}`}
      title={filled ? "Remove bookmark" : "Bookmark this"}
      onClick={(e) => {
        e.stopPropagation();
        void toggleBookmark(itemId, sectionId);
      }}
    >
      {filled ? (
        <svg viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 1.5l1.7 3.5 3.8.5-2.7 2.7.6 3.8L7 10.2 3.6 12l.6-3.8L1.5 5.5l3.8-.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 1.5l1.7 3.5 3.8.5-2.7 2.7.6 3.8L7 10.2 3.6 12l.6-3.8L1.5 5.5l3.8-.5z" />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ConnectionsRow — "See also" cross-section links. Quality-filtered.
// ---------------------------------------------------------------------------
export function ConnectionsRow({ item }: { item: AnyItem }) {
  const { itemIndex, openDrawer } = useSignals();
  if (!Array.isArray(item.connections) || !item.connections.length) return null;
  const sourceSection = itemIndex[item.id]?.sectionId ?? null;
  const refs = item.connections
    .map((id) => itemIndex[id])
    .filter((r): r is { item: AnyItem; sectionId: SectionId } => !!r)
    .filter((r) => !sourceSection || r.sectionId !== sourceSection)
    .slice(0, 2);
  if (!refs.length) return null;
  return (
    <div className="connections-row">
      <div className="conn-label">See also</div>
      <div className="conn-list">
        {refs.map((r) => {
          const title = stripPlatformPrefix(r.item.title);
          const short = title.length > 60 ? title.slice(0, 57) + "…" : title;
          const label = SECTION_SHORT_LABELS[r.sectionId].toLowerCase();
          return (
            <button
              key={r.item.id}
              type="button"
              className="conn-jump"
              onClick={(e) => {
                e.stopPropagation();
                openDrawer(r.sectionId, r.item.id);
              }}
            >
              <span className="conn-section">{label}</span>
              <span className="conn-title">{short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyCard — preserved section rhythm on slow weeks.
// ---------------------------------------------------------------------------
export function EmptyCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="empty-card">
      <span className="label">{label}</span>
      <span className="body">{body}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardWrapper — handles read state, click, position-relative for absolute
// children (bookmark button).
// ---------------------------------------------------------------------------
function CardWrapper({
  itemId,
  sectionId,
  className,
  style,
  children,
}: {
  itemId: string;
  sectionId: SectionId;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { openDrawer, isRead } = useSignals();
  const read = isRead(itemId);
  return (
    <div
      className={`${className}${read ? " read" : ""}`}
      style={style}
      onClick={() => openDrawer(sectionId, itemId)}
    >
      {children}
      <BookmarkButton itemId={itemId} sectionId={sectionId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard — domain-signals
// ---------------------------------------------------------------------------
export function StatCard({ item, clients }: { item: DomainSignal; clients: ClientConfig[] }) {
  const d = domainFor(item.client, clients);
  const stats = (Array.isArray(item.hero_stats) && item.hero_stats.length
    ? item.hero_stats
    : extractStats((item.title || "") + " · " + (item.summary || "") + " · " + (item.observation || "")))
    .filter((s) => s && looksNumeric(s.n))
    .slice(0, 3);
  const title = stripPlatformPrefix(item.title);
  const text = item.summary || item.observation || "";
  const source = (item.source || "") + (item.published_at ? " · " + fmtRelDate(item.published_at) : "");
  return (
    <CardWrapper itemId={item.id} sectionId="domain-signals" className="stat-card">
      {title && <h3 className="stat-card-title">{title}</h3>}
      {text && <p className="stat-card-context">{text}</p>}
      {stats.length > 0 && (
        <div className="stat-card-stats">
          {stats.map((s, i) => (
            <div key={i} className="stat-card-stat">
              <span className="stat-card-stat-n">{s.n}</span>
              {s.l && <span className="stat-card-stat-l">{s.l}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="stat-card-foot">
        <span className="stat-card-client" style={{ color: d.color }}>{d.label}</span>
        {source && <span className="stat-card-meta">{source}</span>}
      </div>
      <ConnectionsRow item={item} />
    </CardWrapper>
  );
}

// ---------------------------------------------------------------------------
// VsCard — competitor head-to-head paired with a defensive domain-signal.
// ---------------------------------------------------------------------------
export function VsCard({
  move,
  defensive,
  clients,
}: {
  move: CompetitorUpdate;
  defensive: DomainSignal;
  clients: ClientConfig[];
}) {
  const d = domainFor(move.client, clients);
  const us = clients.find((c) => c.id === move.client);
  const usName = us ? us.name : "You";
  const themName = move.competitor || move.source || "Competitor";
  const sharedSurface = (() => {
    const a = new Set(move.design_surface || []);
    const b = (defensive.design_surface || []).find((s) => a.has(s));
    return b || (move.design_surface || [])[0] || "";
  })();
  const obs = move.observation && move.observation !== move.summary ? move.observation : "";
  const { openDrawer, isRead } = useSignals();
  const read = isRead(move.id);
  return (
    <div
      className={`vs-card${read ? " read" : ""}`}
      onClick={() => openDrawer("competitor-updates", move.id)}
    >
      <div className="vs-card-head">
        <Tag clientId={move.client} clients={clients} />
        <span className="vs-card-format">Direct hit · {sharedSurface || "shared surface"}</span>
      </div>
      <div className="vs-card-body">
        <div
          className="vs-side left"
          onClick={(e) => {
            e.stopPropagation();
            openDrawer("domain-signals", defensive.id);
          }}
        >
          <span className="vs-side-label">{usName} · holds</span>
          <span className="vs-side-name">{usName}</span>
          <p className="vs-side-text">{stripPlatformPrefix(defensive.title)}</p>
        </div>
        <div className="vs-arrow">vs</div>
        <div className="vs-side right">
          <span className="vs-side-label">{themName} · move</span>
          <span className="vs-side-name">{themName}</span>
          <p className="vs-side-text">{stripPlatformPrefix(move.title)}</p>
        </div>
      </div>
      {obs && (
        <div className="vs-card-foot">
          <strong>Observation</strong> · {obs}
        </div>
      )}
      {Array.isArray(move.connections) && move.connections.length > 0 && (
        <div style={{ padding: "0 20px 12px" }}>
          <ConnectionsRow item={move} />
        </div>
      )}
      <BookmarkButton itemId={move.id} sectionId="competitor-updates" />
      <span style={{ display: "none" }}>{d.color}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WatchCard — competitor non-paired.
// ---------------------------------------------------------------------------
export function WatchCard({ item, clients }: { item: CompetitorUpdate; clients: ClientConfig[] }) {
  const d = domainFor(item.client, clients);
  const accent = d.color;
  const competitor = item.competitor || item.source || "Competitor";
  const surface = (item.design_surface && item.design_surface[0]) || "";
  const verb = item.direct_threat ? "moved on" : "shipped";
  return (
    <CardWrapper
      itemId={item.id}
      sectionId="competitor-updates"
      className="watch-card"
      style={{ borderLeftColor: accent }}
    >
      <div className="watch-card-headline">
        <span className="watch-card-name">{competitor}</span>
        {surface && (
          <span className="watch-card-on">
            {verb} <b>{surface}</b>
          </span>
        )}
      </div>
      <p className="watch-card-title">{stripPlatformPrefix(item.title)}</p>
      {(item.observation || item.summary) && (
        <p className="watch-card-text">{item.observation || item.summary || ""}</p>
      )}
      <div className="watch-card-foot">
        <span className="watch-card-client" style={{ color: accent }}>vs {d.label}</span>
        {item.direct_threat ? (
          <span className="watch-card-threat">Direct threat</span>
        ) : (
          <span className="watch-card-threat watch-card-threat-low">Watching</span>
        )}
      </div>
      <ConnectionsRow item={item} />
    </CardWrapper>
  );
}

// ---------------------------------------------------------------------------
// TweetCard — leader-tweets.
// ---------------------------------------------------------------------------
function tweetBody(text: string): React.ReactNode {
  // Highlight @mentions in blue while leaving the rest as text.
  const parts = text.split(/(@[A-Za-z0-9_]+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} style={{ color: "#1d4ed8" }}>
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function TweetCard({ item }: { item: LeaderTweet }) {
  const name = item.author_name || item.author_handle;
  const time = item.published_at ? fmtRelDate(item.published_at) : "";
  const e = item.engagement || { replies: 0, likes: 0, retweets: 0 };
  return (
    <CardWrapper itemId={item.id} sectionId="leader-tweets" className="tweet">
      <div className="tweet-head">
        <div className="tweet-avatar" style={{ background: avatarBg(name) }}>
          {initials(name)}
        </div>
        <div className="tweet-id">
          <div className="tweet-name">
            {name}
            <span className="tweet-verified">
              <svg width={10} height={10} viewBox="0 0 24 24" fill="white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          </div>
          <div className="tweet-handle">{item.author_handle}</div>
        </div>
        <svg className="tweet-x" width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
      <div className="tweet-body">{tweetBody(item.tweet_text || "")}</div>
      <div className="tweet-actions">
        <span className="tweet-action">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
          {num(e.replies)}
        </span>
        <span className="tweet-action">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
          {num(e.retweets)}
        </span>
        <span className="tweet-action">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          {num(e.likes)}
        </span>
        <span className="tweet-time">{time}</span>
      </div>
      <ConnectionsRow item={item} />
    </CardWrapper>
  );
}

// ---------------------------------------------------------------------------
// QuoteLedCard — reddit-threads.
// ---------------------------------------------------------------------------
export function QuoteLedCard({ item, clients }: { item: RedditThread; clients: ClientConfig[] }) {
  const d = domainFor(item.client, clients);
  const hasQuote = !!item.top_comment_excerpt;
  const cleanTitle = cleanRedditTitle(item.title, item.subreddit, item.comment_count);
  const bylineParts: string[] = [];
  if (item.comment_count) bylineParts.push(num(item.comment_count) + " comments");
  if (item.subreddit) bylineParts.push(item.subreddit);
  const byline = bylineParts.join(" · ");
  const subline = hasQuote ? item.summary || item.observation || cleanTitle : item.observation || item.summary || "";
  return (
    <CardWrapper itemId={item.id} sectionId="reddit-threads" className="quote-card">
      {byline && <div className="quote-card-byline">{byline}</div>}
      {hasQuote ? (
        <blockquote className="quote-card-quote">{item.top_comment_excerpt}</blockquote>
      ) : cleanTitle ? (
        <p className="quote-card-thread-large">{cleanTitle}</p>
      ) : null}
      {subline && subline !== item.top_comment_excerpt && (
        <p className="quote-card-context">{subline}</p>
      )}
      <div className="quote-card-foot">
        <span className="quote-card-client" style={{ color: d.color }}>{d.label}</span>
        {item.upvotes ? <span className="quote-card-upvotes">{num(item.upvotes)} upvotes</span> : null}
      </div>
      <ConnectionsRow item={item} />
    </CardWrapper>
  );
}

// ---------------------------------------------------------------------------
// VisualCard — visual-inspiration. Uses MockupSvg fallback.
// ---------------------------------------------------------------------------
export function VisualCard({ item, clients, meta }: { item: VisualInspiration; clients: ClientConfig[]; meta: MetaConfig }) {
  const accent = domainFor(item.client, clients).color;
  const tags = (item.tags || item.design_surface || []).slice(0, 3);
  const hasRealImage = !!(item.thumbnail_url && (item.thumbnail_url.startsWith("data:") || item.thumbnail_url.startsWith("http") || item.thumbnail_url.startsWith("/")));
  return (
    <CardWrapper itemId={item.id} sectionId="visual-inspiration" className="visual-card">
      <div className="visual-img-wrap" style={visualBgStyle(item, meta)}>
        {hasRealImage ? (
          <img src={item.thumbnail_url} alt={item.title || ""} />
        ) : (
          <>
            <span className="pattern-ribbon">Pattern preview</span>
            <MockupSvg pattern={item.pattern} accent={accent} />
          </>
        )}
        {item.pattern_caption && (
          <div className="visual-caption">
            <span className="label">What to notice</span>
            {item.pattern_caption}
          </div>
        )}
      </div>
      <div className="visual-meta">
        {item.pattern && <div className="visual-pattern">{item.pattern}</div>}
        <div className="visual-title">{stripPlatformPrefix(item.title)}</div>
        <div className="visual-src">{item.source || ""}</div>
        {tags.length > 0 && (
          <div className="visual-tags">
            {tags.map((t) => (
              <span
                key={t}
                className="visual-chip"
                style={{ color: accent, background: `${accent}14` }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <ConnectionsRow item={item} />
      </div>
    </CardWrapper>
  );
}

// ---------------------------------------------------------------------------
// BentoTile / BentoEmpty — used by the hero.
// ---------------------------------------------------------------------------
export function BentoTile({
  item,
  sectionId,
  sectionLabel,
  clients,
  idx,
}: {
  item: AnyItem;
  sectionId: SectionId;
  sectionLabel: string;
  clients: ClientConfig[];
  idx: number;
}) {
  const { openSectionView } = useSignals();
  const d = domainFor(item.client, clients);
  const brand = item.source || sectionLabel;
  const text = item.summary || item.observation || stripPlatformPrefix(item.title);
  return (
    <div
      className="bento-tile"
      title={`Open ${sectionLabel}`}
      onClick={() => openSectionView(sectionId)}
    >
      <span className="bento-tile-arrow">↗</span>
      <span className="bento-num">{String(idx + 1).padStart(2, "0")}</span>
      <span className="bento-section-tag">
        <span className="bento-tag-dot" style={{ background: d.color }} />
        <span>{sectionLabel}</span>
      </span>
      <p className="bento-text">
        <span className="bento-brand" style={{ color: d.color }}>{brand}:</span> {text}
      </p>
    </div>
  );
}

export function BentoEmpty({ messageTitle, messageBody }: { messageTitle: string; messageBody: string }) {
  return (
    <div className="bento-tile bento-empty">
      <span className="bento-num">—</span>
      <span className="bento-section-tag"><span>{messageTitle}</span></span>
      <p className="bento-empty-text">{messageBody}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpotlightCard — closing thought (full-width tweet).
// ---------------------------------------------------------------------------
export function SpotlightCard({ item }: { item: LeaderTweet }) {
  const { openDrawer } = useSignals();
  const name = item.author_name || item.author_handle;
  const time = item.published_at ? fmtRelDate(item.published_at) : "";
  const e = item.engagement || { replies: 0, likes: 0, retweets: 0 };
  const engagementBits: string[] = [];
  if (e.likes != null) engagementBits.push(`${num(e.likes)} likes`);
  if (e.replies != null) engagementBits.push(`${num(e.replies)} replies`);
  if (e.retweets != null) engagementBits.push(`${num(e.retweets)} RTs`);
  return (
    <div className="spotlight" onClick={() => openDrawer("leader-tweets", item.id)}>
      <div className="spotlight-avatar" style={{ background: avatarBg(name) }}>
        {initials(name)}
      </div>
      <div className="spotlight-r">
        <div className="spotlight-meta">
          <span className="spotlight-author">
            {name}
            <span className="tweet-verified" style={{ marginLeft: 6 }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          </span>
          <span className="spotlight-handle">{item.author_handle}</span>
          <span className="spotlight-format">Spotlight · {time}</span>
        </div>
        <blockquote className="spotlight-quote">{item.tweet_text || item.title}</blockquote>
        <div className="spotlight-foot">
          {item.author_role && <span>{item.author_role}</span>}
          {engagementBits.length > 0 && <span>{engagementBits.join(" · ")}</span>}
          <svg className="spotlight-x" style={{ marginLeft: "auto" }} width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
      </div>
      <BookmarkButton itemId={item.id} sectionId="leader-tweets" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BriefBlock — combined podcast (left) + design-tool-news (right).
// ---------------------------------------------------------------------------
function subtypeLabel(subtype: string | undefined): string {
  if (subtype === "major-release") return "Release";
  if (subtype === "emerging-tool") return "New tool";
  if (subtype === "plugin-system") return "Plugin";
  if (subtype === "essay-opinion") return "Essay";
  return "Update";
}
export function BriefBlock({ podcast, tools }: { podcast: LennyPodcast | null; tools: DesignToolNews[] }) {
  const { openDrawer } = useSignals();
  return (
    <div className="brief">
      {podcast ? (
        <div className="brief-l" onClick={() => openDrawer("lenny-podcast", podcast.id)}>
          <div className="brief-meta">
            <span className="brief-pill">Podcast pick</span>
            {podcast.published_at && (
              <span className="brief-pill" style={{ color: "var(--ink-5)" }}>
                {fmtRelDate(podcast.published_at)}
              </span>
            )}
          </div>
          <blockquote className="brief-quote">{podcast.quote || podcast.title || ""}</blockquote>
          <div className="brief-attr">— {podcast.guest_name}{podcast.guest_role ? `, ${podcast.guest_role}` : ""}</div>
          {podcast.episode_title && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid var(--hairline-2)",
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                fontSize: "var(--t-3)",
                color: "var(--ink-3)",
                lineHeight: 1.45,
              }}
            >
              &quot;{podcast.episode_title}&quot;
            </div>
          )}
          {podcast.quote_context && (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "var(--t-3)",
                color: "var(--ink-2)",
                lineHeight: 1.65,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {podcast.quote_context}
            </p>
          )}
          <BookmarkButton itemId={podcast.id} sectionId="lenny-podcast" />
        </div>
      ) : (
        <div className="brief-l" style={{ cursor: "default" }}>
          <div className="brief-meta">
            <span className="brief-pill">No featured podcast this week</span>
          </div>
        </div>
      )}
      <div className="brief-r">
        <div className="brief-r-label">Tools and essays · {tools.length}</div>
        {tools.map((it, i) => (
          <div
            key={it.id}
            className="brief-tool-row"
            onClick={() => openDrawer("design-tool-news", it.id)}
          >
            <span className="brief-tool-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="brief-tool-content">
              <div className="brief-tool-tool">{(it.tool || subtypeLabel(it.subtype))} · {subtypeLabel(it.subtype)}</div>
              <h4 className="brief-tool-title">{stripPlatformPrefix(it.title)}</h4>
              <p className="brief-tool-text">{it.summary || it.observation || ""}</p>
            </div>
            <BookmarkButton itemId={it.id} sectionId="design-tool-news" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Re-export to keep types/SectionId reachable for downstream files.
export type { SectionIdT };
export const CROSS_DOMAIN_ENTRY = CROSS_DOMAIN;
