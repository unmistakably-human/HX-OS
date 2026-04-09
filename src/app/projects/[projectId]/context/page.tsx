"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStream } from "@/hooks/use-stream";
import { DEMO_CONTEXT } from "@/lib/demo-data";
import type { ProductContext, UserSegment } from "@/lib/types";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

const STEP_LABELS = ["Overview", "Product", "User Segments", "Structure", "Visual"] as const;

const PRODUCT_TYPES = [
  { value: "b2b", title: "B2B SaaS", desc: "Businesses pay for it, their employees use it" },
  { value: "consumer", title: "Consumer app", desc: "Individuals download or sign up for themselves" },
  { value: "internal", title: "Internal tool", desc: "Built for your own company's team" },
  { value: "marketplace", title: "Marketplace", desc: "Connects two groups — buyers & sellers, hosts & guests" },
  { value: "ecommerce", title: "E-commerce", desc: "Sells products or services directly to customers" },
  { value: "api", title: "API / Developer platform", desc: "Developers build on top of it or integrate it" },
  { value: "other", title: "Other", desc: "" },
];

const STAGES = [
  { value: "idea", title: "Idea", desc: "Nothing built yet, no public presence" },
  { value: "prelaunch", title: "Pre-launch", desc: "Being built but not yet available to users" },
  { value: "early", title: "Early (0→1)", desc: "Launched within the last 6 months, small user base" },
  { value: "growth", title: "Growth", desc: "Live product with active users, actively iterating" },
  { value: "mature", title: "Mature", desc: "Established product — redesign or new feature work" },
];

const INDUSTRIES = [
  "Advertising & Marketing", "Finance, Banking & Insurance", "E-commerce & Retail",
  "Healthcare & Wellness", "Education & Learning", "Food & Delivery",
  "Enterprise Software & Productivity", "Media & Entertainment", "Travel & Hospitality",
  "Real Estate & Property", "AI & Machine Learning", "Logistics & Supply Chain", "Other",
];

const AUDIENCES = [
  { value: "tier1", title: "Tier 1 cities", desc: "Metro cities — Mumbai, Delhi, Bangalore, etc." },
  { value: "tier2", title: "Tier 2 cities", desc: "Emerging cities — Jaipur, Lucknow, Kochi, etc." },
  { value: "northIndia", title: "Only North India", desc: "" },
  { value: "allIndia", title: "All India", desc: "" },
  { value: "global", title: "Global", desc: "No single dominant market" },
  { value: "other", title: "Other country / region", desc: "" },
];

const PLATFORMS = [
  { value: "desktop", title: "Desktop web only", desc: "Min 1280px, mouse & keyboard" },
  { value: "mobile", title: "Mobile web only", desc: "Touch-first, portrait orientation" },
  { value: "responsive", title: "Desktop + mobile responsive", desc: "Adapts to all screen sizes" },
  { value: "ios", title: "iOS app", desc: "" },
  { value: "android", title: "Android app", desc: "" },
  { value: "iosAndroid", title: "iOS + Android", desc: "" },
  { value: "desktopApp", title: "Desktop app", desc: "Electron, Tauri, or native" },
];

const DS_OPTIONS = [
  { value: "upload", title: "Yes — I'll upload it alongside", desc: "JSON tokens, style guide.md, or PDF" },
  { value: "describe", title: "No — I'll describe the visual identity below", desc: "" },
  { value: "propose", title: "No — HXOS can propose a visual direction", desc: "HXOS will research your industry and competitors to suggest one" },
];

function emptySegment(): UserSegment {
  return { name: "", age: "", gender: "", loc: "", income: "", behaviour: "" };
}

function emptyContext(): ProductContext {
  return {
    productName: "", company: "", productType: "", stage: "", industries: [],
    audience: "", platform: "", explain: "", briefWhy: "", valueProp: "",
    notThis: "", clientBrief: "",
    seg1: emptySegment(), seg2: emptySegment(),
    behInsights: "", competitors: "", flows: "", ia: "", figmaLink: "",
    upcoming: "", dsChoice: "", vibe: "", colors: "", fonts: "",
  };
}

