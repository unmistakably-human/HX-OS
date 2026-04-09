import { NextRequest } from "next/server";
import { getKnowledge, saveKnowledgeEntries, getKnowledgeForContext } from "@/lib/knowledge";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const featureId = searchParams.get("featureId") || undefined;
  const search = searchParams.get("search") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

  try {
    // If search query provided, use full-text search
    if (search) {
      const { data, error } = await supabase.rpc("search_knowledge", {
        search_query: search,
        match_product_id: id,
        match_count: limit || 50,
      });
      if (error) throw error;
      return Response.json(data || []);
    }

    const entries = await getKnowledge(id, { category, featureId, limit });
    return Response.json(entries);
  } catch {
    return Response.json({ error: "Failed to load knowledge" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  try {
    const { title, content, category, tags } = await req.json();
    if (!title || !content || !category) {
      return Response.json({ error: "title, content, and category are required" }, { status: 400 });
    }

    await saveKnowledgeEntries([{
      product_id: id,
      feature_id: null,
      source: "user_added",
      category,
      title,
      content,
      tags: tags || [],
      relevance_score: 1.0,
    }]);

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to save knowledge" }, { status: 500 });
  }
}
