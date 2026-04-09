"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PhaseHeader } from "@/components/phase-header";
import { DEMO_FEATURE } from "@/lib/demo-data";
import { Sparkles, ArrowRight } from "lucide-react";
import type { Feature } from "@/lib/types";

export default function FeatureBriefPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string; featureId: string }>();
  const projectId = params.projectId;
  const featureId = params.featureId;

  const [name, setName] = useState("");
  const [type, setType] = useState<"screen" | "flow">("screen");
  const [problem, setProblem] = useState("");
  const [mustHave, setMustHave] = useState("");
  const [notBe, setNotBe] = useState("");
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing feature data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) return;
        const project = await res.json();
        const feature = project.features?.[featureId];
        if (feature) {
          setName(feature.name || "");
          setType(feature.type || "screen");
          setProblem(feature.problem || "");
          setMustHave(feature.mustHave || "");
          setNotBe(feature.notBe || "");
          setContext(feature.context || "");
        }
      } catch {
        // ignore — fresh form
      }
      setLoaded(true);
    }
    load();
  }, [projectId, featureId]);

  function fillDemo() {
    setName(DEMO_FEATURE.name);
    setType(DEMO_FEATURE.type);
    setProblem(DEMO_FEATURE.problem);
    setMustHave(DEMO_FEATURE.mustHave);
    setNotBe(DEMO_FEATURE.notBe);
    setContext(DEMO_FEATURE.context);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !problem.trim() || !mustHave.trim()) return;

    setSaving(true);
    try {
      // Update feature on the project
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: {
            [featureId]: {
              id: featureId,
              name: name.trim(),
              type,
              problem: problem.trim(),
              mustHave: mustHave.trim(),
              notBe: notBe.trim(),
              context: context.trim(),
              chosenConcept: null,
              chatMessages: [],
            } satisfies Feature,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      router.push(`/projects/${projectId}/features/${featureId}/concepts`);
    } catch (err) {
      console.error("Save failed:", err);
      setSaving(false);
    }
  }

  const isValid = name.trim() && problem.trim() && mustHave.trim();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full text-[#9ca3af]">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PhaseHeader
        title="Feature Brief"
        subtitle="Define what you're designing"
        step={{ current: 3, total: 4 }}
      />

      <div className="flex-1 overflow-y-auto">
        <form
          onSubmit={handleSubmit}
          className="max-w-[720px] mx-auto w-full px-6 py-8 space-y-6"
        >
          {/* Feature name */}
          <div className="space-y-1.5">
            <Label htmlFor="feature-name" className="text-[13px] text-[#374151]">
              Feature name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="feature-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., "Product Detail Page"'
              className="text-[14px]"
            />
          </div>

          {/* Screen or Flow */}
          <div className="space-y-1.5">
            <Label className="text-[13px] text-[#374151]">
              Screen or Flow? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as "screen" | "flow")}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="screen" />
                <Label htmlFor="screen" className="text-[13px] text-[#4b5563] font-normal cursor-pointer">
                  Single Screen
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="flow" />
                <Label htmlFor="flow" className="text-[13px] text-[#4b5563] font-normal cursor-pointer">
                  Multi-screen Flow
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Problem */}
          <div className="space-y-1.5">
            <Label htmlFor="problem" className="text-[13px] text-[#374151]">
              What problem does this solve? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What user pain point or business goal?"
              rows={4}
              className="text-[14px]"
            />
          </div>

          {/* Must-haves */}
          <div className="space-y-1.5">
            <Label htmlFor="must-have" className="text-[13px] text-[#374151]">
              What must exist on this screen/flow? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="must-have"
              value={mustHave}
              onChange={(e) => setMustHave(e.target.value)}
              placeholder="Non-negotiable elements"
              rows={4}
              className="text-[14px]"
            />
          </div>

          {/* Not-be */}
          <div className="space-y-1.5">
            <Label htmlFor="not-be" className="text-[13px] text-[#374151]">
              What should this NOT be?
            </Label>
            <Textarea
              id="not-be"
              value={notBe}
              onChange={(e) => setNotBe(e.target.value)}
              placeholder="Constraints and anti-patterns"
              rows={3}
              className="text-[14px]"
            />
          </div>

          {/* Additional context */}
          <div className="space-y-1.5">
            <Label htmlFor="context" className="text-[13px] text-[#374151]">
              Additional context
            </Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any other context, references, or notes"
              rows={3}
              className="text-[14px]"
            />
          </div>

          {/* Bottom buttons */}
          <div className="flex items-center justify-between pt-4 pb-8">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fillDemo}
              className="text-[12px] text-[#9ca3af] hover:text-[#6b7280]"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Fill demo data
            </Button>

            <Button
              type="submit"
              disabled={!isValid || saving}
              className="bg-[#E8713A] hover:bg-[#d4632e] text-white px-6"
            >
              {saving ? "Saving..." : "Generate Concepts"}
              {!saving && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
