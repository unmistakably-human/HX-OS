import { redirect } from "next/navigation";
import { getProject } from "@/lib/projects";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  let project;
  try {
    project = await getProject(projectId);
  } catch {
    redirect("/");
  }

  // Redirect to the active phase
  const activePhase =
    Object.entries(project.phases).find(([, v]) => v === "active")?.[0] ||
    "context";

  const phaseRoutes: Record<string, string> = {
    context: `/projects/${projectId}/context`,
    discovery: `/projects/${projectId}/discovery`,
    features: `/projects/${projectId}/features`,
    concepts: `/projects/${projectId}/concepts`,
  };

  redirect(phaseRoutes[activePhase] || `/projects/${projectId}/context`);
}
