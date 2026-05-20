// Per-section playbook prompts.
//
// Each `runSection*` function builds the per-section user message Claude sees
// (the system prompt always includes SHARED_SYSTEM_RULES + buildContextBlock).
// The runtime: invoke runSection(section), get back a validated SectionData.
//
// Ported faithfully from signals-final/skills/refresh-signals/SKILL.md. Each
// section's quality bar, ID format, distribution targets, and anti-patterns
// are reproduced — that's the load-bearing part of the original skill.

import { callClaude } from "@/lib/claude";
import {
  type AnySectionId,
  type ItemFor,
  SCHEMA_VERSION,
  type SectionData,
  type SectionId,
  type MetaConfig,
  type DomainSignal,
  type SectionFreshness,
} from "../types";
import { validateSection, validateThreads } from "../validation";
import { readMeta, readSection, updateSectionFreshness, writeSection, writeThreads } from "../data";
import { buildContextBlock, extractJsonBlock, isoDate, SHARED_SYSTEM_RULES } from "./shared";

// Optional callback so the caller can stream progress (e.g. the cron route).
type ProgressCallback = (event: { stage: string; section?: AnySectionId; detail?: string }) => void;

// ---------------------------------------------------------------------------
// SECTION 1 — domain-signals
// ---------------------------------------------------------------------------
const DOMAIN_SIGNALS_PROMPT = `
Refresh the "domain-signals" section.

WHAT QUALIFIES
Strategic context that would change how a designer designs for the client.
EXCLUDES funding/IPO/valuation/earnings/M&A unless they force a regulatory
or product change a designer must respond to (in which case classify the
*implication*, not the financial event itself).

SIGNAL TYPES (target ≥ 2 of 4 represented per client per refresh):
  market       — sector size/growth with design-relevant implication
  regulatory   — regulator rulings/drafts/consultations (RBI, SEBI, CCI,
                 MeitY, ASCI, FSSAI, NPCI, etc.)
  behavioral   — new consumer behaviour data, generational shifts
  product      — category-level product behaviour change (not single competitor)

RESEARCH PROCESS
1. For each client, search with their tags:
   "<tag> India market <month> <year>"
   "<tag> India trends <quarter>"
   "<tag> consumer behavior <year>"
2. Add regulator searches matched to category:
   Payments/fintech → RBI <month>, NPCI <month>, SEBI <month>
   Food/consumables → FSSAI <month>, CCI <month>
   Health/wellness  → Ayush <month>, CDSCO <month>
   Commerce/retail  → MeitY <month>, consumer protection <month>
   Any consumer-facing → ASCI <month>
3. Allowlist:
   PRIMARY (always): RBI, SEBI, NPCI, CCI, FSSAI, MeitY, ASCI, Statista
     (named report only), company filings, official government statistics
   SECONDARY (trade press): Inc42, Entrackr, Storyboard18, Indian Retailer,
     BusinessLine, Business Standard, MoneyControl, BeautyMatter, TechCrunch India
   SECONDARY (analysts): Kearney, Bain, BCG, RedSeer, Euromonitor, Mintel —
     only when citing a specific dated report
   AVOID: press-release rewrites, "Top 10" listicles, opinion pieces.
4. Build cross-client (client: "all") from tags shared across ≥ 2 clients.

QUALITY BAR — all four must be true:
1. Specific datapoint or named change (numbers/regulations/regulator/dated reports).
2. Last 30 days — hard cap.
3. Consequence articulable for a designer ("If true, designer should think
   harder about X surface").
4. Honest confidence (primary only when source is regulator/company/primary report).

DISTRIBUTION: 4-6 per client + 3-4 cross-client. Hard cap 24.

ID FORMAT: \`<signal-type>-<client-id>-<slug>-<YYYY-MM-DD>\`.

REQUIRED EXTRAS per item: signal_type ("market"|"regulatory"|"behavioral"|"product"),
confidence ("primary"|"secondary"). Optional: hero_stats, hero_emphasis.

ANTI-PATTERNS: trend listicles, press release rewrites, paywalled reports
without visible numbers, single-competitor news (use competitor-updates),
hot-take predictions with no data, funding/IPO/M&A.
`.trim();

