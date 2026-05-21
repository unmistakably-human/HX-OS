// Schema validation for skill-produced JSON.
//
// Mirrors the per-section schemas baked into the original signals-final/build.js
// but lifts them into one place. Used by:
//   - the refresh API routes (validate before persisting)
//   - the dashboard read path (defensive parse when reading from Supabase)
//
// The contract: validateSection() returns { ok: true, data } on success or
// { ok: false, errors, dropped } on failure. Items that fail their per-row
// schema are dropped, not rejected wholesale — same behaviour as build.js.

import {
  type AnyItem,
  type AnySectionId,
  type ClientConfig,
  type CompetitorUpdate,
  type CrossDomainVoice,
  DESIGN_SURFACE_SET,
  type DesignSurface,
  type DesignToolNews,
  type DomainSignal,
  type HeroStat,
  type ItemBase,
  type ItemFor,
  type LeaderTweet,
  type LennyPodcast,
  type MetaConfig,
  type Provenance,
  type RedditThread,
  type RunLog,
  type SectionData,
  type SectionFreshness,
  SCHEMA_VERSION,
  SECTION_IDS,
  type SectionId,
  type Strength,
  type Thread,
  type ThreadsData,
  type VisualInspiration,
  type SignalRef,
} from "./types";

export interface ValidationResult<T> {
  ok: boolean;
  data: T;
  errors: string[];
  dropped: { id: string; reason: string }[];
}

// ---------------------------------------------------------------------------
// Primitive validators — small, sharp, no external deps.
// ---------------------------------------------------------------------------
function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function isOptionalString(v: unknown): v is string | undefined {
  return v == null || typeof v === "string";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isArrayOf<T>(v: unknown, pred: (x: unknown) => x is T): v is T[] {
  return Array.isArray(v) && v.every(pred);
}
function isStrength(v: unknown): v is Strength {
  return v === 1 || v === 2 || v === 3;
}
function isDesignSurface(v: unknown): v is DesignSurface {
  return typeof v === "string" && DESIGN_SURFACE_SET.has(v as DesignSurface);
}

function isProvenance(v: unknown): v is Provenance {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return isString(p.skill) && isString(p.primary_source_url) && isString(p.derivation_note);
}

function isHeroStat(v: unknown): v is HeroStat {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return typeof s.n === "string" && typeof s.l === "string";
}

function isRunLog(v: unknown): v is RunLog {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    isNumber(r.items_shipped) &&
    isNumber(r.candidates_rejected) &&
    Array.isArray(r.rejection_reasons) &&
    Array.isArray(r.queries_run)
  );
}

// Required-field validator. Returns missing field names (empty when valid).
function missingFields<T extends object>(obj: T, required: (keyof T)[]): string[] {
  return required
    .filter((k) => {
      const v = obj[k] as unknown;
      return v == null || v === "" || (Array.isArray(v) && v.length === 0);
    })
    .map(String);
}

// ---------------------------------------------------------------------------
// Per-section item validators. Each returns null for invalid (with reason
// appended to the dropped[] log) or the cleaned item.
//
// The cleaning step:
//   - strips design_surface values outside the controlled vocabulary
//   - clamps hero_stats to ≤ 4 well-shaped entries
//   - clamps hero_emphasis to ≤ 3 strings
//   - filters connections to non-empty strings (leaving cross-section ref
//     validation to resolveConnections() in the data layer)
// ---------------------------------------------------------------------------
function cleanBase(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]):
  | (ItemBase & Record<string, unknown>)
  | null {
  const id = String(raw.id || "?");
  const required = ["id", "client", "source", "source_url", "published_at", "title", "summary", "design_surface", "strength", "provenance"] as const;
  const missing = required.filter((k) => {
    const v = raw[k];
    return v == null || v === "" || (Array.isArray(v) && v.length === 0);
  });
  if (missing.length) {
    dropped.push({ id, reason: `missing fields: ${missing.join(", ")}` });
    return null;
  }
  if (!isStrength(raw.strength)) {
    dropped.push({ id, reason: `invalid strength ${String(raw.strength)}` });
    return null;
  }
  if (!isProvenance(raw.provenance)) {
    dropped.push({ id, reason: "invalid provenance (need skill + primary_source_url + derivation_note)" });
    return null;
  }
  // Filter out-of-vocabulary surfaces silently — matches build.js behaviour.
  const surfaces = Array.isArray(raw.design_surface)
    ? (raw.design_surface as unknown[]).filter(isDesignSurface)
    : [];
  if (!surfaces.length) {
    dropped.push({ id, reason: "no in-vocabulary design_surface" });
    return null;
  }
  const cleaned: ItemBase & Record<string, unknown> = {
    ...raw,
    id,
    client: String(raw.client),
    source: String(raw.source),
    source_url: String(raw.source_url),
    published_at: String(raw.published_at),
    title: String(raw.title),
    summary: String(raw.summary),
    observation: isOptionalString(raw.observation) ? (raw.observation as string | undefined) : undefined,
    design_surface: surfaces,
    strength: raw.strength as Strength,
    provenance: raw.provenance as Provenance,
  };
  // Optional fields — soft-clean.
  if (Array.isArray(raw.tags)) cleaned.tags = (raw.tags as unknown[]).filter(isString);
  if (Array.isArray(raw.connections)) cleaned.connections = (raw.connections as unknown[]).filter(isString);
  if (Array.isArray(raw.theme_keywords)) cleaned.theme_keywords = (raw.theme_keywords as unknown[]).filter(isString);
  if (Array.isArray(raw.hero_stats)) {
    cleaned.hero_stats = (raw.hero_stats as unknown[])
      .filter(isHeroStat)
      .slice(0, 4);
  }
  if (Array.isArray(raw.hero_emphasis)) {
    cleaned.hero_emphasis = (raw.hero_emphasis as unknown[])
      .filter(isString)
      .slice(0, 3);
  }
  return cleaned;
}

