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

export interface Feature {
  id: string;
  name: string;
  type: "screen" | "flow";
  problem: string;
  mustHave: string;
  notBe: string;
  context: string;
  chosenConcept: string | null;
  chatMessages: ChatMessage[];
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

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  productContext: ProductContext | null;
  enrichedPcd: string | null;
  discoveryInsights: string | null;
  features: Record<string, Feature>;
  phases: {
    context: "locked" | "active" | "complete";
    discovery: "locked" | "active" | "complete";
    features: "locked" | "active" | "complete";
    concepts: "locked" | "active" | "complete";
  };
}