// ---------------------------------------------------------------------------
// SECTION 2 — competitor-updates
// ---------------------------------------------------------------------------
const COMPETITOR_UPDATES_PROMPT = `
Refresh the "competitor-updates" section.

WHAT QUALIFIES
What competitors shipped — not what they raised, said, or plan to do.
"Would this show up in the next design review meeting?" If yes ship it. If
it's general company news, that's domain-signals.

UPDATE TYPES (feature-launch should be majority):
  feature-launch       — shipped, tappable, in-product change
  pricing              — published price/tier change with a date
  market-expansion     — new geography/vertical/channel
  partnership          — partnership that changes the competitor's product surface
  strategic-shift      — repositioning visible in product or marketing
Do NOT use "funding" even though it appears in the enum — funding is rejected.

WATCHLIST per client: meta.clients[].competitors.

WHERE TO LOOK per competitor:
1. Official changelog (\`<competitor>.com/changelog\`, \`/release-notes\`, \`/whats-new\`)
2. Product blog if no changelog
3. Web search: "<competitor> launches OR ships <month> <year>"
4. Trade press for strategic shifts that won't appear on a changelog

QUALITY BAR — all four must be true:
1. Shipped change. Roadmap announcements / "future plans" interviews don't count.
2. Link is canonical source (changelog, official release, competitor's own
   announcement). Aggregator rewrites only when no first-party source exists.
3. Summary names the specific change + the design surface it affects.
4. Last 14 days — except strategic-shift which can go back 30 days.

DIRECT THREAT: true when the move goes after a surface the client owns or
is investing in. Be honest — calling everything a "direct threat" is the
same noise as calling nothing one.

DISTRIBUTION: 2-4 per client. Hard cap 12.

ID FORMAT: \`<update-type>-<competitor-slug>-<change-slug>-<YYYY-MM-DD>\`.

REQUIRED EXTRAS per item: competitor (string), update_type, direct_threat (boolean).
Optional: hero_stats, hero_emphasis.

ANTI-PATTERNS: funding/IPO, "industry first" press releases with no product,
roadmap teasers, hiring/award announcements, partnership announcements that
don't change the product, quarterly earnings rebranded as product news.
`.trim();

// ---------------------------------------------------------------------------
// SECTION 3 — leader-tweets
// ---------------------------------------------------------------------------
const LEADER_TWEETS_PROMPT = `
Refresh the "leader-tweets" section.

WHAT QUALIFIES
Posts where someone with real context is stating an opinion, sharing a fact,
or revealing a decision. Designers don't need reminders these people exist —
they need to know what these people just thought.

VOICE LIST (read from meta):
- Per-client leader_handles
- Per-client competitors → competitor founders / heads of product
- cross_domain_voices

SOURCE: X / Twitter. LinkedIn acceptable substitute. Work via web search:
"<handle> twitter <month> <year>" / nitter.net/<handle>. If nothing surfaces
for a handle in 7 days, drop it. Record "n handles silent this cycle" in
run_log.notes.

QUALITY BAR — all four must be true:
1. It says something. Assertion, number, contrarian take, behind-the-scenes
   observation, decision being announced. Re-shares, "thoughts?", "interesting",
   "agree with X" are rejected immediately.
2. Author has standing on this topic.
3. A designer can do something with it.
4. Last 7 days.

DISTRIBUTION: 2-3 per-client operators, 1-2 competitor operators, 3 cross-domain.
Hard cap 12.

ID FORMAT: \`tweet-<handle-without-at>-<short-hash-of-text>\`.

REQUIRED EXTRAS per item: author_name, author_handle (with @), author_role,
tweet_text (verbatim, ≤280 chars), engagement {replies, likes, retweets},
is_thread (boolean).

ANTI-PATTERNS: "Excited to announce…" launches (→ competitor-updates if real),
quote-tweets with no claim, conference photos, milestone celebrations,
VC-speak listicles, hiring tweets, engagement-bait threads, AI-written-looking
content (em-dashes, three-bullet structure, buzzword soup).

VOICE: tweet_text is verbatim. summary is the editor's note above it — what
makes this tweet worth surfacing. observation only when consequence isn't obvious.
`.trim();