// ─── Radio card ────────────────────────────────────────
function RadioCard({
  selected, onSelect, title, desc,
}: {
  selected: boolean; onSelect: () => void; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-start gap-3 text-left border rounded-lg px-3 py-[9px] transition-colors ${
        selected ? "border-[#3b82f6] bg-[#eff6ff]" : "border-[#e5e7eb] bg-white hover:border-[#d1d5db]"
      }`}
    >
      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        selected ? "border-[#3b82f6]" : "border-[#d1d5db]"
      }`}>
        {selected && <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-[#111827]">{title}</div>
        {desc && <div className="text-[12px] text-[#9ca3af] mt-0.5">{desc}</div>}
      </div>
    </button>
  );
}

// ─── Checkbox card ─────────────────────────────────────
function CheckCard({
  checked, onToggle, label,
}: {
  checked: boolean; onToggle: () => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 text-left border rounded-lg px-3 py-[9px] transition-colors ${
        checked ? "border-[#3b82f6] bg-[#eff6ff]" : "border-[#e5e7eb] bg-white hover:border-[#d1d5db]"
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className="pointer-events-none" />
      <span className="text-[14px] text-[#111827]">{label}</span>
    </button>
  );
}

// ─── Blue callout ──────────────────────────────────────
function WhyCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#eff6ff] border-l-2 border-[#93c5fd] rounded-md px-3.5 py-2.5 mb-4">
      <p className="text-[12px] text-[#1d4ed8]">
        <span className="font-bold">Why this matters: </span>
        {children}
      </p>
    </div>
  );
}

