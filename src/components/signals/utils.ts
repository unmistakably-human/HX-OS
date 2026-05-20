// Pure helpers used by every Signals component. No React, no DOM access.
// Mirrors the helpers in signals-final/dashboard.html so the renderer
// produces identical strings.

import type { AnyItem, ClientConfig, HeroStat, MetaConfig, SectionId } from "@/lib/signals/types";

export const ALL_DOMAIN = { id: "all", label: "All", color: "#1a1a1a", bg: "#f0f0eb" } as const;
export const CROSS_DOMAIN = { id: "cross", label: "Cross-domain", color: "#c2410c", bg: "#fff7ed" } as const;

export interface DomainEntry {
  id: string;
  label: string;
  color: string;
  bg: string;
}

export function tintFor(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.92);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

export function buildDomains(clients: ClientConfig[]): DomainEntry[] {
  return [
    ALL_DOMAIN,
    ...clients.map((c) => ({ id: c.id, label: c.name, color: c.color, bg: tintFor(c.color) })),
    CROSS_DOMAIN,
  ];
}

export function domainFor(clientId: string | undefined, clients: ClientConfig[]): DomainEntry {
  if (!clientId || clientId === "all" || clientId === "cross") return CROSS_DOMAIN;
  const c = clients.find((x) => x.id === clientId);
  if (!c) return CROSS_DOMAIN;
  return { id: c.id, label: c.name, color: c.color, bg: tintFor(c.color) };
}

export function fmtRelDate(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtFullDate(d?: Date): string {
  return (d || new Date()).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function num(n: number | string | null | undefined): string {
  if (n == null) return "";
  if (typeof n !== "number") return String(n);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function stripPlatformPrefix(title: string | undefined): string {
  return String(title || "").replace(/^(Mobbin|Dribbble|Behance|Pinterest|Savee|r\/[a-zA-Z0-9_]+)\s*[·:]\s*/i, "");
}

export function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export function avatarBg(seed: string): string {
  const palettes = [
    ["#f59e0b", "#d97706"],
    ["#6d28d9", "#7c3aed"],
    ["#1d4ed8", "#3b82f6"],
    ["#0d9488", "#14b8a6"],
    ["#be185d", "#db2777"],
    ["#15803d", "#22c55e"],
    ["#c2410c", "#ea580c"],
  ];
  let h = 0;
  for (let i = 0; i < (seed || "").length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const p = palettes[Math.abs(h) % palettes.length];
  return `linear-gradient(135deg,${p[0]},${p[1]})`;
}

// Stat extraction — regex fallback when the skill didn't author hero_stats.
// Ported from extractStats() in dashboard.html. Confidence-scored, sorted, cap 2.
export function extractStats(text: string): HeroStat[] {
  if (!text) return [];
  const scrubbed = String(text)
    .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, "")
    .replace(
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}\b/gi,
      "",
    )
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\bQ[1-4]\b/gi, "")
    .replace(/\bFY\d{2,4}\b/gi, "")
    .replace(/\bH[12]\b/g, "");
  const re =
    /(₹\s?\d[\d,]*(?:\.\d+)?\s*(?:K|M|B|Cr|bn|Lakh|crore)?|\$\d[\d,]*(?:\.\d+)?\s*(?:K|M|B|bn|million|billion|trillion)?|\d[\d,]*(?:\.\d+)?\s*(?:%|×|x|K|M|B|Cr|bn|million|billion|trillion|hrs?|mins?|days?|weeks?|months?|cities|countries|languages|stores|locations|tx\/day|orders\/day|per\s+\w+|\/\s*\w+|YoY|MoM|y\/y))/gi;
  const out: (HeroStat & { _c: number })[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(scrubbed)) !== null && out.length < 4) {
    const raw = m[1].trim().replace(/\s+/g, " ");
    const norm = raw.toLowerCase().replace(/\s+/g, "");
    if (seen.has(norm)) continue;
    const idx = m.index;
    const after = scrubbed.slice(idx + raw.length, idx + raw.length + 80).trim();
    const before = scrubbed.slice(Math.max(0, idx - 60), idx).trim();
    let label = "";
    const afterMatch = after.match(/^[\s,—–\-:]*((?:[a-zA-Z][a-zA-Z\-/]+\s+){0,3}[a-zA-Z][a-zA-Z\-/]+)/);
    if (afterMatch) label = afterMatch[1].trim().split(/\s+/).slice(0, 3).join(" ");
    if (!label) {
      const beforeMatch = before.match(/([a-zA-Z][a-zA-Z\-/\s]{3,30})\s*$/);
      if (beforeMatch) label = beforeMatch[1].trim().split(/\s+/).slice(-3).join(" ");
    }
    const stopLabels = new Set([
      "of", "in", "at", "on", "for", "to", "from", "with", "and", "the",
      "a", "an", "is", "was", "are", "were", "as", "by", "its", "their",
      "this", "these", "that", "those", "vs", "via", "per", "already",
      "also", "now", "soon", "still", "just", "like", "about", "into",
    ]);
    if (label) {
      const w = label.toLowerCase().split(/\s+/);
      if (w.every((x) => stopLabels.has(x))) label = "";
      if (/^\d/.test(label)) label = "";
    }
    const hasUnit = /[%×xKMBCr$₹]|YoY|MoM|cities|countries|languages|stores|locations|days?|million|billion|trillion/i.test(raw);
    const hasMagnitudePrefix = /^[$₹]/.test(raw) || /[KMBCr]\b|million|billion|trillion/i.test(raw);
    const hasGoodLabel = label.length >= 4 && /[a-zA-Z]{3}/.test(label);
    const isWeakInteger = /^\d{1,2}$/.test(raw) && !hasUnit && !hasGoodLabel;
    if (isWeakInteger) continue;
    if (!hasUnit && !hasGoodLabel) continue;
    const confidence = (hasUnit ? 1 : 0) + (hasMagnitudePrefix ? 1 : 0) + (hasGoodLabel ? 1 : 0);
    if (confidence < 1) continue;
    out.push({ n: raw, l: label, _c: confidence });
    seen.add(norm);
  }
  return out
    .sort((a, b) => b._c - a._c)
    .slice(0, 2)
    .map((s) => ({ n: s.n, l: s.l }));
}