// ---------------------------------------------------------------------------
// SECTION 4 — design-tool-news
// ---------------------------------------------------------------------------
const DESIGN_TOOL_NEWS_PROMPT = `
Refresh the "design-tool-news" section.

WHAT QUALIFIES
What shipped this week that designers can use today, what new tool deserves
5 minutes, what sharp opinion is reframing the work.

SUBTYPES (target distribution per refresh):
  major-release      — 2-3 — Figma, Anthropic Claude, Linear, Cursor, Notion,
                       Vercel/v0, Framer, Webflow, Zed, Raycast, Arc, Tldraw
  emerging-tool      — 2-3 — Product Hunt / TIAFT / Uneed / Future Tools / TIAFT
  plugin-system      — 1-2 — Figma plugins, design system updates, icon libs,
                       Tailwind ecosystem
  essay-opinion      — 1-2 — sharp essays from design leaders

CLIENT TAGGING
Mostly client-agnostic (client: "all"). When a tool is *especially* relevant
to one client's domain, tag with that client id. Never hardcode client names.

RESEARCH STREAMS
- Major releases: search "<vendor> release notes <month> <year>". Must be a
  shipped feature with a try-it URL. Drop if you can't find canonical URL.
- Emerging tools: pull from ≥2 of TIAFT, Product Hunt design-tools (last 7d
  ≥100 upvotes), Uneed, Future Tools. Don't just paste taglines — answer
  what does it do / who is it competing with / is there a free tier.
- Plugins: Figma Community Trending, GitHub releases for shadcn/ui, Radix,
  Lucide, Heroicons. Skip patch versions and typo fixes.
- Essays: Lenny's Newsletter, Brian Lovin, Jenny Wen, Pasquale D'Silva,
  Julie Zhuo, Sidebar.io, UX Collective, Bootcamp. Filter for argument density —
  skip "10 design trends" listicles. Pull sharpest one-sentence quote into
  observation.

QUALITY BAR — all six must be true:
1. Specific not generic.
2. Past-tense verb in the title.
3. Survives the 5-second test.
4. try-it URL works (no 404, no paywall).
5. Items ≤ 14 days old (essays evergreen up to ~6 weeks).
6. No duplicates across subtypes.

DISTRIBUTION: 6-10 across all subtypes. Hard cap 12.

ID FORMAT: \`<subtype>-<tool-slug>-<YYYY-MM-DD>\`.

REQUIRED EXTRAS per item: subtype, tool. Optional: try_it_url.

ANTI-PATTERNS: thin GPT wrappers, waitlist-only with no product page, AI tool
aggregators that just list other tools.

VOICE: crisp, declarative, present-or-past tense. One consequence per summary.
No exclamation marks, no emoji. "AI" is fine; "AI-powered" is filler.
`.trim();

// ---------------------------------------------------------------------------
// SECTION 5 — visual-inspiration
// ---------------------------------------------------------------------------
function buildVisualInspirationPrompt(domainSignals: SectionData<DomainSignal>): string {
  // Pull pattern hints from the two most recent domain signals so visual-inspiration
  // genuinely responds to what the dashboard is surfacing.
  const recent = domainSignals.items
    .slice()
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, 4);
  const hints = recent.length
    ? recent.map((it) => `  - ${it.client}: ${it.title} (surfaces: ${(it.design_surface || []).join(", ")})`).join("\n")
    : "  (no domain signals available yet — pull patterns matched to client tags)";

  return `
Refresh the "visual-inspiration" section.

WHAT QUALIFIES
UI patterns relevant to each client's design problems — selected for pattern
relevance, not popularity. A 200-view shot of the right empty-state for a
B2B reconciliation tool beats a 50K-view shot of generic fintech maximalism.

THIS SECTION'S DEPENDENCY
You are looking for patterns the current domain signals are pointing at.
Recent domain signals:
${hints}

SOURCE ROTATION — three different platforms minimum per refresh:
  mobbin     — real-app screen flows by pattern (highest signal)
  dribbble   — pattern-specific shots; filter by tag then relevance, not views
  behance    — case studies with process
  pinterest  — editorial/brand/typography moodboards (use sparingly)
  savee      — curated by serious designers; low volume / high signal

THUMBNAIL — required.
Source priority:
  1. Platform's own image CDN (use og:image meta if exposed)
  2. Mobbin / Dribbble screenshot URLs if hot-linkable (verify each loads)
  3. Unsplash CDN as thematic stand-in:
     https://images.unsplash.com/photo-{ID}?w=640&h=480&fit=crop&q=80
If none work, ship with only gradient and note in run_log:
"n cards shipped without thumbnails".

PATTERN_CAPTION — required, observation-only voice.
3-6 word phrase describing what to *notice* in the image. Use "shows", "uses",
"appears", "stays", "via", "over", "with". *"ETA card stays glanceable over
moving map"* / *"Per-row 'why this fee' tooltip"*. Drop the card if you can't
write a meaningful caption.

PATTERN, NOT THE SHOT — every card answers:
  pattern         — kebab-case (\`empty-state\`, \`live-eta-overlay\`,
                    \`fee-disclosure\`, \`agent-status-card\`)
  relevance_note  — explicit sentence about a real client problem
If you can't answer relevance_note, drop the card.

QUALITY BAR — all four must be true:
1. Pattern is named, specific, re-usable. Not "homepage" — try
   \`marketplace-hero-with-active-search\`.
2. Relevance is a sentence about a real client problem.
3. The shot is real, not a concept piece.
4. No duplicate patterns within a refresh.

DISTRIBUTION: 3-4 per client + 2-3 cross-client. Hard cap 14.

ID FORMAT: \`visual-<platform>-<pattern>-<short-slug>\`.

REQUIRED EXTRAS per item: platform, pattern, relevance_note, pattern_caption.
Optional: thumbnail_url, fetch_url_override, gradient.

ANTI-PATTERNS: trend-bait dashboards with stock photos / lorem ipsum,
logo/branding shots, AI-generated mockups with implausible UI, anything older
than 30 days that isn't a Mobbin classic.

VOICE: title never leads with the platform name. Lead with the actual product
or studio + pattern.
`.trim();
}

