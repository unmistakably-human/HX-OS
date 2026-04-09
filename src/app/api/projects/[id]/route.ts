import { NextRequest } from "next/server";
import { getProject, updateProject } from "@/lib/projects";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">
) {
  const { id } = await ctx.params;
  try {
    const project = await getProject(id);
    return Response.json(project);
  } catch {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">
) {
  const { id } = await ctx.params;
  try {
    const updates = await req.json();
    // Merge features deeply — don't overwrite existing features
    const existing = await getProject(id);
    if (updates.features) {
      updates.features = { ...existing.features, ...updates.features };
    }
    const project = await updateProject(id, updates);
    return Response.json(project);
  } catch {
    return Response.json({ error: "Failed to update project" }, { status: 500 });
  }
}