function cleanDomainSignal(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]): DomainSignal | null {
  const base = cleanBase(raw, dropped);
  if (!base) return null;
  const signal_type = raw.signal_type;
  if (signal_type !== "market" && signal_type !== "regulatory" && signal_type !== "behavioral" && signal_type !== "product") {
    dropped.push({ id: base.id, reason: `invalid signal_type ${String(signal_type)}` });
    return null;
  }
  const confidence = raw.confidence;
  if (confidence !== "primary" && confidence !== "secondary") {
    dropped.push({ id: base.id, reason: `invalid confidence ${String(confidence)}` });
    return null;
  }
  return { ...base, signal_type, confidence } as DomainSignal;
}

function cleanCompetitor(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]): CompetitorUpdate | null {
  const base = cleanBase(raw, dropped);
  if (!base) return null;
  if (!isString(raw.competitor)) {
    dropped.push({ id: base.id, reason: "missing competitor" });
    return null;
  }
  const validUpdateTypes = new Set(["feature-launch", "pricing", "market-expansion", "partnership", "funding", "strategic-shift"]);
  if (!validUpdateTypes.has(String(raw.update_type))) {
    dropped.push({ id: base.id, reason: `invalid update_type ${String(raw.update_type)}` });
    return null;
  }
  return {
    ...base,
    competitor: String(raw.competitor),
    update_type: raw.update_type as CompetitorUpdate["update_type"],
    direct_threat: !!raw.direct_threat,
  };
}

function cleanLeaderTweet(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]): LeaderTweet | null {
  const base = cleanBase(raw, dropped);
  if (!base) return null;
  const required: ("author_name" | "author_handle" | "author_role" | "tweet_text")[] = [
    "author_name", "author_handle", "author_role", "tweet_text",
  ];
  for (const k of required) {
    if (!isString(raw[k])) {
      dropped.push({ id: base.id, reason: `missing ${k}` });
      return null;
    }
  }
  const eng = raw.engagement as Record<string, unknown> | undefined;
  const engagement = {
    replies: isNumber(eng?.replies) ? Number(eng?.replies) : 0,
    likes: isNumber(eng?.likes) ? Number(eng?.likes) : 0,
    retweets: isNumber(eng?.retweets) ? Number(eng?.retweets) : 0,
  };
  return {
    ...base,
    author_name: String(raw.author_name),
    author_handle: String(raw.author_handle),
    author_role: String(raw.author_role),
    tweet_text: String(raw.tweet_text),
    engagement,
    is_thread: !!raw.is_thread,
  };
}

function cleanDesignTool(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]): DesignToolNews | null {
  const base = cleanBase(raw, dropped);
  if (!base) return null;
  const validSubtypes = new Set(["major-release", "emerging-tool", "plugin-system", "essay-opinion"]);
  if (!validSubtypes.has(String(raw.subtype))) {
    dropped.push({ id: base.id, reason: `invalid subtype ${String(raw.subtype)}` });
    return null;
  }
  if (!isString(raw.tool)) {
    dropped.push({ id: base.id, reason: "missing tool" });
    return null;
  }
  return {
    ...base,
    subtype: raw.subtype as DesignToolNews["subtype"],
    tool: String(raw.tool),
    try_it_url: isOptionalString(raw.try_it_url) ? (raw.try_it_url as string | undefined) : undefined,
  };
}

