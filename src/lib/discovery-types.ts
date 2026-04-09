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
  screenshot: string;
}

export interface GlossaryPattern {
  name: string;
  example: string;
  why: string;
}

export interface Glossary {
  platforms: GlossaryPlatform[];
  patterns: GlossaryPattern[];
}

export interface DiscoveryDeck {
  title: string;
  subtitle: string;
  metrics: DeckMetric[];
  category_insights: CategoryInsight[];
  audience_insights: AudienceInsight[];
  ux_benchmarks: UxBenchmark[];
  conversion_retention: ConversionRetention;
  feature_benchmark: FeatureBenchmark;
  cross_category: CrossCategory[];
  opportunities: Opportunity[];
  glossary: Glossary;
}

/** Parse potentially malformed LLM JSON output into a DiscoveryDeck. */
export function fixJSON(raw: string): DiscoveryDeck {
  let s = (raw || "").trim().replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const si = s.indexOf("{");
  if (si > 0) s = s.slice(si);
  if (si < 0) throw new Error("No JSON object found in response");

  // Try direct parse first
  try {
    return JSON.parse(s);
  } catch {
    // Find balanced closing brace
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
    // Fix trailing commas and unbalanced brackets
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
