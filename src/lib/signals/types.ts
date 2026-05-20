// Single source of truth for the Signals module schema.
//
// This file owns:
//   - the 16-surface controlled vocabulary (used by validation + filters + UI)
//   - the 7 section ids + threads
//   - every per-section item shape
//   - the wire format the dashboard reads (one row per section in Supabase
//     stores the JSON shape this file describes)
//
// docs/data-schema.md in the signals-final bundle is the historical contract;
// this file is the runtime contract. They must stay in sync — when the dashboard
// renderer needs a field, it imports from here. When the playbook prompts ask
// Claude to fill a field, they reference this file's shape.

export const SCHEMA_VERSION = 2;

// ---------------------------------------------------------------------------
// Design surfaces — the 16-enum filter dimension.
// Keep in lockstep with docs/voice-and-strength.md.
// ---------------------------------------------------------------------------
export const DESIGN_SURFACES = [
  "home",
  "ia-navigation",
  "discovery",
  "search",
  "pdp",
  "checkout",
  "pricing-display",
  "tracking",
  "agent-state",
  "reporting",
  "reconciliation",
  "onboarding",
  "empty-states",
  "notifications",
  "loyalty",
  "personalization",
  "motion",
] as const;
export type DesignSurface = (typeof DESIGN_SURFACES)[number];
export const DESIGN_SURFACE_SET: ReadonlySet<DesignSurface> = new Set(DESIGN_SURFACES);

// ---------------------------------------------------------------------------
// Section ids — the 7 research sections + 1 synthesis section.
// ---------------------------------------------------------------------------
export const SECTION_IDS = [
  "domain-signals",
  "competitor-updates",
  "leader-tweets",
  "design-tool-news",
  "visual-inspiration",
  "lenny-podcast",
  "reddit-threads",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];
export type SynthesisSectionId = "threads";
export type AnySectionId = SectionId | SynthesisSectionId;

// Human-readable labels used on the dashboard (dividers, drawer chrome,
// run-log header, masthead health, bento tile section tags).
export const SECTION_LABELS: Record<AnySectionId, string> = {
  "domain-signals": "Market signals",
  "competitor-updates": "What competitors shipped",
  "leader-tweets": "What people are posting",
  "design-tool-news": "Tools and reading",
  "visual-inspiration": "Visual references",
  "lenny-podcast": "Podcast pick",
  "reddit-threads": "Community reactions",
  threads: "Cross-section threads",
};

// Short labels used inside compact UI (bento tile chip, "See also" connection
// row, run-log section title fallback). One word where possible.
export const SECTION_SHORT_LABELS: Record<AnySectionId, string> = {
  "domain-signals": "Market",
  "competitor-updates": "Competitors",
  "leader-tweets": "Posts",
  "design-tool-news": "Tools",
  "visual-inspiration": "Visuals",
  "lenny-podcast": "Podcast",
  "reddit-threads": "Community",
  threads: "Threads",
};

export type Strength = 1 | 2 | 3;
export type Confidence = "primary" | "secondary";
export type SignalType = "market" | "regulatory" | "behavioral" | "product";
export type UpdateType =
  | "feature-launch"
  | "pricing"
  | "market-expansion"
  | "partnership"
  | "funding"
  | "strategic-shift";
export type ToolSubtype =
  | "major-release"
  | "emerging-tool"
  | "plugin-system"
  | "essay-opinion";
export type VisualPlatform =
  | "mobbin"
  | "dribbble"
  | "behance"
  | "pinterest"
  | "savee"
  | "sitesee";

// ---------------------------------------------------------------------------
// Provenance + run log — drives the "How this was picked" drawer + popover.
// ---------------------------------------------------------------------------
export interface Provenance {
  skill: string;
  primary_source_url: string;
  derivation_note: string;
}

export interface RejectionReason {
  reason: string;
  count: number;
}

export interface RunLog {
  items_shipped: number;
  candidates_rejected: number;
  rejection_reasons: RejectionReason[];
  queries_run: string[];
  notes?: string;
}

