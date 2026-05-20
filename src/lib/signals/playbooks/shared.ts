// Shared rules every section playbook injects into Claude's system prompt.
//
// Ported from signals-final/docs/voice-and-strength.md + the headers of each
// section in signals-final/skills/refresh-signals/SKILL.md. These rules are
// the spine of the dashboard — every renderer downstream assumes they hold.

import { DESIGN_SURFACES, SCHEMA_VERSION, type ClientConfig, type MetaConfig } from "../types";

export const SHARED_SYSTEM_RULES = `
You are a research operator for the HumanX Labs Signals Dashboard. The dashboard
hands designers facts; it does not tell them what to do. Your output is a JSON
payload that the dashboard will validate, persist, and render.

OBSERVATION-FIRST VOICE (applies to every field you write)
- title: observational, past-tense, factual, ≤ 90 chars. *"Zomato made 15-min
  food delivery a permanent IA tier"* — never *"Treat 10-min delivery as default"*.
- summary: plain-English supporting detail. 90-180 chars. Specific numbers,
  named regulations, named regulator, dated reports. No analyst voice.
- observation: optional. One neutral notable point. Never imperative. ≤ 160 chars.
  If you cannot write something that adds beyond title + summary, omit it.
- No "should", "consider", "rebuild", "stop", "treat" anywhere.
- No exclamations, no emoji, no buzzword stacks. "AI-powered embedded fintech"
  → "AI in payment flows."
- Numbers stay specific (₹14.90, 640M, 35 cities). Don't round into vibes.

STRENGTH RUBRIC (1-3 — assigned per item)
For each candidate, score 4 dimensions and take floor of the average:
  Source confidence : 3 primary / 2 trade press citing primary / 1 aggregator
  Recency           : 3 ≤3d / 2 4-10d / 1 11-30d
  Surface specificity: 3 single surface / 2 1-2 ambiguous / 1 generic
  Underlying datapoint: 3 specific number/regulation/date / 2 concrete claim / 1 vague
Average > 2.5 → 3. > 1.5 → 2. Otherwise 1. Distribution per refresh: roughly
25% strength-3, 60% strength-2, 15% strength-1. A section is allowed to ship
all 2s when nothing earned a 3 that day. Never force a 3.

DESIGN SURFACE — the 17-controlled vocabulary. Every item declares 1-2 from:
  ${DESIGN_SURFACES.join(", ")}.
Pick the surface a designer would open Figma to work on. Cap at 2; if a card
touches 4 surfaces, it should probably be 2 cards.

PROVENANCE — required on every card. Object shape:
  { skill: string, primary_source_url: string, derivation_note: string }
derivation_note: one sentence, ≤ 200 chars. Pattern: "[surfaced via X];
[cross-checked against Y]; [confidence note]."

RUN LOG — required at the top of the section payload. Object shape:
  { items_shipped, candidates_rejected, rejection_reasons: [{reason,count}],
    queries_run: [string], notes? }
The dashboard renders this in a "How this was picked" drawer. Don't pad —
honest rejection reasons are more useful than inflated counts.

OUTPUT FORMAT (strict)
Your final response must contain exactly one fenced JSON block tagged "json"
that follows the schema below. Do NOT include any other JSON in the message —
search-tool reasoning is fine, but your final answer is a single fenced block.
Example shape:

\`\`\`json
{
  "section": "<section-id>",
  "schema_version": ${SCHEMA_VERSION},
  "generated_at": "<ISO 8601 with timezone>",
  "run_log": { "items_shipped": N, "candidates_rejected": M, "rejection_reasons": [...], "queries_run": [...] },
  "items": [ ... ]
}
\`\`\`

QUALITY BAR (the meta-rule)
For every card: would a designer learn something from this in 5 seconds of
skimming? If no, drop it. The cost of an empty section is far lower than the
cost of noise.
`.trim();

/** Build the per-refresh context block — clients, cross-domain voices,
 *  current ISO date. Cached on Claude's side so we don't pay for it across
 *  multiple section calls in one refresh. */
export function buildContextBlock(meta: MetaConfig, today: string): string {
  const clientsBlock = meta.clients.length
    ? meta.clients
        .map((c) => formatClient(c))
        .join("\n\n")
    : "(No clients configured yet. Run all sections against client id 'all' as cross-client signals only.)";

  const voicesBlock = meta.cross_domain_voices.length
    ? meta.cross_domain_voices.map((v) => `- ${v.handle} (${v.name}, ${v.role})`).join("\n")
    : "(No cross-domain voices configured yet.)";

  return `
CURRENT REFRESH
Today is ${today}. All "last N days" windows are computed from this date.

CLIENTS (read these from meta.clients — the only place client config lives):
${clientsBlock}

CROSS-DOMAIN VOICES (used by leader-tweets when client-specific handles are silent):
${voicesBlock}
`.trim();
}

function formatClient(c: ClientConfig): string {
  const lines = [
    `- id: ${c.id}`,
    `  name: ${c.name}`,
    c.tagline ? `  tagline: ${c.tagline}` : "",
    `  tags: [${c.tags.join(", ")}]`,
    `  competitors: [${c.competitors.join(", ")}]`,
    `  leader_handles: [${c.leader_handles.join(", ")}]`,
    c.subreddit_watchlist && c.subreddit_watchlist.length
      ? `  subreddit_watchlist: [${c.subreddit_watchlist.join(", ")}]`
      : "",
  ];
  return lines.filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// JSON extraction — pulls the fenced ```json block from Claude's output.
// Resilient to extra prose, search-tool reasoning, and pre/post commentary.
// ---------------------------------------------------------------------------
export function extractJsonBlock(text: string): unknown | null {
  if (!text) return null;
  // Prefer fenced ```json blocks.
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch (e) {
      // Fall through to lenient parse
      console.warn("[signals] fenced json parse failed", e);
    }
  }
  // Fallback: first {…} or […] block. Use a simple brace-matching scan.
  const first = text.indexOf("{");
  if (first >= 0) {
    let depth = 0;
    for (let i = first; i < text.length; i++) {
      const c = text[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(first, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

// Stable id helper — deterministic slug for ids and history keys.
export function slugify(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isoDate(d?: Date): string {
  return (d || new Date()).toISOString();
}
