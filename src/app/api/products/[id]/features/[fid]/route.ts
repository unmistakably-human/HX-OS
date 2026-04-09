import { NextRequest } from "next/server";
import { getFeature, updateFeature } from "@/lib/projects";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; fid: string }> }
) {
  const { fid } = await ctx.params;
  try {
    const feature = await getFeature(fid);
    return Response.json(feature);
  } catch {
    return Response.json({ error: "Feature not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; fid: string }> }
) {
  const { fid } = await ctx.params;
  try {
    const updates = await req.json();
    const feature = await updateFeature(fid, updates);
    return Response.json(feature);
  } catch {
    return Response.json({ error: "Failed to update feature" }, { status: 500 });
  }
}
