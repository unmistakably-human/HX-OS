export interface UserSegment {
  name: string;
  age: string;
  gender: string;
  loc: string;
  income: string;
  behaviour: string;
}

export interface DesignTokens {
  brandColors: { name: string; hex: string; usage: string }[];
  gradient?: string;
  neutrals: { name: string; hex: string; usage: string }[];
  typography: { level: string; font: string; weight: string; size: string }[];
  source: "figma" | "upload" | "ai-proposed";
}

export interface AudienceEntry {
  country: string;
  tiers: string[];
}

export interface ProductContext {
  productName: string;
  company: string;
  productType: string;
  stage: string;
  industries: string[];
  audience: string | AudienceEntry[];
  platform: string;
  explain: string;
  briefWhy: string;
  valueProp: string;
  notThis: string;
  clientBrief: string;
  seg1: UserSegment;
  seg2: UserSegment;
  behInsights: string;
  competitors: string;
  flows: string;
  ia: string;
  figmaLink: string;
  upcoming: string;
  dsChoice: string;
  vibe: string;
  colors: string;
  fonts: string;
  designTokens?: DesignTokens | null;
}

export interface Product {
  id: string;
  name: string;
  company: string | null;
  created_at: string;
  updated_at: string;
  product_context: ProductContext | null;
  enriched_pcd: string | null;
  discovery_insights: string | null;
  phase_context: "locked" | "active" | "complete";
  phase_discovery: "locked" | "active" | "complete";
  features?: FeatureSummary[];
  figma_access_token: string | null;
  figma_refresh_token: string | null;
  figma_token_expires_at: string | null;
  figma_file_url: string | null;
}

export interface FeatureSummary {
  id: string;
  name: string;
  feature_type: string | null;
  phase_brief: string;
  phase_discovery: string;
  phase_design_concepts: string;
  phase_concepts: string;
  phase_flow: string;
  phase_hifi: string;
  phase_review: string;
  chosen_concept: string | null;
  updated_at: string;
}

// ═══ NEW: Insights Flow Types ═══

export interface Insight {
  id: string;
  category: "user" | "domain" | "competitor" | "custom";
  tag: string;
  headline: string;
  body: string;
}

export interface HMWStatement {
  id: string;
  question: string;
  fromInsightId: string;
}

export interface DesignConcept {
  name: string;
  tagline: string;
  idea: string;
  solvesFor: string;
  onThePage: string[];
  tradeoffs: string[];
  fromHMW: string;
}

export interface Baseline {
  mustHaves: string[];
  commonlyMissed: string[];
}

export interface BeyondScreen {
  touchpoint: string;
  why: string;
}

// ═══ User Flow ═══

export interface FlowScreen {
  id: string;
  title: string;
  elements: string[];
  x: number;
  y: number;
}

export interface FlowDecision {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface FlowConnection {
  from: string;
  to: string;
  label: string;
  type?: "error";
}

export interface FlowChangelog {
  screen: string;
  status: "original" | "new" | "updated";
  note: string;
}

export interface FlowRationale {
  title: string;
  icon: string;
  reason: string;
}

export interface FlowEdgeCaseCategory {
  category: string;
  items: string[];
}

export interface UserFlow {
  screens: FlowScreen[];
  decisions: FlowDecision[];
  connections: FlowConnection[];
  changelog: FlowChangelog[];
  rationale: FlowRationale[];
  edge_cases: FlowEdgeCaseCategory[];
}

// Drops items the AI sometimes mixes into `screens` that are actually decisions
// (title:null, no elements). Without this, the flow page crashes on
// `s.title.toLowerCase()` while computing entry/error highlights.
export function sanitizeUserFlow(flow: Partial<UserFlow> | null | undefined): UserFlow {
  return {
    screens: (flow?.screens ?? []).filter(
      (s): s is FlowScreen => typeof s?.title === "string" && Array.isArray(s?.elements),
    ),
    decisions: (flow?.decisions ?? []).filter(
      (d): d is FlowDecision => typeof d?.id === "string" && typeof d?.label === "string",
    ),
    connections: flow?.connections ?? [],
    changelog: flow?.changelog ?? [],
    rationale: flow?.rationale ?? [],
    edge_cases: flow?.edge_cases ?? [],
  };
}

// ═══ Feature (updated with insights flow fields) ═══

export interface Feature {
  id: string;
  product_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  feature_type: "screen" | "flow" | null;
  problem: string | null;
  must_have: string | null;
  not_be: string | null;
  additional_context: string | null;
  feature_discovery: string | null;

  // Insights flow
  insights: Insight[] | null;
  selected_insights: string[] | null;
  hmw_statements: HMWStatement[] | null;
  selected_hmws: string[] | null;
  design_concepts: DesignConcept[] | null;
  selected_concepts: string[] | null;
  baseline: Baseline | null;
  beyond_screen: BeyondScreen[] | null;

  // Visual variations (wireframes)
  concepts: Concept[] | null;
  chosen_concept: string | null;
  chat_messages: ChatMessage[];

  // High fidelity designs
  hifi_designs: HifiDesign[] | null;
  hifi_chat_messages: ChatMessage[];
  chosen_hifi: string | null;
  phase_hifi: "locked" | "active" | "complete";

  // User flow
  user_flow: UserFlow | null;
  phase_flow: "locked" | "active" | "complete";

  // Design review
  review_result: ReviewResult | null;
  review_chat_messages: ChatMessage[];
  phase_review: "locked" | "active" | "complete";

  // Phases
  phase_brief: "locked" | "active" | "complete";
  phase_discovery: "locked" | "active" | "complete";
  phase_hmw: "locked" | "active" | "complete";
  phase_design_concepts: "locked" | "active" | "complete";
  phase_visual: "locked" | "active" | "complete";
  phase_concepts: "locked" | "active" | "complete";
}

export interface Concept {
  name: string;
  track: "A" | "B" | "outside";
  coreIdea: string;
  wireframeHtml: string;
  principles: string[];
  pros: string[];
  cons: string[];
  delightMoment: string;
  stakeholderQuestion: string;
}

export interface HifiDesign {
  name: string;
  description: string;
  htmlContent: string;
  priorities: string;
  tradeoffs: string;
}

// ═══ Design Review ═══

export interface ReviewIssue {
  severity: "HIGH" | "MEDIUM" | "LOW";
  problem: string;
  why: string;
  fix: string;
}

export interface ReviewDimension {
  name: string;
  score: number;
}

export interface ReviewResult {
  overallScore: number;
  summary: string;
  dimensions: ReviewDimension[];
  strengths: string[];
  issues: ReviewIssue[];
  ideas: string[];
  raw: string;
  type: string;
  timestamp: number;
}

export interface KnowledgeEntry {
  id: string;
  product_id: string;
  feature_id: string | null;
  source: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  relevance_score: number;
  is_pinned: boolean;
  pinned_at: string | null;
  created_at: string;
  // Joined from products table for cross-product display
  product_name?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
