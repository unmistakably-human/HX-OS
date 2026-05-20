export interface DeckMetric {
  label: string;
  value: string;
}

export interface CategoryInsight {
  number: number;
  headline: string;
  evidence: string;
  implication: string;
}

export interface AudienceInsight {
  segment: string;
  headline: string;
  gap: string;
  benchmark: string;
}

export interface UxBenchmark {
  attribute: string;
  dominant: { players: string[]; description: string };
  contrarian: { players: string[]; description: string };
  cross_category: { platform: string; industry: string; pattern: string };
  gap: string;
}

export interface UxPattern {
  name: string;
  example: string;
  how: string;
  applicability: string;
}

export interface FirstPurchase {
  platform: string;
  market: string;
  trigger: string;
}

export interface Retention {
  platform: string;
  mechanism: string;
  verdict: "positive" | "negative";
  verdict_text: string;
}

export interface ConversionRetention {
  first_purchase: FirstPurchase[];
  retention: Retention[];
  takeaway: string;
}

export interface BrandComparison {
  brands: string[];
  features: { name: string; values: string[] }[];
}

export interface FeatureBenchmark {
  local: BrandComparison;
  global: BrandComparison;
  takeaway: string;
}

export interface CrossCategory {
  platform: string;
  industry: string;
  pattern: string;
  transferable: string;
  study: string;
}

export interface Opportunity {
  rank: number;
  title: string;
  description: string;
  proof: string;
  risk: string;
  tags: string[];
}

export interface GlossaryPlatform {
  name: string;
  market: string;
  url: string;
  why: string;
}

export interface DiscoveryDeck {
  title: string;
  subtitle: string;
  metrics: DeckMetric[];
  category_insights: CategoryInsight[];
  audience_insights: AudienceInsight[];
  ux_benchmarks: UxBenchmark[];
  ux_patterns: UxPattern[];
  conversion_retention: ConversionRetention;
  feature_benchmark: FeatureBenchmark;
  cross_category: CrossCategory[];
  opportunities: Opportunity[];
  glossary: GlossaryPlatform[];
}

// ═══ v4 deck shape — see Discovery_final/SKILL.md ═══

export interface DesignerTile {
  label: string;       // "Primary user" | "In-scope surface" | "Design challenge" | "Positioning lean"
  value: string;       // The short read shown in the tile (≤8 words)
  sub: string;         // The supporting line under the value
}

export interface KpiChip {
  direction: "up" | "down" | "neutral";
  label: string;       // e.g., "AOV +15% by Y1"
}

export interface DeckHero {
  banner: string;      // "Discovery mode · ideas, not verdicts" framing line
  tiles: DesignerTile[];  // exactly four tiles
  kpis: KpiChip[];     // 0–4 chips
}

export interface KycBlock {
  // Six sub-blocks: a-the-bet, b-tone, c-recent-moves, d-stakeholders,
  // e-sources, f-unknowns. Each is a small card.
  label: string;       // "a · The bet", "b · How they want to sound", …
  body: string;        // 1–3 sentences
}

export interface KnowYourClient {
  title: string;       // "Reliance Brands × Mothercare"
  blocks: KycBlock[];
  so_design: string[]; // 2–4 bullets
}

export interface SurfaceListItem {
  name: string;        // "App (iOS + Android)"
  role: string;        // "primary surface for repeat shoppers …"
}

export interface SurfaceCard {
  group: "external" | "internal";
  label: string;       // "External · customer-facing", "Internal · operator-facing"
  in_scope: boolean;   // true for the IN SCOPE treatment
  items: SurfaceListItem[];
}

export interface ProductContextSection {
  definition: string;       // 1–2 italic sentences
  is_is_not: string;        // "Is: … Is not: …"
  surfaces: SurfaceCard[];  // External + Internal + extras
}

export interface CategoryInsightV4 {
  id: string;               // "I-1"
  label: string;            // "Long-running shift"
  contradicts_convention: boolean;
  statement: string;
  evidence: string;
  could_mean: string[];     // 2–3 alternative reads
  on_in_scope?: string;     // optional callout
}