// ---------------------------------------------------------------------------
// SECTION 6 — lenny-podcast
// ---------------------------------------------------------------------------
const LENNY_PODCAST_PROMPT = `
Refresh the "lenny-podcast" section. SINGLE-ITEM array. The sharpest insight
a designer should carry into their day.

SOURCE PRIORITY
1. Lenny's Podcast (lennysnewsletter.com/podcast) — latest 1-2 episodes
2. Lenny's Newsletter — written posts that include podcast extracts and
   design-relevant essays
3. Fallback: Design Better (Invision), Dive Club (Ridd), Honest Designers
   Show, Layout (Subform / Dann Petty), The Logan Bartlett Show, Acquired

The dashboard displays the actual show name, not "Lenny's" — be honest.

QUALITY BAR — all four must be true:
1. It's an argument or observation, not a setup.
2. It transfers. A designer reading it can apply it to a different product.
3. 50-300 characters when pulled verbatim.
4. Lifted verbatim. No paraphrasing. Clean only "uh"/"you know" filler.

When latest episode is irrelevant: if Lenny's latest two and the fallback
are all dry, ship the previous run's quote unchanged with
\`is_carry_over: true\`.

ID FORMAT: \`podcast-<show-slug>-<episode-slug>\`.

REQUIRED EXTRAS per item: episode_title, guest_name, guest_role, episode_url,
quote, quote_context. Optional: is_carry_over (boolean).

ANTI-PATTERNS: generic platitudes, marketing of speaker's own product,
inside-baseball YC advice, quotes that are just numbers with no insight,
self-congratulatory founder talk.

VOICE: episode_title exactly as published. quote verbatim, NO surrounding
quote marks (dashboard adds them). quote_context one line of setup. title
(shared) is a short header — "Featured snippet · Jenny Wen on the design process."
`.trim();

