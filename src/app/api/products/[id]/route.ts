import { NextRequest } from "next/server";
import { getProduct, updateProduct } from "@/lib/projects";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    const product = await getProduct(id);
    return Response.json(product);
  } catch {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    const updates = await req.json();
    const product = await updateProduct(id, updates);
    return Response.json(product);
  } catch {
    return Response.json({ error: "Failed to update product" }, { status: 500 });
  }
}