export interface BehaviourInsight {
  id: string;               // "A-1"
  persona: string;          // "Anxious first-timer · Tier 1 metros"
  frictions: string;
  could_mean: string[];
  benchmark: string;        // "who handles this pattern well"
  on_in_scope?: string;
}

export interface AudienceRoleType {
  // 2×2 matrix on transacts × uses-the-product. Four role-types.
  axis: "primary" | "secondary" | "user_only" | "influencer";
  title: string;            // "Primary · Transactor-user"
  description: string;
}

export interface JourneyCell {
  intensity: 3 | 2 | 1 | 0 | -1; // ●●● ●● ● · ○
  entry?: boolean;
  drop?: boolean;
}

export interface JourneyRow {
  persona: string;
  cells: JourneyCell[];     // length = modules.length
}

export interface JourneyGrid {
  modules: string[];        // x-axis labels; the in-scope column is highlighted
  in_scope_module_index: number; // -1 if no in-scope column
  rows: JourneyRow[];
  so_design: string[];
}

export interface VocCard {
  id: string;               // "V-1"
  source: string;           // "Reddit · r/IndianParents"
  category: "ui_ux" | "product_ia" | "content" | "trust" | "service";
  target: string;           // "Category", "FirstCry", "Mothercare India"
  client_benchmark: boolean;
  quote: string;            // ≤15 words
  summary: string;
  frequency: string;        // "recurring · 14+ independent voices"
}

export interface VoiceOfCustomer {
  category_complaints: VocCard[];
  competitor_complaints: VocCard[];
  client_complaints: VocCard[];
  so_design: string[];
}

export interface CompetitorCard {
  name: string;
  country: string;
  client_benchmark: boolean;
  cluster: "direct_local" | "global_anchor";
  best_at: string;
  weakest_at: string;
  what_to_steal: string;
}

export interface CompetitorSet {
  cards: CompetitorCard[];
  so_design: string[];
}

export interface CompetitiveDimension {
  id: string;               // "D-1"
  gap_statement: string;
  local_pattern: { id: string; text: string }[];   // "CR-x"
  cross_category: { id: string; text: string }[]; // "CC-x"
  audience_impact: string;
  on_in_scope?: string;
}

export interface FeatureHeatmapCell {
  status: "strong" | "basic" | "none";
}

export interface FeatureHeatmap {
  features: string[];       // 8–12 row labels
  local_brands: string[];   // 4–5
  global_brands: string[];  // 4–5
  target_column: string;    // e.g., "Mothercare India"
  // rows: features.length; each row = [local, …, global, …, target]
  rows: FeatureHeatmapCell[][];
  read: string;             // plain-English "feature combo hard to copy because"
  so_design: string[];
}

export interface PositioningDot {
  label: string;
  x: number;                // 0–100
  y: number;                // 0–100
  kind: "direct" | "global" | "client_benchmark" | "target";
}

export interface PositioningMap {
  axis_x: { low: string; high: string };
  axis_y: { low: string; high: string };
  dots: PositioningDot[];
  so_design: string[];
}

export interface IdeaCard {
  serial: string;           // "01"
  statement: string;
  whats_behind_it: string;
  audience_impact: string[];
  kpi_tags: KpiChip[];
  on_in_scope?: string;
  possible_upside: string;
  possible_cost: string;
  falsified_by: string;
  traces: string[];         // ["I-1", "A-2", …]
}

export interface TensionCard {
  headline: string;         // phrased as a question
  tag: "audience" | "positioning" | "hard_to_copy" | "platform" | "scope_ambition";
  research_suggests: string;
  pulls_other_way: string;
  affects: string;
}

export interface ModuleIdea {
  name: string;
  descriptor: string;
  what_it_is: string;
  on_in_scope: boolean;
}