// ---------------------------------------------------------------------------
// SECTION 7 — reddit-threads
// ---------------------------------------------------------------------------
const REDDIT_THREADS_PROMPT = `
Refresh the "reddit-threads" section.

WHAT QUALIFIES
Real-user discussions with substantive comment depth — NOT "popular thread."
A 4K-upvote thread with 50 reaction comments is worse than a 600-upvote
thread with 80 nuanced replies.

SUBREDDIT WATCHLIST per client:
  - client tags (e.g. "quick-commerce" → r/india, r/<city>, r/IndianFood)
  - client category (e.g. "fintech" → r/IndianStreetBets, r/StartUpIndia,
    r/personalfinanceindia)
  - brand-specific subs when they exist
Plus fixed cross-domain: r/userexperience, r/ProductDesign, r/UI_Design,
r/UXDesign.

WHERE TO LOOK
1. Subreddit "Top this week" — reddit.com/r/<sub>/top/?t=week
2. Subreddit "Hot" — reddit.com/r/<sub>/hot/
3. Reddit search: "<client-or-competitor> site:reddit.com last week"
For each candidate, open the comments before deciding. Upvote count is
meaningless without comment depth.

QUALITY BAR — all four must be true:
1. Substantive comment depth (median top-30 comment has >1 sentence with a
   concrete claim/observation/experience).
2. Reveals a design problem or user frame.
3. Last 7 days.
4. Not astroturfed.

DISTRIBUTION: 2-3 per client + 2-3 cross-domain. Hard cap 11.

ID FORMAT: \`reddit-<sub-without-r>-<short-slug-of-thread-title>\`.

REQUIRED EXTRAS per item: subreddit (with "r/"), comment_count, upvotes.
Optional: top_comment_excerpt (verbatim, ≤200 chars).

ANTI-PATTERNS: "X app is now best?" listicle threads, meme posts and screenshot
dunks, one-line review threads, coupon/promo/referral threads, "Should I buy
from X?" decision-help threads, brand promotional posts.

VOICE
- title: thread title verbatim, trimmed if >90 chars or has emoji noise.
- summary: STANDARD SHAPE — "<count> comments <verb-ing> <what>. <claim>."
  Lead with the comment count. Length 110-140 chars.
  Lead verbs: comparing, asking, debating, mapping, revealing, praising,
  requesting, reviewing.
- top_comment_excerpt: verbatim quote when a comment captures the design
  insight better than a summary could.
`.trim();

// ---------------------------------------------------------------------------
// SECTION 8 — threads synthesis
// ---------------------------------------------------------------------------
function buildThreadsPrompt(allSections: Record<SectionId, SectionData>): string {
  const summary = (Object.keys(allSections) as SectionId[])
    .map((s) => {
      const items = allSections[s].items;
      const sample = items.slice(0, 5).map((it) => `    - [${s}] ${it.id}: ${it.title} (client: ${it.client}, strength: ${it.strength}, surfaces: ${(it.design_surface || []).join(",")})`);
      return `  ${s} (${items.length} items):\n${sample.join("\n")}`;
    })
    .join("\n");

  return `
Cross-section synthesis. Cluster signals across the 7 section JSONs into 3-5
thematic threads that bind signals across sections.

A candidate cluster qualifies as a thread iff all four are true:
1. Cross-section: signals from ≥ 2 different sections.
2. 2-6 signals (below 2 → not a thread; above 6 → split or drop weakest).
3. One of these binds them:
   - same client + same design_surface
   - same theme keyword across signals
   - same competitor / external actor
4. Recency — all from current refresh.

FRAME (title field): sentence about what's happening, not a label.
  ✅ "Razorpay is racing the credit-line-on-UPI window"
  ❌ "Razorpay CLOU updates"
Observation-first voice. No imperatives. ≤ 90 chars target, hard cap 110.

STRENGTH: max(signal.strength). Thread is strength-3 iff at least one anchor
is strength-3.

CLIENT_TAG: one dominant client; "all" for genuinely cross-client.
DESIGN_SURFACE: one or two primary surfaces; pick the one appearing in the
most signal_refs.
THEME_KEYWORDS: 2-4 lowercase hyphenated keywords.

SUMMARY: 2-3 sentence digest that CITES THE SPECIFIC SIGNALS. No "experts say"
/ "the industry is moving." Length 240-360 chars, cap 420.

BRIEFING_LINE (top-level): "<n> threads today. <strongest thread frame
paraphrased to 1 clause>. <m> new signals across <s> sources." 110-180 chars.

DISTRIBUTION: 2-3 per-client + 1-2 cross-client. Aim 3-5; floor 2; cap 6.

ID FORMAT: \`thread-<client>-<short-keyword>-<YYYY-MM-DD>\`.

Each thread has signal_refs: [{id, section}] — every id must resolve to an
item id in the section JSONs you were given.

CANDIDATE POOL (you must only reference these ids):
${summary}

ANTI-PATTERNS: single-section "threads", frames that are labels, threads where
one signal is a strong anchor and the rest are obvious satellites of the same
announcement, threads with strength-1 only, duplicate signal_refs across threads.

OUTPUT FORMAT — fenced \`\`\`json block matching ThreadsData shape:
{
  "schema_version": 2,
  "generated_at": "<ISO>",
  "briefing_line": "...",
  "items": [
    {
      "id": "thread-...",
      "frame": "...",
      "strength": 3,
      "client_tag": "...",
      "design_surface": ["..."],
      "theme_keywords": [...],
      "signal_refs": [{"id":"...","section":"..."}, ...],
      "summary": "...",
      "provenance": {"skill":"thread-clusters","primary_source_url":"...","derivation_note":"..."}
    }
  ],
  "run_log": { "items_shipped": N, "candidates_rejected": M, "rejection_reasons": [...], "queries_run": [] }
}
`.trim();
}

