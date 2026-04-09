import { supabase } from "./supabase";
import { callClaude } from "./claude";
import type { KnowledgeEntry, Insight, DesignConcept, Baseline, BeyondScreen } from "./types";

// ═══ CRUD ═══

export async function saveKnowledgeEntries(
  entries: {
    product_id: string;
    feature_id: string | null;
    source: string;
    category: string;
    title: string;
    content: string;
    tags: string[];
    relevance_score: number;
  }[]
): Promise<void> {
  if (entries.length === 0) return;
  // Add defaults for pin fields
  const withDefaults = entries.map((e) => ({ ...e, is_pinned: false, pinned_at: null }));
  const { error } = await supabase.from("knowledge").insert(withDefaults);
  if (error) console.error("Failed to save knowledge entries:", error);
}

export async function getKnowledge(
  productId: string,
  opts?: { category?: string; featureId?: string; limit?: number }
): Promise<KnowledgeEntry[]> {
  let query = supabase
    .from("knowledge")
    .select("*")
    .eq("product_id", productId)
    .order("relevance_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts?.category) query = query.eq("category", opts.category);
  if (opts?.featureId) query = query.eq("feature_id", opts.featureId);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getKnowledgeForContext(
  productId: string,
  options: {
    query?: string;
    categories?: string[];
    limit?: number;
  } = {}
): Promise<string> {
  const { query, categories, limit = 15 } = options;

  let data: { category: string; title: string; content: string }[] | null = null;

  // If a query is provided, use full-text search
  if (query) {
    const { data: searchResults, error } = await supabase.rpc("search_knowledge", {
      search_query: query,
      match_product_id: productId,
      match_count: limit,
    });

    if (!error && searchResults?.length) {
      data = searchResults;
    }
  }

  // Fallback: category-based retrieval (Phase 1 behaviour)
  if (!data || data.length === 0) {
    let q = supabase
      .from("knowledge")
      .select("category, title, content")
      .eq("product_id", productId)
      .order("relevance_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (categories?.length) q = q.in("category", categories);

    const { data: catData, error } = await q;
    if (error || !catData?.length) return "";
    data = catData;
  }

  // Group by category for clean formatting
  const grouped: Record<string, { title: string; content: string }[]> = {};
  for (const entry of data) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push({ title: entry.title, content: entry.content });
  }

  const sections: string[] = [];
  for (const [cat, entries] of Object.entries(grouped)) {
    const label = cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const items = entries.map((e) => `- **${e.title}**: ${e.content}`).join("\n");
    sections.push(`### ${label}\n${items}`);
  }

  return sections.join("\n\n");
}

// ═══ PIN/STAR ═══

export async function togglePin(knowledgeId: string): Promise<boolean> {
  // Get current state
  const { data: entry } = await supabase
    .from("knowledge")
    .select("is_pinned")
    .eq("id", knowledgeId)
    .single();

  const newPinned = !entry?.is_pinned;
  const { error } = await supabase
    .from("knowledge")
    .update({
      is_pinned: newPinned,
      pinned_at: newPinned ? new Date().toISOString() : null,
    })
    .eq("id", knowledgeId);

  if (error) throw error;
  return newPinned;
}

export async function getPinnedKnowledge(productId: string): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabase
    .from("knowledge")
    .select("*")
    .eq("product_id", productId)
    .eq("is_pinned", true)
    .order("pinned_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ═══ CROSS-PRODUCT SEARCH ═══

export async function searchCrossProduct(
  query: string,
  excludeProductId?: string,
  limit: number = 10
): Promise<(KnowledgeEntry & { product_name?: string })[]> {
  const { data, error } = await supabase.rpc("search_knowledge_global", {
    search_query: query,
    exclude_product_id: excludeProductId || null,
    match_count: limit,
  });

  if (error || !data?.length) return [];

  // Fetch product names for the results
  const productIds = [...new Set(data.map((d: { product_id: string }) => d.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .in("id", productIds);

  const nameMap: Record<string, string> = {};
  for (const p of products || []) {
    nameMap[p.id] = p.name;
  }

  return data.map((entry: KnowledgeEntry) => ({
    ...entry,
    product_name: nameMap[entry.product_id] || "Unknown",
  }));
}

export async function getRelatedFromOtherProducts(
  productId: string,
  query: string,
  limit: number = 8
): Promise<(KnowledgeEntry & { product_name?: string })[]> {
  return searchCrossProduct(query, productId, limit);
}

// ═══ EXTRACTION: Enriched PCD ═══

const PCD_EXTRACT_SYSTEM = `Extract 12-15 key knowledge entries from this enriched product context document. Return ONLY valid JSON array.

Each entry: {"category":"persona|market|architecture|visual|principle","title":"Short title (5-8 words)","content":"One sentence of the key insight or fact.","tags":["tag1","tag2"]}

Categories:
- persona: User segments, goals, frustrations, behaviours
- market: Market position, competitors, business model
- architecture: Screens, flows, IA, core objects
- visual: Design direction, palette, typography, tone
- principle: Design principles, constraints, platform rules

Be specific. Name real products, numbers, behaviours. Skip generic statements.`;

export async function extractFromPCD(productId: string, pcdText: string): Promise<void> {
  try {
    const response = await callClaude({
      system: PCD_EXTRACT_SYSTEM,
      messages: [{ role: "user", content: pcdText.slice(0, 6000) }],
      maxTokens: 3000,
    });

    let entries: { category: string; title: string; content: string; tags: string[] }[];
    try {
      const trimmed = response.trim();
      const jsonStr = trimmed.startsWith("[")
        ? trimmed
        : trimmed.match(/\[[\s\S]*\]/)?.[0] || trimmed;
      entries = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse PCD extraction response");
      return;
    }

    if (!Array.isArray(entries)) return;

    // Clear old PCD entries for this product
    await supabase
      .from("knowledge")
      .delete()
      .eq("product_id", productId)
      .eq("source", "enriched_pcd");

    await saveKnowledgeEntries(
      entries.map((e) => ({
        product_id: productId,
        feature_id: null,
        source: "enriched_pcd",
        category: e.category,
        title: e.title,
        content: e.content,
        tags: e.tags || [],
        relevance_score: 1.0,
      }))
    );
  } catch (err) {
    console.error("PCD knowledge extraction failed:", err);
  }
}

// ═══ EXTRACTION: Discovery Deck ═══

export async function extractFromDiscovery(productId: string, deck: Record<string, unknown>): Promise<void> {
  try {
    // Clear old discovery entries
    await supabase
      .from("knowledge")
      .delete()
      .eq("product_id", productId)
      .eq("source", "discovery");

    const entries: Parameters<typeof saveKnowledgeEntries>[0] = [];
    const base = { product_id: productId, feature_id: null, source: "discovery" as const, relevance_score: 1.0 };

    // Category insights → domain
    const catInsights = deck.category_insights as { headline?: string; evidence?: string; implication?: string }[] | undefined;
    if (Array.isArray(catInsights)) {
      for (const ci of catInsights) {
        if (ci.headline) {
          entries.push({
            ...base,
            category: "domain",
            title: ci.headline,
            content: ci.evidence || ci.implication || "",
            tags: ["category_insight"],
          });
        }
      }
    }

    // Audience insights → user_behaviour
    const audInsights = deck.audience_insights as { segment?: string; headline?: string; gap?: string }[] | undefined;
    if (Array.isArray(audInsights)) {
      for (const ai of audInsights) {
        if (ai.headline) {
          entries.push({
            ...base,
            category: "user_behaviour",
            title: ai.headline,
            content: ai.gap || "",
            tags: [ai.segment || "audience"].map((s) => s.toLowerCase()),
          });
        }
      }
    }

    // UX benchmarks → competitor
    const uxBench = deck.ux_benchmarks as { attribute?: string; gap?: string; dominant?: { description?: string } }[] | undefined;
    if (Array.isArray(uxBench)) {
      for (const ub of uxBench) {
        if (ub.attribute) {
          entries.push({
            ...base,
            category: "competitor",
            title: ub.attribute,
            content: ub.gap || ub.dominant?.description || "",
            tags: ["ux_benchmark"],
          });
        }
      }
    }

    // Opportunities → opportunity
    const opps = deck.opportunities as { title?: string; description?: string; tags?: string[] }[] | undefined;
    if (Array.isArray(opps)) {
      for (const op of opps) {
        if (op.title) {
          entries.push({
            ...base,
            category: "opportunity",
            title: op.title,
            content: op.description || "",
            tags: op.tags || ["opportunity"],
          });
        }
      }
    }

    // Cross-category → pattern
    const crossCat = deck.cross_category as { platform?: string; pattern?: string; transferable?: string }[] | undefined;
    if (Array.isArray(crossCat)) {
      for (const cc of crossCat) {
        if (cc.pattern) {
          entries.push({
            ...base,
            category: "pattern",
            title: `${cc.platform || "Cross-category"}: ${cc.pattern}`,
            content: cc.transferable || "",
            tags: ["cross_category"],
          });
        }
      }
    }

    await saveKnowledgeEntries(entries);
  } catch (err) {
    console.error("Discovery knowledge extraction failed:", err);
  }
}

// ═══ EXTRACTION: Feature Insights ═══

export async function extractFromInsights(
  productId: string,
  featureId: string,
  insights: Insight[]
): Promise<void> {
  try {
    // Clear old insight entries for this feature
    await supabase
      .from("knowledge")
      .delete()
      .eq("feature_id", featureId)
      .eq("source", "feature_insights");

    const categoryMap: Record<string, string> = {
      user: "user_behaviour",
      domain: "domain",
      competitor: "competitor",
    };

    await saveKnowledgeEntries(
      insights.map((i) => ({
        product_id: productId,
        feature_id: featureId,
        source: "feature_insights",
        category: categoryMap[i.category] || i.category,
        title: i.headline,
        content: i.body,
        tags: [i.tag.toLowerCase()],
        relevance_score: 1.0,
      }))
    );
  } catch (err) {
    console.error("Insights knowledge extraction failed:", err);
  }
}

// ═══ EXTRACTION: Design Concepts ═══

export async function extractFromConcepts(
  productId: string,
  featureId: string,
  concepts: DesignConcept[],
  baseline: Baseline | null,
  beyond: BeyondScreen[] | null
): Promise<void> {
  try {
    // Clear old concept entries for this feature
    await supabase
      .from("knowledge")
      .delete()
      .eq("feature_id", featureId)
      .eq("source", "design_concepts");

    const entries: Parameters<typeof saveKnowledgeEntries>[0] = [];
    const base = { product_id: productId, feature_id: featureId, source: "design_concepts" as const };

    // Concept tradeoffs → principle
    for (const c of concepts) {
      for (const tradeoff of c.tradeoffs || []) {
        entries.push({
          ...base,
          category: "principle",
          title: `${c.name} tradeoff`,
          content: tradeoff,
          tags: ["tradeoff", c.name.toLowerCase()],
          relevance_score: 0.8,
        });
      }
    }

    // Baseline must-haves → pattern
    if (baseline?.mustHaves) {
      for (const mh of baseline.mustHaves) {
        entries.push({
          ...base,
          category: "pattern",
          title: mh.length > 60 ? mh.slice(0, 57) + "..." : mh,
          content: mh,
          tags: ["baseline", "must_have"],
          relevance_score: 1.0,
        });
      }
    }

    // Beyond-screen → opportunity
    if (beyond) {
      for (const b of beyond) {
        entries.push({
          ...base,
          category: "opportunity",
          title: b.touchpoint,
          content: b.why,
          tags: ["beyond_screen"],
          relevance_score: 0.9,
        });
      }
    }

    await saveKnowledgeEntries(entries);
  } catch (err) {
    console.error("Concepts knowledge extraction failed:", err);
  }
}
