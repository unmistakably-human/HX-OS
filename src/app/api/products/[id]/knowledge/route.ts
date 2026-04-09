import { NextRequest } from "next/server";
import { getKnowledge, saveKnowledgeEntries } from "@/lib/knowledge";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const featureId = searchParams.get("featureId") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

  try {
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