// ---------------------------------------------------------------------------
// Section → prompt map (visual-inspiration needs domain-signals context, so
// it's built dynamically).
// ---------------------------------------------------------------------------
const SECTION_PROMPTS: Record<SectionId, string> = {
  "domain-signals": DOMAIN_SIGNALS_PROMPT,
  "competitor-updates": COMPETITOR_UPDATES_PROMPT,
  "leader-tweets": LEADER_TWEETS_PROMPT,
  "design-tool-news": DESIGN_TOOL_NEWS_PROMPT,
  "visual-inspiration": "", // built on-the-fly with domain-signals context
  "lenny-podcast": LENNY_PODCAST_PROMPT,
  "reddit-threads": REDDIT_THREADS_PROMPT,
};

// Tunable per-section caps so a single misbehaving model output doesn't blow
// the timeout. Visual / domain need more room because they ship the most items.
const SECTION_MAX_TOKENS: Record<SectionId, number> = {
  "domain-signals": 12000,
  "competitor-updates": 8000,
  "leader-tweets": 8000,
  "design-tool-news": 8000,
  "visual-inspiration": 10000,
  "lenny-podcast": 3000,
  "reddit-threads": 8000,
};

// ---------------------------------------------------------------------------
// Public API — runSection / runThreads / refreshAll
// ---------------------------------------------------------------------------
export async function runSection<S extends SectionId>(
  section: S,
  opts?: { meta?: MetaConfig; onProgress?: ProgressCallback },
): Promise<SectionData<ItemFor<S>>> {
  const meta = opts?.meta || (await readMeta());
  const today = new Date().toISOString().slice(0, 10);
  const context = buildContextBlock(meta, today);
  let userMessage = SECTION_PROMPTS[section];
  if (section === "visual-inspiration") {
    const domain = await readSection("domain-signals");
    userMessage = buildVisualInspirationPrompt(domain);
  }
  opts?.onProgress?.({ stage: "research", section, detail: "calling Claude with web search" });

  const freshness: SectionFreshness = {
    last_attempt: isoDate(),
    last_success: meta.section_freshness[section]?.last_success || null,
    degraded: false,
    items_kept: 0,
  };

  let response: string;
  try {
    response = await callClaude({
      system: SHARED_SYSTEM_RULES + "\n\n" + context,
      messages: [{ role: "user", content: userMessage }],
      useSearch: true,
      maxTokens: SECTION_MAX_TOKENS[section],
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`[signals] runSection(${section}) Claude error`, e);
    await updateSectionFreshness(section, { ...freshness, degraded: true, error: errMsg });
    // Keep last good copy
    return readSection(section);
  }

  const json = extractJsonBlock(response);
  if (!json) {
    console.error(`[signals] runSection(${section}) no JSON block in response`);
    await updateSectionFreshness(section, { ...freshness, degraded: true, error: "no JSON block in response" });
    return readSection(section);
  }

  // Validate; build.js drops invalid items rather than rejecting wholesale.
  const result = validateSection(section, json);
  // If validation lost > 30% of items vs what the model claimed, mark degraded.
  const claimed = (json as { items?: unknown[] }).items?.length ?? 0;
  const kept = result.data.items.length;
  const lossRatio = claimed ? (claimed - kept) / claimed : 0;
  if (lossRatio > 0.3 && claimed > 3) {
    await updateSectionFreshness(section, {
      ...freshness,
      degraded: true,
      error: `validation dropped ${claimed - kept} of ${claimed} items (${result.dropped.map((d) => d.id).slice(0, 5).join(", ")}…)`,
    });
    return readSection(section); // last good copy
  }

  // Override section + schema_version to be safe.
  const payload: SectionData<ItemFor<S>> = {
    ...result.data,
    section,
    schema_version: SCHEMA_VERSION,
    generated_at: isoDate(),
  };
  await writeSection(section, payload);
  await updateSectionFreshness(section, {
    last_attempt: isoDate(),
    last_success: isoDate(),
    degraded: false,
    items_kept: kept,
  });
  opts?.onProgress?.({ stage: "persisted", section, detail: `${kept} items kept` });
  return payload;
}

export async function runThreads(opts?: { onProgress?: ProgressCallback }) {
  opts?.onProgress?.({ stage: "synthesis", detail: "reading all sections" });
  const [domainSignals, competitorUpdates, leaderTweets, designToolNews, visualInspiration, lennyPodcast, redditThreads] = await Promise.all([
    readSection("domain-signals"),
    readSection("competitor-updates"),
    readSection("leader-tweets"),
    readSection("design-tool-news"),
    readSection("visual-inspiration"),
    readSection("lenny-podcast"),
    readSection("reddit-threads"),
  ]);
  const allSections: Record<SectionId, SectionData> = {
    "domain-signals": domainSignals,
    "competitor-updates": competitorUpdates,
    "leader-tweets": leaderTweets,
    "design-tool-news": designToolNews,
    "visual-inspiration": visualInspiration,
    "lenny-podcast": lennyPodcast,
    "reddit-threads": redditThreads,
  };

  const meta = await readMeta();
  const today = new Date().toISOString().slice(0, 10);
  const context = buildContextBlock(meta, today);
  const userMessage = buildThreadsPrompt(allSections);
  let response: string;
  try {
    response = await callClaude({
      system: SHARED_SYSTEM_RULES + "\n\n" + context,
      messages: [{ role: "user", content: userMessage }],
      useSearch: false, // threads is JSON-only; no web crawl
      maxTokens: 8000,
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[signals] runThreads Claude error", e);
    await updateSectionFreshness("threads", {
      last_attempt: isoDate(),
      last_success: meta.section_freshness.threads?.last_success || null,
      degraded: true,
      items_kept: 0,
      error: errMsg,
    });
    return null;
  }
  const json = extractJsonBlock(response);
  if (!json) {
    await updateSectionFreshness("threads", {
      last_attempt: isoDate(),
      last_success: meta.section_freshness.threads?.last_success || null,
      degraded: true,
      items_kept: 0,
      error: "no JSON block",
    });
    return null;
  }
  const result = validateThreads(json);
  // Drop signal_refs whose targets don't actually exist in this refresh.
  const allIds = new Set<string>();
  for (const s of Object.values(allSections)) for (const it of s.items) allIds.add(it.id);
  const filtered = result.data.items
    .map((t) => ({ ...t, signal_refs: t.signal_refs.filter((r) => allIds.has(r.id)) }))
    .filter((t) => t.signal_refs.length >= 2);
  const final = { ...result.data, items: filtered };
  await writeThreads(final);
  await updateSectionFreshness("threads", {
    last_attempt: isoDate(),
    last_success: isoDate(),
    degraded: false,
    items_kept: final.items.length,
  });
  opts?.onProgress?.({ stage: "synthesis-done", detail: `${final.items.length} threads` });
  return final;
}

/** Full refresh: 7 sections (in dependency order) + threads synthesis. */
export async function refreshAll(opts?: { onProgress?: ProgressCallback; sections?: SectionId[] }) {
  const meta = await readMeta();
  // Order matters: visual-inspiration reads fresh domain-signals + competitor-updates.
  const order: SectionId[] = [
    "domain-signals",
    "competitor-updates",
    "leader-tweets",
    "design-tool-news",
    "visual-inspiration",
    "lenny-podcast",
    "reddit-threads",
  ];
  const scope = opts?.sections && opts.sections.length ? opts.sections : order;
  for (const section of order) {
    if (!scope.includes(section)) continue;
    await runSection(section, { meta, onProgress: opts?.onProgress });
  }
  // Always re-run threads (derived state).
  await runThreads({ onProgress: opts?.onProgress });

  // Update last_full_refresh if we touched everything.
  if (scope.length === order.length) {
    const updated = await readMeta();
    updated.last_full_refresh = isoDate();
    const { writeMeta } = await import("../data");
    await writeMeta(updated);
  }
}
