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
import { Sparkles, Search, Loader2 } from "lucide-react";
import type { Feature } from "@/lib/types";

export default function FeatureBriefPage() {
  const router = useRouter();
  const params = useParams<{ productId: string; featureId: string }>();
  const productId = params.productId;
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
        const res = await fetch(`/api/products/${productId}/features/${featureId}`);
        if (!res.ok) return;
        const feature: Feature = await res.json();
        if (feature) {
          setName(feature.name || "");
          setType(feature.feature_type || "screen");
          setProblem(feature.problem || "");
          setMustHave(feature.must_have || "");
          setNotBe(feature.not_be || "");
          setContext(feature.additional_context || "");
        }
      } catch {
        // ignore
      }
      setLoaded(true);
    }
    load();
  }, [productId, featureId]);

  async function handleSubmit() {
    if (!name || !problem || !mustHave) return;
    setSaving(true);
    try {
      // Save the brief
      await fetch(`/api/products/${productId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          feature_type: type,
          problem,
          must_have: mustHave,
          not_be: notBe,
          additional_context: context,
          phase_brief: "complete",
          phase_discovery: "active",
        }),
      });

      // Trigger insight generation immediately
      await fetch(`/api/products/${productId}/features/${featureId}/insights`, {
        method: "POST",
      });

      // Navigate to discovery page where insights are now ready
      router.push(`/products/${productId}/features/${featureId}/discovery`);
    } catch {
      setSaving(false);
    }
  }

  function fillDemo() {
    setName(DEMO_FEATURE.name);
    setType(DEMO_FEATURE.type as "screen" | "flow");
    setProblem(DEMO_FEATURE.problem);
    setMustHave(DEMO_FEATURE.mustHave);
    setNotBe(DEMO_FEATURE.notBe);
    setContext(DEMO_FEATURE.context);
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full text-content-muted">
        Loading...
      </div>
    );
  }

  if (saving) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#3b82f6] animate-spin" strokeWidth={1.5} />
          <h2 className="text-[18px] font-bold text-[#111827]">
            Researching Insights...
          </h2>
        </div>
        <p className="text-[13px] text-[#9ca3af] text-center max-w-md">
          Saving your brief and generating insights across User Behaviour, Domain, and Competitor categories. This takes 15-30 seconds.
        </p>
        <div className="w-64 h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
          <div className="h-full bg-[#3b82f6] rounded-full animate-pulse" style={{ width: "60%", animation: "progress 2s ease-in-out infinite" }} />
        </div>
        <style>{`
          @keyframes progress {
            0% { width: 10%; }
            50% { width: 80%; }
            100% { width: 10%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <PhaseHeader
        title="Feature Brief"
        subtitle="Define what screen or flow to design"
        actions={
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name || !problem || !mustHave || saving}
            className="text-xs h-8"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" strokeWidth={1.5} />Researching...</>
            ) : (
              <><Search className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />Research Insights</>
            )}
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[600px] mx-auto space-y-5">
          <div>
            <Label className="text-[13px] font-medium text-content-label">Feature name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Product Detail Page" className="mt-1" />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-content-label mb-2 block">Type</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "screen" | "flow")}>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="screen" id="screen" />
                  <Label htmlFor="screen">Screen</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="flow" id="flow" />
                  <Label htmlFor="flow">Flow</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label className="text-[13px] font-medium text-content-label">Problem statement *</Label>
            <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={4} placeholder="What problem does this feature solve?" className="mt-1" />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-content-label">Must-have elements *</Label>
            <Textarea value={mustHave} onChange={(e) => setMustHave(e.target.value)} rows={4} placeholder="What elements must appear?" className="mt-1" />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-content-label">Should NOT be</Label>
            <Textarea value={notBe} onChange={(e) => setNotBe(e.target.value)} rows={3} placeholder="What should this feature avoid?" className="mt-1" />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-content-label">Additional context</Label>
            <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} placeholder="Any other relevant context..." className="mt-1" />
          </div>
          <div className="pt-3">
            <button
              onClick={fillDemo}
              className="text-xs text-content-muted hover:text-content-secondary transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" strokeWidth={1.5} />
              Fill demo data
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
