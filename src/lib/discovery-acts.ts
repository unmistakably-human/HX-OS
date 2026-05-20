// v4 discovery is generated as 4 sequential Claude calls — one per Act —
// because the full deck doesn't fit inside a single Vercel function's
// runtime cap on Hobby (300s). Each Act is its own /api/.../discover/act/N
// invocation: independent function instance, independent timeout budget.
//
// Acts must run in order. Each Act gets the previous Acts' wiring IDs in
// the user message so it can reference them (e.g., Act IV ideas trace back
// to I-x category insights, A-x behaviours, V-x VoC cards).

import type { DiscoveryDeckV4 } from "@/lib/discovery-types";

export type ActNumber = 1 | 2 | 3 | 4;

export interface ActConfig {
  number: ActNumber;
  label: string;            // shown in the loading UI
  shortLabel: string;       // shown in the loading UI ("Landscape", "People", …)
  maxTokens: number;
  searchMaxUses: number;
  // Keys of DiscoveryDeckV4 the model is asked to emit in this Act.
  keys: (keyof DiscoveryDeckV4)[];
  // Act-specific system prompt — appended to the shared header.
  systemPrompt: string;
}

const SHARED_HEADER = `You are the HumanX Discovery Agent (v4). You are generating the Insights Deck designed for designers. Output is strict JSON — no markdown, no backticks, no preamble.

## Voice and copy rules
- Plain English. Short sentences. The kind a senior designer uses when explaining to a junior over coffee.
- BANNED phrases (rewrite if you reach for them): "structural moat", "defensible moat", "structural advantage", "commoditising", "value proposition", "go-to-market", "audience coverage", "addressable market", "secular trend", "category-table-stakes", "differentiated", "leverage" (as a verb).
- Plain alternatives: "hard to copy", "what they offer", "how they're different", "long-running shift", "everyone has it", "what we'll launch with".
- Voice is observational and calm. "The research suggests", "leans toward", "tensions the team has to resolve". Never "we recommend".

## In-scope thread
The brief carries an in-scope surface (named explicitly). Thread it through every section:
- Mark category insights with on_in_scope when the finding lands on that surface.
- Mark behaviour cards (A-x) with on_in_scope.
- Mark competitive dimensions (D-x) with on_in_scope.
- Mark idea cards with on_in_scope.
- Module ideas carry an on_in_scope boolean.

## Client benchmarks
If the brief names benchmarks, place them inline in competitor_set with client_benchmark=true. No separate cluster.

## KPI thread
If the brief carries KPIs, render them in hero.kpis and in kpi_focus (K-x cards). Idea cards may carry kpi_tags only when the research evidence supports the link.

## So-design discipline
Every research section ends with a so_design array of 2–4 directives a junior designer can sketch from. Verb-led, concrete.

## Wiring IDs
- I-1…I-5 category_insights
- A-1…A-7 behaviour_insights
- D-1…D-5 competitive_dimensions (each with CR-1…CR-6 local_pattern and CC-1…CC-6 cross_category)
- V-1…V-14 voice_of_customer cards
- K-1…K-4 kpi_focus cards
- B-01, B-02, B-03 beyond_the_brief

Keep ALL string values to max 2 sentences. No newlines or unescaped quotes inside string values. Every field listed in the Act schema must be present (use empty arrays if needed). Respond ONLY with the JSON for THIS Act — no other keys, no preamble, no commentary.

`;

// ─────────────────────────── ACT I ───────────────────────────

const ACT_1_PROMPT = `${SHARED_HEADER}
## Act I — the landscape

Emit a JSON object with EXACTLY these top-level keys: title, subtitle, hero, know_your_client, product_context, category_insights.

### Counts
- hero.tiles: exactly 4 (Primary user, In-scope surface, Design challenge, Positioning lean)
- hero.kpis: one chip per KPI in the brief (omit if no KPIs)
- know_your_client.blocks: 4–6 sub-blocks (a · The bet, b · How they sound, c · Recent moves, d · Stakeholders, e · Sources, f · Unknowns)
- product_context.surfaces: 2–4 cards. At least one with in_scope=true (matching the brief's in-scope surface).
- category_insights: exactly 5; ≥2 with contradicts_convention=true. Each carries a could_mean array of 2–3 alternative reads.

Use web search to ground KYC (recent moves, the bet) and category insights (real numbers, real shifts). Cite evidence in the evidence field.

### JSON shape
{
  "title": "string — short editorial title (e.g., 'Mothercare India · Discovery Insights Deck')",
  "subtitle": "string — one short line situating the deck (agency, client, market, date)",
  "hero": {
    "banner": "string — framing line about ideas, not verdicts",
    "tiles": [{"label": "Primary user|In-scope surface|Design challenge|Positioning lean", "value": "string", "sub": "string"}],
    "kpis": [{"direction": "up|down|neutral", "label": "string"}]
  },
  "know_your_client": {
    "title": "string — client name as a title",
    "blocks": [{"label": "a · The bet|b · How they want to sound|...", "body": "1–3 sentences"}],
    "so_design": ["2–4 design directives based on tone + brand"]
  },
  "product_context": {
    "definition": "1–2 italic sentences on what the product is",
    "is_is_not": "string — 'Is: ... Is not: ...'",
    "surfaces": [{"group": "external|internal", "label": "string", "in_scope": true, "items": [{"name": "string", "role": "string"}]}]
  },
  "category_insights": [{"id": "I-1", "label": "Long-running shift|Inflection|...", "contradicts_convention": false, "statement": "string", "evidence": "string", "could_mean": ["string", "string", "string"], "on_in_scope": "optional string"}]
}`;

