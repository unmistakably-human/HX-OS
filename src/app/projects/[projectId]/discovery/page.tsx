import { getProject } from "@/lib/projects";
import { DiscoveryClient } from "@/components/discovery/discovery-client";

export default async function DiscoveryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  return <DiscoveryClient project={project} />;
}