// Skill-authored stat tile used in stat-card + bento hero + drawer.
export interface HeroStat {
  n: string; // headline number / phrase
  l: string; // small uppercase label
}

// ---------------------------------------------------------------------------
// Card shared shape. Every item in every section satisfies ItemBase, plus
// per-section extras declared below.
// ---------------------------------------------------------------------------
export interface ItemBase {
  id: string;
  /** client id from meta.clients, or "all" for cross-client signals. */
  client: string;
  source: string;
  source_url: string;
  /** ISO 8601 of when the underlying content was published. */
  published_at: string;
  /** Observational, past tense, factual, ≤ 90 chars. */
  title: string;
  /** Plain English supporting detail. 90-180 chars. */
  summary: string;
  /** Neutral single notable point. No imperatives. ≤ 160 chars. Optional. */
  observation?: string;
  /** 1-2 surfaces this card touches. */
  design_surface: DesignSurface[];
  strength: Strength;
  provenance: Provenance;
  tags?: string[];
  /** Other item ids this signal genuinely relates to. */
  connections?: string[];
  /** Skill-authored stats — for hero / bento / drawer. Up to 4. */
  hero_stats?: HeroStat[];
  /** Title phrases that should render in serif italic accent. Up to 3. */
  hero_emphasis?: string[];
  /** Cross-section theme keywords (used by bento topic chips + threads). */
  theme_keywords?: string[];
}

export interface DomainSignal extends ItemBase {
  signal_type: SignalType;
  confidence: Confidence;
}

export interface CompetitorUpdate extends ItemBase {
  competitor: string;
  update_type: UpdateType;
  direct_threat: boolean;
}

export interface LeaderTweet extends ItemBase {
  author_name: string;
  author_handle: string;
  author_role: string;
  /** Full tweet text, up to 280 chars. */
  tweet_text: string;
  engagement: { replies: number; likes: number; retweets: number };
  is_thread: boolean;
}

export interface DesignToolNews extends ItemBase {
  subtype: ToolSubtype;
  tool: string;
  try_it_url?: string;
}

export interface VisualInspiration extends ItemBase {
  platform: VisualPlatform;
  /** What pattern this exemplifies (kebab-case). */
  pattern: string;
  /** Why this pattern matters for the client right now. */
  relevance_note: string;
  /** 3-6 word caption describing what to notice. */
  pattern_caption: string;
  thumbnail_url?: string;
  /** Alternate URL the thumbnail fetcher tries first. */
  fetch_url_override?: string;
  /** CSS gradient string fallback when no thumbnail and no mockup applies. */
  gradient?: string;
}

export interface LennyPodcast extends ItemBase {
  episode_title: string;
  guest_name: string;
  guest_role: string;
  episode_url: string;
  /** 50-300 chars verbatim. */
  quote: string;
  /** One line of setup so the quote lands. */
  quote_context: string;
  /** True if this is the previous run's quote held over. */
  is_carry_over?: boolean;
}

export interface RedditThread extends ItemBase {
  subreddit: string;
  comment_count: number;
  upvotes: number;
  top_comment_excerpt?: string;
}

// Discriminated union keyed by SectionId; the renderer narrows on section id.
export type ItemFor<S extends SectionId> = S extends "domain-signals"
  ? DomainSignal
  : S extends "competitor-updates"
    ? CompetitorUpdate
    : S extends "leader-tweets"
      ? LeaderTweet
      : S extends "design-tool-news"
        ? DesignToolNews
        : S extends "visual-inspiration"
          ? VisualInspiration
          : S extends "lenny-podcast"
            ? LennyPodcast
            : S extends "reddit-threads"
              ? RedditThread
              : never;

export type AnyItem =
  | DomainSignal
  | CompetitorUpdate
  | LeaderTweet
  | DesignToolNews
  | VisualInspiration
  | LennyPodcast
  | RedditThread;

// ---------------------------------------------------------------------------
// Section wrapper — what each row in signals_sections stores in its `data`
// JSONB. Mirrors the per-section JSON file the original build.js consumed.
// ---------------------------------------------------------------------------
export interface SectionData<TItem extends ItemBase = AnyItem> {
  section: SectionId;
  schema_version: number;
  generated_at: string;
  run_log: RunLog;
  items: TItem[];
}

