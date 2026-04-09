import { getProject, updateProject } from "@/lib/projects";
import { Sidebar } from "@/components/sidebar";
import fs from "fs/promises";
import path from "path";

async function ensureDemoProject(projectId: string) {
  const dir = path.join(process.cwd(), "data", "projects", projectId);
  const file = path.join(dir, "project.json");
  try {
    await fs.access(file);
  } catch {
    // Create the demo project on first access
    await fs.mkdir(dir, { recursive: true });
    const demo = {
      id: projectId,
      name: "New Project",
      createdAt: new Date().toISOString(),
      productContext: null,
      enrichedPcd: null,
      discoveryInsights: null,
      features: {},
      phases: {
        context: "active",
        discovery: "locked",
        features: "locked",
        concepts: "locked",
      },
    };
    await fs.writeFile(file, JSON.stringify(demo, null, 2));
  }
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // Auto-create project if it doesn't exist (supports fresh QA runs)
  await ensureDemoProject(projectId);

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