function cleanVisual(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]): VisualInspiration | null {
  const base = cleanBase(raw, dropped);
  if (!base) return null;
  const validPlatforms = new Set(["mobbin", "dribbble", "behance", "pinterest", "savee", "sitesee"]);
  if (!validPlatforms.has(String(raw.platform))) {
    dropped.push({ id: base.id, reason: `invalid platform ${String(raw.platform)}` });
    return null;
  }
  if (!isString(raw.pattern)) {
    dropped.push({ id: base.id, reason: "missing pattern" });
    return null;
  }
  if (!isString(raw.relevance_note)) {
    dropped.push({ id: base.id, reason: "missing relevance_note" });
    return null;
  }
  if (!isString(raw.pattern_caption)) {
    dropped.push({ id: base.id, reason: "missing pattern_caption" });
    return null;
  }
  return {
    ...base,
    platform: raw.platform as VisualInspiration["platform"],
    pattern: String(raw.pattern),
    relevance_note: String(raw.relevance_note),
    pattern_caption: String(raw.pattern_caption),
    thumbnail_url: isOptionalString(raw.thumbnail_url) ? (raw.thumbnail_url as string | undefined) : undefined,
    fetch_url_override: isOptionalString(raw.fetch_url_override) ? (raw.fetch_url_override as string | undefined) : undefined,
    gradient: isOptionalString(raw.gradient) ? (raw.gradient as string | undefined) : undefined,
  };
}

function cleanPodcast(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]): LennyPodcast | null {
  const base = cleanBase(raw, dropped);
  if (!base) return null;
  const required: ("episode_title" | "guest_name" | "guest_role" | "episode_url" | "quote" | "quote_context")[] = [
    "episode_title", "guest_name", "guest_role", "episode_url", "quote", "quote_context",
  ];
  for (const k of required) {
    if (!isString(raw[k])) {
      dropped.push({ id: base.id, reason: `missing ${k}` });
      return null;
    }
  }
  return {
    ...base,
    episode_title: String(raw.episode_title),
    guest_name: String(raw.guest_name),
    guest_role: String(raw.guest_role),
    episode_url: String(raw.episode_url),
    quote: String(raw.quote),
    quote_context: String(raw.quote_context),
    is_carry_over: !!raw.is_carry_over,
  };
}

function cleanReddit(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]): RedditThread | null {
  const base = cleanBase(raw, dropped);
  if (!base) return null;
  if (!isString(raw.subreddit)) {
    dropped.push({ id: base.id, reason: "missing subreddit" });
    return null;
  }
  return {
    ...base,
    subreddit: String(raw.subreddit),
    comment_count: isNumber(raw.comment_count) ? Number(raw.comment_count) : 0,
    upvotes: isNumber(raw.upvotes) ? Number(raw.upvotes) : 0,
    top_comment_excerpt: isOptionalString(raw.top_comment_excerpt) ? (raw.top_comment_excerpt as string | undefined) : undefined,
  };
}

// Map section id → item cleaner.
const CLEANERS: Record<SectionId, (raw: Record<string, unknown>, dropped: { id: string; reason: string }[]) => AnyItem | null> = {
  "domain-signals": cleanDomainSignal as (raw: Record<string, unknown>, dropped: { id: string; reason: string }[]) => AnyItem | null,
  "competitor-updates": cleanCompetitor as (raw: Record<string, unknown>, dropped: { id: string; reason: string }[]) => AnyItem | null,
  "leader-tweets": cleanLeaderTweet as (raw: Record<string, unknown>, dropped: { id: string; reason: string }[]) => AnyItem | null,
  "design-tool-news": cleanDesignTool as (raw: Record<string, unknown>, dropped: { id: string; reason: string }[]) => AnyItem | null,
  "visual-inspiration": cleanVisual as (raw: Record<string, unknown>, dropped: { id: string; reason: string }[]) => AnyItem | null,
  "lenny-podcast": cleanPodcast as (raw: Record<string, unknown>, dropped: { id: string; reason: string }[]) => AnyItem | null,
  "reddit-threads": cleanReddit as (raw: Record<string, unknown>, dropped: { id: string; reason: string }[]) => AnyItem | null,
};