// ─────────────────────────── ACT II ───────────────────────────

const ACT_2_PROMPT = `${SHARED_HEADER}
## Act II — the people

Emit a JSON object with EXACTLY these top-level keys: audience_set, journey_grid, behaviour_insights, voice_of_customer.

### Counts
- audience_set: exactly 4 role-types (primary | secondary | user_only | influencer).
- journey_grid.modules: 5–8 user-facing module labels (the in-scope module's index goes into in_scope_module_index, or -1 if none).
- journey_grid.rows: 6–8 persona rows, each with cells matching modules length.
- behaviour_insights: 5–7 A-x cards.
- voice_of_customer: 8–14 cards total across category / competitor / client.

The Voice of Customer is the heaviest part of this Act. Mine forums, Reddit, Trustpilot, Google reviews, app store reviews, parenting groups, X/Twitter — using web search. Filter HARD to design-relevant complaints only (ui_ux, product_ia, content, trust, service). DROP shipping speed, pricing, stock, payment gateway issues unless they map to a UI fix on the in-scope surface. Each card carries a ≤15-word quote from one source. "Recurring" requires ≥3 independent voices.

### JSON shape
{
  "audience_set": [{"axis": "primary|secondary|user_only|influencer", "title": "string", "description": "string"}],
  "journey_grid": {
    "modules": ["string"],
    "in_scope_module_index": 0,
    "rows": [{"persona": "string", "cells": [{"intensity": 0, "entry": false, "drop": false}]}],
    "so_design": ["string"]
  },
  "behaviour_insights": [{"id": "A-1", "persona": "Name · descriptor", "frictions": "string", "could_mean": ["string"], "benchmark": "string", "on_in_scope": "optional string"}],
  "voice_of_customer": {
    "category_complaints": [{"id": "V-1", "source": "string", "category": "ui_ux|product_ia|content|trust|service", "target": "Category|brand", "client_benchmark": false, "quote": "≤15 words", "summary": "string", "frequency": "recurring · N+ voices"}],
    "competitor_complaints": [],
    "client_complaints": [],
    "so_design": ["string"]
  }
}`;

// ─────────────────────────── ACT III ───────────────────────────

const ACT_3_PROMPT = `${SHARED_HEADER}
## Act III — the competitive landscape

Emit a JSON object with EXACTLY these top-level keys: competitor_set, competitive_dimensions, feature_heatmap, positioning_map.

### Counts
- competitor_set.cards: 6 total (4 direct_local + 2 global_anchor). Client benchmarks named in the brief appear inline with client_benchmark=true (no separate cluster).
- competitive_dimensions: 5 D-x cards, each with local_pattern (CR-x) and cross_category (CC-x) references.
- feature_heatmap.features: 8–12 rows. local_brands and global_brands: 4–5 each. Each row in rows must have length = local_brands + global_brands + 1 (the target column comes last).
- positioning_map.dots: include direct competitors, global anchors, client benchmarks (kind="client_benchmark"), and one target dot (kind="target") in a clearly empty quadrant. Axis coordinates are 0–100.

Use web search to ground competitor strengths/weaknesses and to identify cross-category patterns.

### JSON shape
{
  "competitor_set": {
    "cards": [{"name": "string", "country": "XX", "client_benchmark": false, "cluster": "direct_local|global_anchor", "best_at": "string", "weakest_at": "string", "what_to_steal": "string"}],
    "so_design": ["string"]
  },
  "competitive_dimensions": [{"id": "D-1", "gap_statement": "italic-style sentence", "local_pattern": [{"id": "CR-1", "text": "string"}], "cross_category": [{"id": "CC-1", "text": "string"}], "audience_impact": "string", "on_in_scope": "optional string"}],
  "feature_heatmap": {
    "features": ["string"],
    "local_brands": ["string"],
    "global_brands": ["string"],
    "target_column": "string — the product we're designing for",
    "rows": [[{"status": "strong|basic|none"}]],
    "read": "plain-English read on the feature combo that's hard to copy",
    "so_design": ["string"]
  },
  "positioning_map": {
    "axis_x": {"low": "string", "high": "string"},
    "axis_y": {"low": "string", "high": "string"},
    "dots": [{"label": "string", "x": 50, "y": 50, "kind": "direct|global|client_benchmark|target"}],
    "so_design": ["string"]
  }
}`;

