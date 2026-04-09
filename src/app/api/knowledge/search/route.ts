import { NextRequest } from "next/server";
import { searchCrossProduct } from "@/lib/knowledge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const excludeProduct = searchParams.get("excludeProduct") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;

  if (!q) {
    return Response.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const results = await searchCrossProduct(q, excludeProduct, limit);
    return Response.json(results);
  } catch {
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