// ---------------------------------------------------------------------------
// Section validator — top-level entry. Schema-version guard matches build.js.
// ---------------------------------------------------------------------------
export function validateSection<S extends SectionId>(
  section: S,
  raw: unknown,
): ValidationResult<SectionData<ItemFor<S>>> {
  const errors: string[] = [];
  const dropped: { id: string; reason: string }[] = [];

  if (!raw || typeof raw !== "object") {
    errors.push("section payload is not an object");
    return {
      ok: false,
      data: {
        section,
        schema_version: SCHEMA_VERSION,
        generated_at: new Date().toISOString(),
        run_log: { items_shipped: 0, candidates_rejected: 0, rejection_reasons: [], queries_run: [] },
        items: [] as ItemFor<S>[],
      },
      errors,
      dropped,
    };
  }

  const obj = raw as Record<string, unknown>;
  const schemaVersion = isNumber(obj.schema_version) ? Number(obj.schema_version) : 1;
  if (schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `schema_version ${schemaVersion} exceeds supported ${SCHEMA_VERSION} — update validation.ts`,
    );
  }

  const cleaner = CLEANERS[section];
  const items: AnyItem[] = [];
  if (Array.isArray(obj.items)) {
    for (const it of obj.items as unknown[]) {
      if (!it || typeof it !== "object") {
        dropped.push({ id: "?", reason: "item is not an object" });
        continue;
      }
      const cleaned = cleaner(it as Record<string, unknown>, dropped);
      if (cleaned) items.push(cleaned);
    }
  }

  const runLog = isRunLog(obj.run_log)
    ? obj.run_log
    : { items_shipped: items.length, candidates_rejected: 0, rejection_reasons: [], queries_run: [] };

  return {
    ok: errors.length === 0,
    data: {
      section,
      schema_version: SCHEMA_VERSION,
      generated_at: isString(obj.generated_at) ? String(obj.generated_at) : new Date().toISOString(),
      run_log: runLog,
      items: items as ItemFor<S>[],
    },
    errors,
    dropped,
  };
}

// ---------------------------------------------------------------------------
// Threads validator — synthesis output.
// ---------------------------------------------------------------------------
function cleanThread(raw: Record<string, unknown>, dropped: { id: string; reason: string }[]): Thread | null {
  const id = String(raw.id || "?");
  const required = ["id", "frame", "strength", "client_tag", "design_surface", "theme_keywords", "signal_refs", "summary", "provenance"] as const;
  const missing = required.filter((k) => {
    const v = raw[k];
    return v == null || v === "" || (Array.isArray(v) && v.length === 0);
  });
  if (missing.length) {
    dropped.push({ id, reason: `missing: ${missing.join(", ")}` });
    return null;
  }
  if (!isStrength(raw.strength)) {
    dropped.push({ id, reason: `invalid strength ${String(raw.strength)}` });
    return null;
  }
  if (!isProvenance(raw.provenance)) {
    dropped.push({ id, reason: "invalid provenance" });
    return null;
  }
  const surfaces = Array.isArray(raw.design_surface)
    ? (raw.design_surface as unknown[]).filter(isDesignSurface)
    : [];
  if (!surfaces.length) {
    dropped.push({ id, reason: "no valid design_surface" });
    return null;
  }
  const signalRefs: SignalRef[] = Array.isArray(raw.signal_refs)
    ? (raw.signal_refs as unknown[])
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map((r) => ({ id: String(r.id || ""), section: String(r.section || "") as SectionId }))
        .filter((r) => r.id && SECTION_IDS.includes(r.section))
    : [];
  if (signalRefs.length < 2) {
    dropped.push({ id, reason: "fewer than 2 valid signal_refs" });
    return null;
  }
  const themeKeywords = Array.isArray(raw.theme_keywords)
    ? (raw.theme_keywords as unknown[]).filter(isString)
    : [];
  return {
    id,
    frame: String(raw.frame),
    strength: raw.strength as Strength,
    client_tag: String(raw.client_tag),
    design_surface: surfaces,
    theme_keywords: themeKeywords,
    signal_refs: signalRefs,
    summary: String(raw.summary),
    provenance: raw.provenance as Provenance,
  };
}

