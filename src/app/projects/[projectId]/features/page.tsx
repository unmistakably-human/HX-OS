"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, FileText } from "lucide-react";
import type { Project, Feature } from "@/lib/types";

export default function FeaturesIndexPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [project, setProject] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then(setProject)
      .catch(() => {});
  }, [projectId]);

  const features = project ? Object.values(project.features) : [];

  async function handleCreateFeature() {
    setCreating(true);
    try {
      // Create a new feature with a generated ID
      const featureId = `feat-${Date.now().toString(36)}`;
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: {
            [featureId]: {
              id: featureId,
              name: "",
              type: "screen",
              problem: "",
              mustHave: "",
              notBe: "",
              context: "",
              chosenConcept: null,
              chatMessages: [],
            } satisfies Feature,
          },
          phases: {
            ...project?.phases,
            features: "active",
            concepts: "locked",
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to create feature");
      router.push(`/projects/${projectId}/features/${featureId}`);
    } catch {
      setCreating(false);
    }
  }

  // If only one feature exists, redirect straight to it
  useEffect(() => {
    if (features.length === 1) {
      const f = features[0];
      // If the feature has a chosen concept, go to concepts page
      if (f.chosenConcept) {
        router.replace(`/projects/${projectId}/features/${f.id}/concepts`);
      } else {
        router.replace(`/projects/${projectId}/features/${f.id}`);
      }
    }
  }, [features, projectId, router]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-[#9ca3af]">
        Loading...
      </div>
    );
  }

  // If auto-redirecting (single feature), show loading
  if (features.length === 1) {
    return (
      <div className="flex items-center justify-center h-full text-[#9ca3af]">
        Loading feature...
      </div>
    );
  }

  return (
    <>
      <PhaseHeader
        title="Feature Briefs"
        subtitle="Define the screens and flows to design"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[700px] mx-auto">
          {features.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#f4f4f5] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-[#9ca3af]" />
              </div>
              <h2 className="text-[18px] font-bold text-[#111827] mb-2">
                No features yet
              </h2>
              <p className="text-[14px] text-[#6b7280] mb-6 max-w-sm mx-auto">
                Create a feature brief to define what screen or flow you want to
                design. HXOS will generate concept variations for it.
              </p>
              <Button
                onClick={handleCreateFeature}
                disabled={creating}
                className="bg-[#E8713A] hover:bg-[#d4652f] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {creating ? "Creating..." : "Create Feature Brief"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {features.map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    router.push(
                      f.chosenConcept
                        ? `/projects/${projectId}/features/${f.id}/concepts`
                        : `/projects/${projectId}/features/${f.id}`
                    )
                  }
                  className="w-full flex items-center justify-between p-4 bg-white border border-[#e5e7eb] rounded-xl hover:border-[#d1d5db] transition-colors text-left"
                >
                  <div>
                    <div className="text-[14px] font-semibold text-[#111827]">
                      {f.name || "Untitled feature"}
                    </div>
                    <div className="text-[12px] text-[#9ca3af] mt-0.5">
                      {f.type === "screen" ? "Screen" : "Flow"} —{" "}
                      {f.chosenConcept ? "Concept chosen" : "Brief in progress"}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9ca3af]" />
                </button>
              ))}
              <Button
                onClick={handleCreateFeature}
                disabled={creating}
                variant="outline"
                className="w-full mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                {creating ? "Creating..." : "Add another feature"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