// ─────────────────────────── ACT IV ───────────────────────────

const ACT_4_PROMPT = `${SHARED_HEADER}
## Act IV — your turn

This is the synthesis Act. It pulls together everything earlier Acts established (you'll see the prior IDs and headlines in the user message). Emit a JSON object with EXACTLY these top-level keys: ideas, tensions, module_ideas, kpi_focus, beyond_the_brief, kickoff, closing_thesis, glossary.

### Counts
- ideas: 5–8 cards (serial 01, 02, …). Each carries kpi_tags only when the research supports the link, plus traces (an array of source IDs like ["I-2", "A-1", "V-5"]).
- tensions: 4–6 prose cards. headline phrased as a question. NO Path A / Path B.
- module_ideas: 8–12. Each carries an on_in_scope boolean.
- kpi_focus: one card per KPI in hero.kpis. OMIT this section entirely (empty array) if no KPIs.
- beyond_the_brief: EXACTLY 3 cards (B-01, B-02, B-03) in 3 DIFFERENT registers (ritual / memory / social / earned_progress / circular). Each carries an inline SVG sketch (≤6 elements; keep simple). "Borrowed from" credit MUST name something outside the category — if it names another product in the same category, re-generate.
- kickoff.questions: 5–8. kickoff.sprints: 3–5.
- closing_thesis: exactly 3 + 3 + 1 (research_makes_clear has 3 items, tensions_still_live has 3, doesnt_answer is one line).
- glossary: 8–12 platforms.

### Beyond-the-brief method (lateral-first)
For each of the 3 delighter cards:
1. Read the emotional core of the brand + audience (use the KYC tone + persona descriptors carried in your user message).
2. Borrow from OUTSIDE the category (rituals, memory artifacts, social moments, earned progress, quiet companionship, curated stewardship, circular economies).
3. Marry feeling + borrow as a "what if" sentence.
4. Pressure-test for brand fit and buildability in a quarter.
5. Trace it back to a persona/VoC ID inside user_hook.

Pick three from DIFFERENT registers (ritual / memory / social / earned_progress / circular).

### JSON shape
{
  "ideas": [{"serial": "01", "statement": "string", "whats_behind_it": "string", "audience_impact": ["string"], "kpi_tags": [{"direction": "up", "label": "string"}], "on_in_scope": "optional string", "possible_upside": "string", "possible_cost": "string", "falsified_by": "measurable condition", "traces": ["I-1", "A-2"]}],
  "tensions": [{"headline": "string ending with ?", "tag": "audience|positioning|hard_to_copy|platform|scope_ambition", "research_suggests": "string", "pulls_other_way": "string", "affects": "string"}],
  "module_ideas": [{"name": "string", "descriptor": "short descriptor", "what_it_is": "string", "on_in_scope": true}],
  "kpi_focus": [{"id": "K-1", "kpi": {"direction": "up", "label": "string"}, "current_state": "string", "target": "string", "what_moves_this": [{"text": "string", "anchor": "module-ideas|ideas|voice-of-customer"}], "what_doesnt": "string"}],
  "beyond_the_brief": [{"id": "B-01", "register": "ritual|memory|social|earned_progress|circular", "name": "evocative name", "hook": "italic-feeling one-line pitch", "what_it_is": "2–3 sentences", "mechanic": ["4–6 bullets"], "brand_fit": "string", "user_hook": "string citing A-x or V-x", "borrowed_from": "outside-category credit", "sketch_svg": "<svg ...>...</svg>", "risks": ["2–3 short risks"]}],
  "kickoff": {
    "questions": [{"question": "string", "why_matters": "string", "owner": "string"}],
    "sprints": [{"label": "Sprint 1 / Core loop", "modules": ["string"]}]
  },
  "closing_thesis": {
    "leans_toward": "2–3 sentences",
    "research_makes_clear": ["string", "string", "string"],
    "tensions_still_live": ["string", "string", "string"],
    "doesnt_answer": "one line"
  },
  "glossary": [{"name": "string", "market": "XX", "url": "https://...", "why": "1–2 sentences"}]
}`;

