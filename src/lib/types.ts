export interface UserSegment {
  name: string;
  age: string;
  gender: string;
  loc: string;
  income: string;
  behaviour: string;
}

export interface ProductContext {
  productName: string;
  company: string;
  productType: string;
  stage: string;
  industries: string[];
  audience: string;
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
}

export interface FeatureSummary {
  id: string;
  name: string;
  feature_type: string | null;
  phase_brief: string;
  phase_discovery: string;
  phase_concepts: string;
  chosen_concept: string | null;
  updated_at: string;
}

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
  concepts: Concept[] | null;
  chosen_concept: string | null;
  chat_messages: ChatMessage[];
  phase_brief: "locked" | "active" | "complete";
  phase_discovery: "locked" | "active" | "complete";
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
