import { getProject } from "@/lib/projects";
import { Sidebar } from "@/components/sidebar";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  let project;
  try {
    project = await getProject(projectId);
  } catch {
    return (
      <div className="flex items-center justify-center h-screen text-[#9ca3af]">
        Project not found
      </div>
    );
  }

  // Determine current phase from the active one
  const currentPhase =
    Object.entries(project.phases).find(([, v]) => v === "active")?.[0] ||
    "context";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentPhase={currentPhase}
        phases={project.phases}
        projectId={projectId}
      />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
