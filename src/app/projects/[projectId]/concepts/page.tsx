"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Project } from "@/lib/types";

export default function ConceptsIndexPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((project: Project) => {
        const features = Object.values(project.features);
        if (features.length > 0) {
          // Redirect to the first feature's concepts page
          router.replace(
            `/projects/${projectId}/features/${features[0].id}/concepts`
          );
        } else {
          // No features yet — send to features page to create one
          router.replace(`/projects/${projectId}/features`);
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [projectId, router]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-full text-[#9ca3af]">
        Loading Concepts...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-[#9ca3af]">
      Redirecting...
    </div>
  );
}