export const ACT_CONFIGS: Record<ActNumber, ActConfig> = {
  1: {
    number: 1,
    label: "Act I of IV — The landscape",
    shortLabel: "The landscape",
    maxTokens: 8000,
    searchMaxUses: 5,
    keys: ["title", "subtitle", "hero", "know_your_client", "product_context", "category_insights"],
    systemPrompt: ACT_1_PROMPT,
  },
  2: {
    number: 2,
    label: "Act II of IV — The people",
    shortLabel: "The people",
    maxTokens: 11000,
    searchMaxUses: 8,
    keys: ["audience_set", "journey_grid", "behaviour_insights", "voice_of_customer"],
    systemPrompt: ACT_2_PROMPT,
  },
  3: {
    number: 3,
    label: "Act III of IV — The competitive landscape",
    shortLabel: "The competitive landscape",
    maxTokens: 9000,
    searchMaxUses: 6,
    keys: ["competitor_set", "competitive_dimensions", "feature_heatmap", "positioning_map"],
    systemPrompt: ACT_3_PROMPT,
  },
  4: {
    number: 4,
    label: "Act IV of IV — Your turn",
    shortLabel: "Your turn",
    maxTokens: 16000,
    searchMaxUses: 3,
    keys: ["ideas", "tensions", "module_ideas", "kpi_focus", "beyond_the_brief", "kickoff", "closing_thesis", "glossary"],
    systemPrompt: ACT_4_PROMPT,
  },
};

// Build the "what's in earlier Acts" context the model needs for Acts 2–4.
// Trims to IDs + headlines (not full payloads) so the user-message stays
// short. The brief itself is in cachedContext, so we don't re-paste it.
export function buildPrevActSummary(prev: Partial<DiscoveryDeckV4>): string {
  const lines: string[] = [];

  if (prev.title) lines.push(`Deck title: ${prev.title}`);
  if (prev.hero?.tiles?.length) {
    const tiles = prev.hero.tiles.map((t) => `${t.label}: ${t.value}`).join(" | ");
    lines.push(`Hero tiles: ${tiles}`);
  }
  if (prev.hero?.kpis?.length) {
    lines.push(`KPIs: ${prev.hero.kpis.map((k) => `${k.direction} ${k.label}`).join(" · ")}`);
  }
  if (prev.product_context?.surfaces?.length) {
    const inScope = prev.product_context.surfaces.filter((s) => s.in_scope).map((s) => s.label).join(", ") || "(none)";
    lines.push(`In-scope surface: ${inScope}`);
  }
  if (prev.category_insights?.length) {
    lines.push("Category insights (Act I):");
    for (const ci of prev.category_insights) {
      lines.push(`  ${ci.id}: ${ci.statement}`);
    }
  }
  if (prev.behaviour_insights?.length) {
    lines.push("Behaviour insights (Act II):");
    for (const b of prev.behaviour_insights) {
      lines.push(`  ${b.id}: ${b.persona} — ${b.frictions}`);
    }
  }
  if (prev.voice_of_customer) {
    const allVoc = [
      ...(prev.voice_of_customer.category_complaints || []),
      ...(prev.voice_of_customer.competitor_complaints || []),
      ...(prev.voice_of_customer.client_complaints || []),
    ];
    if (allVoc.length) {
      lines.push("Voice of Customer (Act II):");
      for (const v of allVoc) {
        lines.push(`  ${v.id}: ${v.target} — "${v.quote}"`);
      }
    }
  }
  if (prev.competitor_set?.cards?.length) {
    lines.push("Competitors (Act III):");
    for (const c of prev.competitor_set.cards) {
      lines.push(`  ${c.name}${c.client_benchmark ? " (client benchmark)" : ""}: ${c.best_at}`);
    }
  }
  if (prev.competitive_dimensions?.length) {
    lines.push("Competitive dimensions (Act III):");
    for (const d of prev.competitive_dimensions) {
      lines.push(`  ${d.id}: ${d.gap_statement}`);
    }
  }

  return lines.join("\n");
}

// Merge a per-Act partial into the accumulating deck.
export function mergeActIntoDeck(
  accumulator: Partial<DiscoveryDeckV4>,
  actPartial: Partial<DiscoveryDeckV4>,
): Partial<DiscoveryDeckV4> {
  return { ...accumulator, ...actPartial };
}

// Validate that we have all v4 sections — used after Act IV to confirm the
// deck is complete enough to save.
export function isCompleteV4(deck: Partial<DiscoveryDeckV4>): deck is DiscoveryDeckV4 {
  const required: (keyof DiscoveryDeckV4)[] = [
    "title", "subtitle", "hero", "know_your_client", "product_context",
    "category_insights", "audience_set", "journey_grid", "behaviour_insights",
    "voice_of_customer", "competitor_set", "competitive_dimensions",
    "feature_heatmap", "positioning_map", "ideas", "tensions", "module_ideas",
    "kpi_focus", "beyond_the_brief", "kickoff", "closing_thesis", "glossary",
  ];
  for (const k of required) {
    if (!(k in deck)) return false;
  }
  return true;
}