// ---------------------------------------------------------------------------
// Cross-section synthesis (threads).
// ---------------------------------------------------------------------------
export interface SignalRef {
  /** Id of the underlying item; must resolve in this refresh. */
  id: string;
  /** Which section the underlying item lives in (denormalized for fast lookups). */
  section: SectionId;
}

export interface Thread {
  id: string;
  /** Sentence about what's happening (not a label). ≤ 90 chars target. */
  frame: string;
  strength: Strength;
  /** Dominant client id or "all". */
  client_tag: string;
  design_surface: DesignSurface[];
  theme_keywords: string[];
  signal_refs: SignalRef[];
  /** 240-360 chars digest citing specific signals. */
  summary: string;
  provenance: Provenance;
}

export interface ThreadsData {
  schema_version: number;
  generated_at: string;
  /** Top-of-page summary. 110-180 chars. */
  briefing_line: string;
  items: Thread[];
  run_log: RunLog;
}

// ---------------------------------------------------------------------------
// Meta — clients, freshness, cross-domain voices. One row in signals_meta.
// ---------------------------------------------------------------------------
export interface ClientConfig {
  id: string;
  name: string;
  /** One-line tagline rendered in run-log popover + admin UI. */
  tagline?: string;
  /** Hex color for the domain dot + tint. */
  color: string;
  /** Research seeds. */
  tags: string[];
  /** Competitor watchlist. */
  competitors: string[];
  /** Operator handles to track on X. */
  leader_handles: string[];
  /** Optional list of subreddits to watch for this client. */
  subreddit_watchlist?: string[];
}

export interface CrossDomainVoice {
  handle: string;
  name: string;
  role: string;
}

export interface SectionFreshness {
  last_attempt: string | null;
  last_success: string | null;
  degraded: boolean;
  items_kept: number;
  error?: string;
}

export interface MetaConfig {
  last_full_refresh: string | null;
  clients: ClientConfig[];
  cross_domain_voices: CrossDomainVoice[];
  /** Per-section freshness. Threads also tracked here. */
  section_freshness: Partial<Record<AnySectionId, SectionFreshness>>;
}

// ---------------------------------------------------------------------------
// Bookmarks — one row per user × item.
// ---------------------------------------------------------------------------
export interface SignalsBookmark {
  user_id: string;
  /** Item id from any section. */
  item_id: string;
  section_id: SectionId;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Combined dashboard payload returned by GET /api/signals.
// ---------------------------------------------------------------------------
export interface DashboardPayload {
  meta: MetaConfig;
  sections: {
    "domain-signals": SectionData<DomainSignal>;
    "competitor-updates": SectionData<CompetitorUpdate>;
    "leader-tweets": SectionData<LeaderTweet>;
    "design-tool-news": SectionData<DesignToolNews>;
    "visual-inspiration": SectionData<VisualInspiration>;
    "lenny-podcast": SectionData<LennyPodcast>;
    "reddit-threads": SectionData<RedditThread>;
  };
  threads: ThreadsData | null;
  /** Item ids the current user has bookmarked. Empty when unauthenticated. */
  bookmarks: string[];
}

// ---------------------------------------------------------------------------
// Empty / initial state — used when a section has never run or when a row
// is missing entirely. Keep behaviour predictable so the renderer doesn't
// have to guard every access.
// ---------------------------------------------------------------------------
export function emptyRunLog(): RunLog {
  return {
    items_shipped: 0,
    candidates_rejected: 0,
    rejection_reasons: [],
    queries_run: [],
  };
}

export function emptySection<S extends SectionId>(section: S): SectionData<ItemFor<S>> {
  return {
    section,
    schema_version: SCHEMA_VERSION,
    generated_at: new Date(0).toISOString(),
    run_log: emptyRunLog(),
    items: [] as ItemFor<S>[],
  };
}

export function emptyMeta(): MetaConfig {
  return {
    last_full_refresh: null,
    clients: [],
    cross_domain_voices: [],
    section_freshness: {},
  };
}