export function looksNumeric(s: string | undefined): boolean {
  if (!s) return false;
  const t = String(s).trim();
  if (/^[\d₹$+\-]/.test(t)) return true;
  if (/\d+\s*[%×x]/.test(t)) return true;
  if (/\d+\s*(K|M|B|Cr|bn|hr|min|d|x|×)/i.test(t)) return true;
  return false;
}

// Apply hero_emphasis: wrap phrases in <em> tags. Returns a list of segments
// so React can render them safely without dangerouslySetInnerHTML.
export interface Segment {
  text: string;
  emphasis?: boolean;
}
export function applyEmphasis(title: string, phrases: string[] | undefined): Segment[] {
  if (!Array.isArray(phrases) || !phrases.length) return [{ text: title }];
  let segments: Segment[] = [{ text: title }];
  for (const p of phrases) {
    const next: Segment[] = [];
    for (const seg of segments) {
      if (seg.emphasis) {
        next.push(seg);
        continue;
      }
      const parts = seg.text.split(p);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) next.push({ text: parts[i] });
        if (i < parts.length - 1) next.push({ text: p, emphasis: true });
      }
    }
    segments = next;
  }
  return segments;
}

// Decide which client tab(s) include an item. Mirrors filterByClient.
export function filterByClient<T extends { client: string }>(items: T[], activeTab: string): T[] {
  if (activeTab === "all") return items;
  if (activeTab === "cross") return items.filter((it) => it.client === "all");
  return items.filter((it) => it.client === activeTab || it.client === "all");
}

// Mockup background class — keys off client id; falls back to "cross". The
// new module's three hardcoded classes were placeholders; we generalise.
export function visualBgStyle(item: { client: string }, meta: MetaConfig): React.CSSProperties {
  if (item.client && item.client !== "all" && item.client !== "cross") {
    const c = meta.clients.find((x) => x.id === item.client);
    if (c) {
      const h = c.color.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      // Mix to ~88% white so the mockup reads on a tinted backdrop.
      const mix = (v: number) => Math.round(v + (255 - v) * 0.88);
      return { background: `rgb(${mix(r)},${mix(g)},${mix(b)})` };
    }
  }
  return { background: "#faf6f0" };
}

// Topic chips: top-6 keywords (count ≥ 3) across all items.
export function rapidFireTopics(allItems: AnyItem[]): { topic: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const it of allItems) {
    const all = ([] as string[])
      .concat(it.tags || [])
      .concat(it.theme_keywords || [])
      .map((s) => String(s).toLowerCase().trim())
      .filter(Boolean);
    const seen = new Set<string>();
    for (const t of all) {
      if (seen.has(t)) continue;
      seen.add(t);
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([topic, count]) => ({ topic, count }));
}

export function itemMatchesTopic(item: AnyItem, topic: string | null): boolean {
  if (!topic) return true;
  const all = ([] as string[])
    .concat(item.tags || [])
    .concat(item.theme_keywords || [])
    .map((s) => String(s).toLowerCase());
  return all.includes(topic);
}

// Resolve a connection: given an id, find which section + item it points at.
export function buildItemIndex(sections: Record<SectionId, { items: AnyItem[] }>): Record<string, { item: AnyItem; sectionId: SectionId }> {
  const index: Record<string, { item: AnyItem; sectionId: SectionId }> = {};
  for (const sectionId of Object.keys(sections) as SectionId[]) {
    for (const it of sections[sectionId].items) {
      index[it.id] = { item: it, sectionId };
    }
  }
  return index;
}

// Reddit thread title cleaner — ports cleanRedditTitle.
export function cleanRedditTitle(rawTitle: string | undefined, subreddit?: string, count?: number): string {
  let t = String(rawTitle || "");
  if (subreddit) {
    const sub = subreddit.replace(/^r\//, "");
    t = t.replace(new RegExp("^r/" + sub + "\\s*[:\\-—]\\s*", "i"), "");
    t = t.replace(new RegExp("^r/" + sub + "\\s+(?:debating|debate|asking|debate on|comments)\\b\\s*", "i"), "");
  }
  if (count) {
    t = t.replace(/[\s,—\-]+\d+[,\s]+comments\b[^—]*$/i, "");
    t = t.replace(/[\s,—\-]+\d+-comment\s+\w[\w\s\-]*$/i, "");
  }
  return t.trim();
}