export interface KpiFocusCard {
  id: string;               // "K-1"
  kpi: KpiChip;
  current_state: string;
  target: string;
  what_moves_this: { text: string; anchor?: string }[];
  what_doesnt: string;
}

export interface DelighterCard {
  id: string;               // "B-01"
  register: "ritual" | "memory" | "social" | "earned_progress" | "circular";
  name: string;
  hook: string;
  what_it_is: string;
  mechanic: string[];
  brand_fit: string;
  user_hook: string;
  borrowed_from: string;
  sketch_svg?: string;      // optional inline SVG (≤6 elements)
  risks: string[];
}

export interface KickoffQuestion {
  question: string;
  why_matters: string;
  owner: string;
}

export interface SprintRibbon {
  label: string;            // "Sprint 1 / Core loop"
  modules: string[];        // module names that live in this sprint
}

export interface Kickoff {
  questions: KickoffQuestion[];
  sprints: SprintRibbon[];
}

export interface ClosingThesis {
  leans_toward: string;
  research_makes_clear: string[];   // exactly 3
  tensions_still_live: string[];    // exactly 3
  doesnt_answer: string;            // one line
}

export interface DiscoveryDeckV4 {
  version: "v4";
  title: string;
  subtitle: string;
  hero: DeckHero;
  know_your_client: KnowYourClient;
  product_context: ProductContextSection;
  category_insights: CategoryInsightV4[];
  audience_set: AudienceRoleType[];
  journey_grid: JourneyGrid;
  behaviour_insights: BehaviourInsight[];
  voice_of_customer: VoiceOfCustomer;
  competitor_set: CompetitorSet;
  competitive_dimensions: CompetitiveDimension[];
  feature_heatmap: FeatureHeatmap;
  positioning_map: PositioningMap;
  ideas: IdeaCard[];
  tensions: TensionCard[];
  module_ideas: ModuleIdea[];
  kpi_focus: KpiFocusCard[];
  beyond_the_brief: DelighterCard[];
  kickoff: Kickoff;
  closing_thesis: ClosingThesis;
  glossary: GlossaryPlatform[];
}

export type AnyDiscoveryDeck = DiscoveryDeck | DiscoveryDeckV4;

export function isDeckV4(d: AnyDiscoveryDeck | null | undefined): d is DiscoveryDeckV4 {
  return !!d && (d as DiscoveryDeckV4).version === "v4";
}

function fixJsonRaw<T>(raw: string): T {
  let s = (raw || "").trim().replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const si = s.indexOf("{");
  if (si > 0) s = s.slice(si);
  if (si < 0) throw new Error("No JSON object found in response");

  try {
    return JSON.parse(s);
  } catch {
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let i = 0; i < s.length; i++) {
      if (esc) { esc = false; continue; }
      if (s[i] === "\\") { esc = true; continue; }
      if (s[i] === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (s[i] === "{" || s[i] === "[") depth++;
      if (s[i] === "}" || s[i] === "]") {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end > 0) {
      try { return JSON.parse(s.slice(0, end)); } catch { /* continue */ }
    }
    let r = s.replace(/,\s*([}\]])/g, "$1");
    const ob = (r.match(/{/g) || []).length - (r.match(/}/g) || []).length;
    const osq = (r.match(/\[/g) || []).length - (r.match(/]/g) || []).length;
    for (let i = 0; i < osq; i++) r += "]";
    for (let i = 0; i < ob; i++) r += "}";
    try { return JSON.parse(r); } catch {
      throw new Error("Could not parse response as JSON. Try again.");
    }
  }
}

/** Parse potentially malformed LLM JSON output into a DiscoveryDeck. */
export function fixJSON(raw: string): DiscoveryDeck {
  return fixJsonRaw<DiscoveryDeck>(raw);
}

/** Parse potentially malformed LLM JSON output into a v4 deck. */
export function fixJsonV4(raw: string): DiscoveryDeckV4 {
  return fixJsonRaw<DiscoveryDeckV4>(raw);
}