export function validateThreads(raw: unknown): ValidationResult<ThreadsData> {
  const errors: string[] = [];
  const dropped: { id: string; reason: string }[] = [];
  const empty: ThreadsData = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    briefing_line: "",
    items: [],
    run_log: { items_shipped: 0, candidates_rejected: 0, rejection_reasons: [], queries_run: [] },
  };

  if (!raw || typeof raw !== "object") {
    errors.push("threads payload is not an object");
    return { ok: false, data: empty, errors, dropped };
  }
  const obj = raw as Record<string, unknown>;
  if (isNumber(obj.schema_version) && Number(obj.schema_version) > SCHEMA_VERSION) {
    errors.push(`schema_version exceeds supported ${SCHEMA_VERSION}`);
  }
  const items: Thread[] = [];
  if (Array.isArray(obj.items)) {
    for (const t of obj.items as unknown[]) {
      if (!t || typeof t !== "object") continue;
      const cleaned = cleanThread(t as Record<string, unknown>, dropped);
      if (cleaned) items.push(cleaned);
    }
  }
  return {
    ok: errors.length === 0,
    data: {
      schema_version: SCHEMA_VERSION,
      generated_at: isString(obj.generated_at) ? String(obj.generated_at) : new Date().toISOString(),
      briefing_line: isString(obj.briefing_line) ? String(obj.briefing_line) : "",
      items,
      run_log: isRunLog(obj.run_log) ? obj.run_log : empty.run_log,
    },
    errors,
    dropped,
  };
}

// ---------------------------------------------------------------------------
// Meta validator — clients + freshness. Used by the admin write path and by
// the read path's defensive parse.
// ---------------------------------------------------------------------------
function cleanClient(raw: unknown): ClientConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const required: ("id" | "name" | "color")[] = ["id", "name", "color"];
  if (missingFields(c, required).length) return null;
  return {
    id: String(c.id),
    name: String(c.name),
    tagline: isOptionalString(c.tagline) ? (c.tagline as string | undefined) : undefined,
    color: String(c.color),
    tags: isArrayOf(c.tags, isString) ? c.tags : [],
    competitors: isArrayOf(c.competitors, isString) ? c.competitors : [],
    leader_handles: isArrayOf(c.leader_handles, isString) ? c.leader_handles : [],
    subreddit_watchlist: isArrayOf(c.subreddit_watchlist, isString) ? c.subreddit_watchlist : undefined,
  };
}

function cleanVoice(raw: unknown): CrossDomainVoice | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (!isString(v.handle) || !isString(v.name) || !isString(v.role)) return null;
  return { handle: String(v.handle), name: String(v.name), role: String(v.role) };
}

function cleanFreshness(raw: unknown): SectionFreshness {
  const f = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    last_attempt: isString(f.last_attempt) ? String(f.last_attempt) : null,
    last_success: isString(f.last_success) ? String(f.last_success) : null,
    degraded: !!f.degraded,
    items_kept: isNumber(f.items_kept) ? Number(f.items_kept) : 0,
    error: isOptionalString(f.error) ? (f.error as string | undefined) : undefined,
  };
}

export function validateMeta(raw: unknown): MetaConfig {
  if (!raw || typeof raw !== "object") {
    return { last_full_refresh: null, clients: [], cross_domain_voices: [], section_freshness: {} };
  }
  const m = raw as Record<string, unknown>;
  const clients: ClientConfig[] = Array.isArray(m.clients)
    ? (m.clients as unknown[]).map(cleanClient).filter((c): c is ClientConfig => c !== null)
    : [];
  const voices: CrossDomainVoice[] = Array.isArray(m.cross_domain_voices)
    ? (m.cross_domain_voices as unknown[]).map(cleanVoice).filter((v): v is CrossDomainVoice => v !== null)
    : [];
  const freshness: Partial<Record<AnySectionId, SectionFreshness>> = {};
  if (m.section_freshness && typeof m.section_freshness === "object") {
    const fr = m.section_freshness as Record<string, unknown>;
    for (const k of Object.keys(fr)) {
      freshness[k as AnySectionId] = cleanFreshness(fr[k]);
    }
  }
  return {
    last_full_refresh: isString(m.last_full_refresh) ? String(m.last_full_refresh) : null,
    clients,
    cross_domain_voices: voices,
    section_freshness: freshness,
  };
}

// Resolve `connections` arrays across all sections: drop refs pointing at ids
// that don't exist in this refresh. Matches build.js's resolveConnections.
export function resolveConnections(sections: { items: ItemBase[] }[]): { stripped: number } {
  const allIds = new Set<string>();
  for (const s of sections) for (const it of s.items) allIds.add(it.id);
  let stripped = 0;
  for (const s of sections) {
    for (const it of s.items) {
      if (!Array.isArray(it.connections) || !it.connections.length) continue;
      const valid = it.connections.filter((id) => allIds.has(id));
      if (valid.length !== it.connections.length) {
        stripped += it.connections.length - valid.length;
      }
      it.connections = valid;
    }
  }
  return { stripped };
}