// ─── Segment card ──────────────────────────────────────
function SegmentCard({
  label, seg, onChange, required,
}: {
  label: string; seg: UserSegment; onChange: (s: UserSegment) => void; required?: boolean;
}) {
  const set = (key: keyof UserSegment, val: string) => onChange({ ...seg, [key]: val });
  return (
    <div className="border border-[#e5e7eb] rounded-xl p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[14px] font-semibold text-[#111827]">{label}</h3>
        {required && (
          <span className="text-[10px] font-bold text-[#3b82f6] bg-[#eff6ff] px-1.5 py-0.5 rounded">REQUIRED</span>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-[12px] text-[#6b7280]">Segment name</Label>
          <Input
            value={seg.name} onChange={(e) => set("name", e.target.value)}
            placeholder="e.g., Working mothers, 28-40" className="mt-1"
          />
        </div>
        <div>
          <Label className="text-[12px] text-[#6b7280]">Demographics</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Input value={seg.age} onChange={(e) => set("age", e.target.value)} placeholder="Age range" />
            <Input value={seg.gender} onChange={(e) => set("gender", e.target.value)} placeholder="Gender" />
            <Input value={seg.loc} onChange={(e) => set("loc", e.target.value)} placeholder="Location" />
            <Input value={seg.income} onChange={(e) => set("income", e.target.value)} placeholder="Income bracket" />
          </div>
        </div>
        <div>
          <Label className="text-[12px] text-[#6b7280]">Behaviour</Label>
          <Textarea
            value={seg.behaviour} onChange={(e) => set("behaviour", e.target.value)}
            rows={3} className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Field label ───────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-[13px] font-medium text-[#374151] mb-1.5 block">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </Label>
  );
}

// ─── Section header ────────────────────────────────────
function SectionHeader({ title, optional }: { title: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
      {optional && (
        <span className="text-[10px] font-medium text-[#9ca3af] bg-[#f4f4f5] px-1.5 py-0.5 rounded">OPTIONAL</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════
export default function ContextPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [step, setStep] = useState(0);
  const [ctx, setCtx] = useState<ProductContext>(emptyContext);
  const [generating, setGenerating] = useState(false);
  const stream = useStream();

  // Load existing context from API
  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p) => {
        if (p.productContext) setCtx(p.productContext);
      })
      .catch(() => {});
  }, [projectId]);

  // Auto-navigate after enrichment completes
  useEffect(() => {
    if (stream.done && !stream.error) {
      router.push(`/projects/${projectId}/discovery`);
    }
  }, [stream.done, stream.error, projectId, router]);

  const set = useCallback(<K extends keyof ProductContext>(key: K, val: ProductContext[K]) => {
    setCtx((prev) => ({ ...prev, [key]: val }));
  }, []);

  const setSeg = useCallback((which: "seg1" | "seg2", seg: UserSegment) => {
    setCtx((prev) => ({ ...prev, [which]: seg }));
  }, []);

  const toggleIndustry = useCallback((ind: string) => {
    setCtx((prev) => ({
      ...prev,
      industries: prev.industries.includes(ind)
        ? prev.industries.filter((i) => i !== ind)
        : [...prev.industries, ind],
    }));
  }, []);

  const fillDemo = useCallback(() => {
    setCtx(DEMO_CONTEXT);
  }, []);

  // Save context and trigger enrichment
  const generatePcd = useCallback(async () => {
    setGenerating(true);
    // Save context first
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productContext: ctx }),
    });
    // Stream enrichment
    stream.run(`/api/projects/${projectId}/enrich`);
  }, [projectId, ctx, stream]);

  // Step validation
  const isStepValid = useCallback((s: number): boolean => {
    switch (s) {
      case 0:
        return !!(ctx.productName && ctx.company && ctx.productType && ctx.stage && ctx.industries.length && ctx.audience && ctx.platform);
      case 1:
        return !!(ctx.explain && ctx.briefWhy && ctx.valueProp && ctx.notThis);
      case 2:
        return !!(ctx.seg1.name && ctx.seg2.name && ctx.behInsights);
      case 3:
        return !!ctx.flows;
      case 4:
        return true; // all optional
      default:
        return false;
    }
  }, [ctx]);

  // ─── Loading / generating state ───────────────────
  if (generating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#3b82f6] animate-spin" />
          <h2 className="text-[18px] font-bold text-[#111827]">
            Generating your Product Context Document...
          </h2>
        </div>
        <p className="text-[13px] text-[#9ca3af]">
          Researching your product, competitors, and market with web search
        </p>
        {stream.text && (
          <div className="w-full max-w-2xl mt-4 max-h-64 overflow-y-auto rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4">
            <pre className="text-[12px] text-[#6b7280] whitespace-pre-wrap font-mono leading-relaxed opacity-60">
              {stream.text.slice(-2000)}
            </pre>
          </div>
        )}
        {stream.error && (
          <div className="text-[13px] text-red-500 mt-2">
            Error: {stream.error}
            <Button variant="outline" size="sm" className="ml-3" onClick={() => { setGenerating(false); stream.reset(); }}>
              Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── Render step content ──────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── STEP 1: Overview ──
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <FieldLabel required>Product name</FieldLabel>
              <Input value={ctx.productName} onChange={(e) => set("productName", e.target.value)} placeholder="e.g., Agentic Juice, Zepto, SBI Life Portal" />
            </div>
            <div>
              <FieldLabel required>Company / Organization</FieldLabel>
              <Input value={ctx.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g., Perfora Oral Care, Amazon India" />
            </div>
            <div>
              <FieldLabel required>What type of product?</FieldLabel>
              <div className="space-y-2 mt-1">
                {PRODUCT_TYPES.map((t) => (
                  <RadioCard key={t.value} selected={ctx.productType === t.value} onSelect={() => set("productType", t.value)} title={t.title} desc={t.desc} />
                ))}
              </div>
            </div>
            <div>
              <FieldLabel required>What stage?</FieldLabel>
              <div className="space-y-2 mt-1">
                {STAGES.map((s) => (
                  <RadioCard key={s.value} selected={ctx.stage === s.value} onSelect={() => set("stage", s.value)} title={s.title} desc={s.desc} />
                ))}
              </div>
            </div>
            <div>
              <FieldLabel required>Industry</FieldLabel>
              <div className="space-y-2 mt-1">
                {INDUSTRIES.map((ind) => (
                  <CheckCard key={ind} checked={ctx.industries.includes(ind)} onToggle={() => toggleIndustry(ind)} label={ind} />
                ))}
              </div>
            </div>
            <div>
              <FieldLabel required>Target audience / Market</FieldLabel>
              <div className="space-y-2 mt-1">
                {AUDIENCES.map((a) => (
                  <RadioCard key={a.value} selected={ctx.audience === a.value} onSelect={() => set("audience", a.value)} title={a.title} desc={a.desc} />
                ))}
              </div>
            </div>
            <div>
              <FieldLabel required>Platform</FieldLabel>
              <div className="space-y-2 mt-1">
                {PLATFORMS.map((p) => (
                  <RadioCard key={p.value} selected={ctx.platform === p.value} onSelect={() => set("platform", p.value)} title={p.title} desc={p.desc} />
                ))}
              </div>
            </div>
          </div>
        );

      // ── STEP 2: Product ──
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <WhyCallout>
                &ldquo;AI-powered platform for marketers&rdquo; tells HXOS nothing about what to put on a screen. &ldquo;You type what kind of ad you want, pick a brand, and AI makes 10 versions you can edit&rdquo; tells HXOS exactly what components to design.
              </WhyCallout>
              <FieldLabel required>Explain to a smart 10-year-old</FieldLabel>
              <Textarea value={ctx.explain} onChange={(e) => set("explain", e.target.value)} rows={4} placeholder="Describe what the product does in plain language..." />
            </div>
            <div>
              <FieldLabel required>Why does this brief exist?</FieldLabel>
              <Textarea value={ctx.briefWhy} onChange={(e) => set("briefWhy", e.target.value)} rows={3} placeholder="What matters most — the single reason for this design project" />
            </div>
            <div>
              <FieldLabel required>Why THIS over alternatives?</FieldLabel>
              <Textarea value={ctx.valueProp} onChange={(e) => set("valueProp", e.target.value)} rows={3} placeholder='Complete: "People choose this because..."' />
            </div>
            <div>
              <FieldLabel required>What this product is NOT</FieldLabel>
              <Textarea value={ctx.notThis} onChange={(e) => set("notThis", e.target.value)} rows={3} placeholder="Name 2-3 things people might confuse this with" />
            </div>
            <Separator />
            <SectionHeader title="Insights" optional />
            <div>
              <FieldLabel>Paste/summarize client brief</FieldLabel>
              <Textarea value={ctx.clientBrief} onChange={(e) => set("clientBrief", e.target.value)} rows={4} placeholder="Paste relevant data, research findings, or context..." />
            </div>
          </div>
        );

      // ── STEP 3: User Segments ──
      case 2:
        return (
          <div className="space-y-5">
            <WhyCallout>
              Understanding user segments by behaviour (working mother midnight orders, Gen-Z deal hunters) produces designs calibrated to real usage patterns, not hypothetical personas.
            </WhyCallout>
            <SegmentCard label="Primary User Segment" seg={ctx.seg1} onChange={(s) => setSeg("seg1", s)} required />
            <SegmentCard label="Secondary User Segment" seg={ctx.seg2} onChange={(s) => setSeg("seg2", s)} required />
            <div>
              <FieldLabel required>User behaviour insights</FieldLabel>
              <Textarea value={ctx.behInsights} onChange={(e) => set("behInsights", e.target.value)} rows={4} placeholder="Key metrics, patterns, or qualitative observations..." />
            </div>
            <Separator />
            <SectionHeader title="Insights" optional />
            <div>
              <FieldLabel>Competitors — user experience</FieldLabel>
              <Textarea value={ctx.competitors} onChange={(e) => set("competitors", e.target.value)} rows={3} placeholder="Which competitors do these users currently use?" />
            </div>
          </div>
        );

      // ── STEP 4: Structure ──
      case 3:
        return (
          <div className="space-y-5">
            <div>
              <FieldLabel required>Key user flows</FieldLabel>
              <Textarea value={ctx.flows} onChange={(e) => set("flows", e.target.value)} rows={4} placeholder="Describe 3-5 most important flows. Start with verb." />
            </div>
            <div>
              <FieldLabel>Information Architecture</FieldLabel>
              <Textarea value={ctx.ia} onChange={(e) => set("ia", e.target.value)} rows={5} placeholder="Describe or upload your sitemap" />
            </div>
            <div>
              <FieldLabel>Figma file link</FieldLabel>
              <Input value={ctx.figmaLink} onChange={(e) => set("figmaLink", e.target.value)} placeholder="https://www.figma.com/design/..." />
            </div>
            <Separator />
            <div>
              <FieldLabel>What&apos;s coming in next 1-3 months?</FieldLabel>
              <Textarea value={ctx.upcoming} onChange={(e) => set("upcoming", e.target.value)} rows={3} placeholder="Upcoming features that might affect design." />
            </div>
          </div>
        );

      // ── STEP 5: Visual ──
      case 4:
        return (
          <div className="space-y-5">
            <div>
              <FieldLabel>Do you have a design system?</FieldLabel>
              <div className="space-y-2 mt-1">
                {DS_OPTIONS.map((d) => (
                  <RadioCard key={d.value} selected={ctx.dsChoice === d.value} onSelect={() => set("dsChoice", d.value)} title={d.title} desc={d.desc} />
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Describe visual direction</FieldLabel>
              <Textarea value={ctx.vibe} onChange={(e) => set("vibe", e.target.value)} rows={3} placeholder="Reference 2-3 products whose visual style you admire" />
            </div>
            <div>
              <FieldLabel>Colors</FieldLabel>
              <Input value={ctx.colors} onChange={(e) => set("colors", e.target.value)} placeholder="e.g., Primary: #E85C2B. Accent: #2563EB" />
            </div>
            <div>
              <FieldLabel>Fonts</FieldLabel>
              <Input value={ctx.fonts} onChange={(e) => set("fonts", e.target.value)} placeholder="e.g., Headings: DM Sans Bold. Body: DM Sans Regular" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <PhaseHeader
        title="Product Context"
        step={{ current: step + 1, total: 5 }}
        actions={
          <Button variant="outline" size="sm" className="text-[12px] text-[#6b7280]" onClick={fillDemo}>
            Fill demo data
          </Button>
        }
      />

      {/* Step tabs */}
      <div className="flex items-center gap-1 px-5 py-2 border-b border-[#e5e7eb] bg-white">
        {STEP_LABELS.map((label, i) => {
          const isPast = i < step;
          const isCurrent = i === step;
          const isFuture = i > step;
          return (
            <button
              key={label}
              onClick={() => { if (isPast || isCurrent) setStep(i); }}
              disabled={isFuture}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                isCurrent
                  ? "bg-[#eff6ff] text-[#1d4ed8]"
                  : isPast
                  ? "text-[#6b7280] hover:bg-[#f4f4f5] cursor-pointer"
                  : "text-[#d1d5db] cursor-not-allowed"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-5 py-6">
          {renderStep()}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#e5e7eb] bg-white">
        <div>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 text-[13px] text-[#6b7280] hover:text-[#111827] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </div>
        <div>
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!isStepValid(step)}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-[13px] gap-1.5"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              onClick={generatePcd}
              className="bg-[#E8713A] hover:bg-[#d4652f] text-white text-[13px] gap-1.5"
            >
              Generate PCD <Check className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
