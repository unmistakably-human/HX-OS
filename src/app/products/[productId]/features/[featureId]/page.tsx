"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PhaseHeader } from "@/components/phase-header";
import { Sparkles, ArrowRight, Loader2, Upload, FileText, X } from "lucide-react";
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
  const [autofilling, setAutofilling] = useState(false);
  const [brdFile, setBrdFile] = useState<File | null>(null);
  const [parsingBrd, setParsingBrd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleAutofill() {
    setAutofilling(true);
    try {
      const res = await fetch(
        `/api/products/${productId}/features/${featureId}/autofill-brief`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error ${res.status}`);
      }
      const generated = await res.json();
      if (generated.problem) setProblem(generated.problem);
      if (generated.mustHave) setMustHave(generated.mustHave);
      if (generated.notBe) setNotBe(generated.notBe);
      if (generated.context) setContext(generated.context);
    } catch (err) {
      console.error("Autofill failed:", err);
    }
    setAutofilling(false);
  }

  async function handleBrdUpload(file: File) {
    setBrdFile(file);
    setParsingBrd(true);
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      const res = await fetch("/api/parse-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const parsed = await res.json();
        if (parsed.explain && !problem) setProblem(parsed.explain);
        if (parsed.valueProp && !mustHave) setMustHave(parsed.valueProp);
        if (parsed.notThis && !notBe) setNotBe(parsed.notThis);
        if (parsed.clientBrief && !context) setContext(parsed.clientBrief);
      }
    } catch {
      // ignore
    }
    setParsingBrd(false);
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
              <>Get Insights <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} /></>
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
          {/* BRD Upload — either/or with manual fields */}
          <div>
            <Label className="text-[13px] font-medium text-content-label">Upload BRD (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.md,.txt,.docx,.doc"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBrdUpload(file);
                e.target.value = "";
              }}
            />
            {brdFile ? (
              <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-[#eff6ff] border border-[#93c5fd] rounded-lg">
                <FileText className="w-4 h-4 text-[#1d4ed8] shrink-0" strokeWidth={1.5} />
                <span className="text-[13px] text-[#1d4ed8] truncate flex-1">{brdFile.name}</span>
                {parsingBrd && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1d4ed8]" strokeWidth={1.5} />}
                <button onClick={() => setBrdFile(null)} className="text-[#6b7280] hover:text-[#111827]">
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-divider rounded-lg text-content-muted hover:border-content-muted hover:text-content-secondary transition-colors text-[13px]"
              >
                <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                Upload BRD (PDF, MD, DOCX)
              </button>
            )}
            <p className="text-[11px] text-content-muted mt-1">AI will extract fields from the document.</p>
          </div>

          <div className="flex items-center gap-3 text-content-muted">
            <div className="flex-1 h-px bg-divider" />
            <span className="text-xs">or fill in manually</span>
            <div className="flex-1 h-px bg-divider" />
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
              onClick={handleAutofill}
              disabled={autofilling}
              className="text-xs text-content-muted hover:text-content-secondary transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {autofilling ? (
                <><Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />Generating brief...</>
              ) : (
                <><Sparkles className="w-3 h-3" strokeWidth={1.5} />Autofill</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
