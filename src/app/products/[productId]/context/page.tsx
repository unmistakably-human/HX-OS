"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStream } from "@/hooks/use-stream";
import { DEMO_CONTEXT } from "@/lib/demo-data";
import type { ProductContext, UserSegment, DesignTokens } from "@/lib/types";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload, Wand2, ExternalLink, ImageIcon } from "lucide-react";

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
  { value: "figma", title: "Connect Figma", desc: "Extract design tokens and variables from your Figma file" },
  { value: "upload", title: "Upload style guide or screenshots", desc: "JSON tokens, style guide, PDF, or screenshots — AI extracts colors" },
  { value: "describe", title: "Describe the visual identity", desc: "Specify colors and fonts manually below" },
  { value: "propose", title: "HXOS can propose", desc: "AI generates a color palette + typography system for your product" },
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
    designTokens: null,
  };
}

function RadioCard({
  selected, onSelect, title, desc,
}: {
  selected: boolean; onSelect: () => void; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-start gap-3 text-left border rounded-md px-3 py-[9px] transition-colors ${
        selected ? "border-action-primary-bg bg-surface-subtle" : "border-divider bg-surface-card hover:border-divider"
      }`}
    >
      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        selected ? "border-action-primary-bg" : "border-divider"
      }`}>
        {selected && <span className="w-2 h-2 rounded-full bg-action-primary-bg" />}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-content-heading">{title}</div>
        {desc && <div className="text-xs text-content-muted mt-0.5">{desc}</div>}
      </div>
    </button>
  );
}

function CheckCard({
  checked, onToggle, label,
}: {
  checked: boolean; onToggle: () => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 text-left border rounded-md px-3 py-[9px] transition-colors ${
        checked ? "border-action-primary-bg bg-surface-subtle" : "border-divider bg-surface-card hover:border-divider"
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className="pointer-events-none" />
      <span className="text-sm text-content-heading">{label}</span>
    </button>
  );
}

function WhyCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-subtle border-l-2 border-feedback-info-border rounded-md px-3.5 py-2.5 mb-4">
      <p className="text-xs text-feedback-info-text">
        <span className="font-bold">Why this matters: </span>
        {children}
      </p>
    </div>
  );
}

function SegmentCard({
  label, seg, onChange, required,
}: {
  label: string; seg: UserSegment; onChange: (s: UserSegment) => void; required?: boolean;
}) {
  const set = (key: keyof UserSegment, val: string) => onChange({ ...seg, [key]: val });
  return (
    <div className="border border-divider rounded-[8px] p-4 bg-surface-card">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-content-heading">{label}</h3>
        {required && (
          <span className="text-[10px] font-bold text-feedback-info-text bg-surface-subtle px-1.5 py-0.5 rounded">REQUIRED</span>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-content-secondary">Segment name</Label>
          <Input value={seg.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g., Working mothers, 28-40" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-content-secondary">Demographics</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Input value={seg.age} onChange={(e) => set("age", e.target.value)} placeholder="Age range" />
            <Input value={seg.gender} onChange={(e) => set("gender", e.target.value)} placeholder="Gender" />
            <Input value={seg.loc} onChange={(e) => set("loc", e.target.value)} placeholder="Location" />
            <Input value={seg.income} onChange={(e) => set("income", e.target.value)} placeholder="Income bracket" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-content-secondary">Behaviour</Label>
          <Textarea value={seg.behaviour} onChange={(e) => set("behaviour", e.target.value)} rows={3} className="mt-1" />
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-body-sm font-medium text-content-label mb-1.5 block">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </Label>
  );
}

function DesignTokensPreview({ tokens }: { tokens: DesignTokens }) {
  return (
    <div className="border border-divider rounded-[8px] p-4 bg-surface-card space-y-4 mt-3">
      {/* Brand Colors */}
      {tokens.brandColors.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-content-label mb-2">Brand Colors</div>
          <div className="flex gap-3">
            {tokens.brandColors.map((c) => (
              <div key={c.hex} className="text-center">
                <div className="w-12 h-12 rounded-md border border-divider shadow-sm" style={{ backgroundColor: c.hex }} />
                <div className="text-[10px] text-content-secondary mt-1.5">{c.name}</div>
                <div className="text-[10px] font-mono text-content-muted">{c.hex}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Gradient */}
      {tokens.gradient && (
        <div>
          <div className="text-xs font-semibold text-content-label mb-2">Gradient</div>
          <div className="h-8 rounded-md border border-divider" style={{ background: tokens.gradient }} />
        </div>
      )}
      {/* Neutrals */}
      {tokens.neutrals.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-content-label mb-2">Neutrals</div>
          <div className="flex gap-2">
            {tokens.neutrals.map((c) => (
              <div key={c.hex} className="text-center">
                <div className="w-10 h-10 rounded-md border border-divider" style={{ backgroundColor: c.hex }} />
                <div className="text-[10px] font-mono text-content-muted mt-1">{c.hex}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Typography */}
      {tokens.typography.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-content-label mb-2">Typography</div>
          <div className="space-y-1.5">
            {tokens.typography.map((t) => (
              <div key={t.level} className="flex items-baseline gap-3 text-xs">
                <span className="font-semibold text-content-heading w-14 shrink-0">{t.level}</span>
                <span className="text-content-secondary">{t.font} {t.weight}{t.size ? ` / ${t.size}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, optional }: { title: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <h3 className="text-sm font-semibold text-content-heading">{title}</h3>
      {optional && (
        <span className="text-[10px] font-medium text-content-muted bg-surface-page-alt px-1.5 py-0.5 rounded">OPTIONAL</span>
      )}
    </div>
  );
}

export default function ContextPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.productId as string;

  const [step, setStep] = useState(0);
  const [ctx, setCtx] = useState<ProductContext>(emptyContext);
  const [generating, setGenerating] = useState(false);
  const stream = useStream();

  // Visual tab state
  const [figmaConnected, setFigmaConnected] = useState(false);
  const [figmaFileUrl, setFigmaFileUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const dsFileInputRef = useRef<HTMLInputElement>(null);
  const [dsFile, setDsFile] = useState<File | null>(null);
  const [proposing, setProposing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Load existing context from API, pre-fill name/company from product record
  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((p) => {
        if (p.product_context) {
          setCtx({ ...emptyContext(), ...p.product_context, industries: p.product_context.industries || [] });
        } else {
          // Pre-fill from product-level name/company
          setCtx((prev) => ({
            ...prev,
            productName: p.name || prev.productName,
            company: p.company || prev.company,
          }));
        }
        // Track Figma connection status
        setFigmaConnected(!!p.figma_access_token);
        if (p.figma_file_url) setFigmaFileUrl(p.figma_file_url);
      })
      .catch(() => {});
  }, [productId]);

  // Handle Figma OAuth redirect
  useEffect(() => {
    if (searchParams.get("figma") === "connected") {
      setFigmaConnected(true);
      setStep(4); // Jump to Visual tab
    }
  }, [searchParams]);

  // Auto-navigate after enrichment completes
  useEffect(() => {
    if (stream.done && !stream.error) {
      router.push(`/products/${productId}/discovery`);
    }
  }, [stream.done, stream.error, productId, router]);

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
    setCtx((prev) => ({
      ...DEMO_CONTEXT,
      productName: prev.productName,
      company: prev.company,
    }));
  }, []);

  // Helper: apply extracted tokens to context strings for downstream compat
  const applyTokens = useCallback((tokens: DesignTokens) => {
    set("designTokens", tokens);
    const colorStr = [
      ...tokens.brandColors.map((c) => `${c.name}: ${c.hex}`),
      ...tokens.neutrals.map((c) => `${c.name}: ${c.hex}`),
    ].join(". ");
    set("colors", colorStr);
    const fontStr = tokens.typography
      .map((t) => `${t.level}: ${t.font} ${t.weight}${t.size ? ` ${t.size}` : ""}`)
      .join(". ");
    if (fontStr) set("fonts", fontStr);
  }, [set]);

  // Extract design tokens from Figma
  const handleExtractFigma = useCallback(async () => {
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch(`/api/products/${productId}/extract-design-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "figma", figmaFileUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error ${res.status}`);
      }
      const tokens: DesignTokens = await res.json();
      applyTokens(tokens);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    }
    setExtracting(false);
  }, [productId, figmaFileUrl, applyTokens]);

  // Handle file upload for design tokens
  const handleDsFileUpload = useCallback(async (file: File) => {
    setDsFile(file);
    setExtracting(true);
    setExtractError(null);
    try {
      const isImage = file.type.startsWith("image/");
      let body: Record<string, string>;

      if (isImage) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // strip data:image/...;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        body = { source: "image", data: base64, mediaType: file.type };
      } else {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        body = { source: "text", text, fileName: file.name };
      }

      const res = await fetch(`/api/products/${productId}/extract-design-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error ${res.status}`);
      }
      const tokens: DesignTokens = await res.json();
      applyTokens(tokens);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    }
    setExtracting(false);
  }, [productId, applyTokens]);

  // Propose style guide via AI
  const handleProposeStyle = useCallback(async () => {
    setProposing(true);
    setExtractError(null);
    try {
      const res = await fetch(`/api/products/${productId}/propose-style-guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error ${res.status}`);
      }
      const tokens: DesignTokens = await res.json();
      applyTokens(tokens);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Generation failed");
    }
    setProposing(false);
  }, [productId, applyTokens]);

  // Save context and trigger enrichment
  const generatePcd = useCallback(async () => {
    setGenerating(true);
    // Save context first
    await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_context: ctx }),
    });
    // Stream enrichment
    stream.run(`/api/products/${productId}/enrich`);
  }, [productId, ctx, stream]);

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
        return true;
      default:
        return false;
    }
  }, [ctx]);

  if (generating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-action-primary-bg animate-spin" strokeWidth={1.5} />
          <h2 className="text-h2 font-bold text-content-heading">
            Generating your Product Context Document...
          </h2>
        </div>
        <p className="text-body-sm text-content-muted">
          Researching your product, competitors, and market with web search
        </p>
        {stream.text && (
          <div className="w-full max-w-2xl mt-4 max-h-64 overflow-y-auto rounded-[8px] border border-divider bg-surface-subtle p-4">
            <pre className="text-xs text-content-secondary whitespace-pre-wrap font-mono leading-relaxed opacity-60">
              {stream.text.slice(-2000)}
            </pre>
          </div>
        )}
        {stream.error && (
          <div className="text-body-sm text-red-500 mt-2">
            Error: {stream.error}
            <Button variant="outline" size="sm" className="ml-3" onClick={() => { setGenerating(false); stream.reset(); }}>
              Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <FieldLabel required>Product name</FieldLabel>
              <Input value={ctx.productName} disabled className="bg-surface-page-alt text-content-secondary cursor-not-allowed mt-1" />
            </div>
            <div>
              <FieldLabel required>Company / Organization</FieldLabel>
              <Input value={ctx.company} disabled className="bg-surface-page-alt text-content-secondary cursor-not-allowed mt-1" />
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
      case 4:
        return (
          <div className="space-y-5">
            <div>
              <FieldLabel>How would you like to define your visual identity?</FieldLabel>
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

            {/* ── Figma Connect ── */}
            {ctx.dsChoice === "figma" && (
              <div className="space-y-3">
                {figmaConnected ? (
                  <>
                    <div className="flex items-center gap-2 text-body-sm">
                      <span className="flex items-center gap-1.5 text-hx-green-dark bg-hx-green-light px-2.5 py-1 rounded-md font-medium text-xs">
                        <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> Figma connected
                      </span>
                    </div>
                    <div>
                      <FieldLabel>Figma file URL</FieldLabel>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={figmaFileUrl}
                          onChange={(e) => setFigmaFileUrl(e.target.value)}
                          placeholder="https://www.figma.com/design/..."
                          className="flex-1"
                        />
                        <Button
                          onClick={handleExtractFigma}
                          disabled={!figmaFileUrl || extracting}
                          className="text-xs shrink-0"
                        >
                          {extracting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" strokeWidth={1.5} /> Extracting...</> : "Extract Variables"}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="border-2 border-dashed border-divider rounded-[8px] p-6 text-center">
                    <ExternalLink className="w-8 h-8 text-content-muted mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-content-heading mb-1">Connect your Figma account</p>
                    <p className="text-xs text-content-muted mb-4">We&apos;ll extract design tokens and variables from your file</p>
                    <Button
                      onClick={() => window.location.href = `/api/auth/figma?productId=${productId}`}
                      className="text-body-sm gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} /> Connect Figma
                    </Button>
                  </div>
                )}
                {extractError && <p className="text-body-sm text-red-500">{extractError}</p>}
                {ctx.designTokens?.source === "figma" && <DesignTokensPreview tokens={ctx.designTokens} />}
              </div>
            )}

            {/* ── Upload ── */}
            {ctx.dsChoice === "upload" && (
              <div className="space-y-3">
                <input
                  ref={dsFileInputRef}
                  type="file"
                  accept=".json,.pdf,.md,.txt,.png,.jpg,.jpeg,.svg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDsFileUpload(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => dsFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleDsFileUpload(file);
                  }}
                  className={`w-full border-2 border-dashed rounded-[8px] p-8 text-center transition-colors ${
                    dragOver ? "border-action-primary-bg bg-surface-subtle" : "border-divider hover:border-divider"
                  }`}
                >
                  {extracting ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-action-primary-bg animate-spin" strokeWidth={1.5} />
                      <p className="text-body-sm text-content-secondary">Extracting design tokens from {dsFile?.name}...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <Upload className="w-6 h-6 text-content-muted" strokeWidth={1.5} />
                        <ImageIcon className="w-6 h-6 text-content-muted" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-content-heading mb-1">
                        {dsFile ? dsFile.name : "Drop file or click to upload"}
                      </p>
                      <p className="text-xs text-content-muted">
                        JSON tokens, style guide, PDF, or screenshots (PNG, JPG)
                      </p>
                      <p className="text-overline text-divider mt-1">AI will extract colors and fonts automatically</p>
                    </>
                  )}
                </button>
                {extractError && <p className="text-body-sm text-red-500">{extractError}</p>}
                {ctx.designTokens?.source === "upload" && <DesignTokensPreview tokens={ctx.designTokens} />}
              </div>
            )}

            {/* ── Describe ── */}
            {ctx.dsChoice === "describe" && (
              <>
                <div>
                  <FieldLabel>Colors</FieldLabel>
                  <Input value={ctx.colors} onChange={(e) => set("colors", e.target.value)} placeholder="e.g., Primary: #E85C2B. Accent: #2563EB" />
                </div>
                <div>
                  <FieldLabel>Fonts</FieldLabel>
                  <Input value={ctx.fonts} onChange={(e) => set("fonts", e.target.value)} placeholder="e.g., Headings: DM Sans Bold. Body: DM Sans Regular" />
                </div>
              </>
            )}

            {/* ── HXOS Propose ── */}
            {ctx.dsChoice === "propose" && (
              <div className="space-y-3">
                {!ctx.designTokens || ctx.designTokens.source !== "ai-proposed" ? (
                  <div className="border-2 border-dashed border-divider rounded-[8px] p-6 text-center">
                    <Wand2 className="w-8 h-8 text-action-primary-bg mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-content-heading mb-1">Generate a style guide</p>
                    <p className="text-xs text-content-muted mb-4">
                      AI will create a color palette (2 brand, 1 gradient, 5 neutrals) and 5-level typography system
                    </p>
                    <Button
                      onClick={handleProposeStyle}
                      disabled={proposing}
                      className="text-body-sm gap-1.5"
                    >
                      {proposing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" strokeWidth={1.5} /> Generating...</> : <><Wand2 className="w-4 h-4" strokeWidth={1.5} /> Generate Style Guide</>}
                    </Button>
                  </div>
                ) : (
                  <>
                    <DesignTokensPreview tokens={ctx.designTokens} />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleProposeStyle}
                        disabled={proposing}
                        variant="outline"
                        className="text-xs gap-1.5"
                      >
                        {proposing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" strokeWidth={1.5} /> Regenerating...</> : <><Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Regenerate</>}
                      </Button>
                    </div>
                  </>
                )}
                {extractError && <p className="text-body-sm text-red-500">{extractError}</p>}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PhaseHeader
        title="Product Context"
        step={{ current: step + 1, total: 5 }}
        actions={
          <Button variant="outline" size="sm" className="text-xs text-content-secondary" onClick={fillDemo}>
            Fill demo data
          </Button>
        }
      />
      <div className="flex items-center gap-1 px-5 py-2 border-b border-divider bg-surface-card">
        {STEP_LABELS.map((label, i) => {
          const isPast = i < step;
          const isCurrent = i === step;
          const isFuture = i > step;
          return (
            <button
              key={label}
              onClick={() => { if (isPast || isCurrent) setStep(i); }}
              disabled={isFuture}
              className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                isCurrent
                  ? "bg-surface-subtle text-feedback-info-text"
                  : isPast
                  ? "text-content-secondary hover:bg-surface-page-alt cursor-pointer"
                  : "text-divider cursor-not-allowed"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-5 py-6">
          {renderStep()}
        </div>
      </div>
      <div className="flex items-center justify-between px-5 py-3 border-t border-divider bg-surface-card">
        <div>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 text-body-sm text-content-secondary hover:text-content-heading transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
            </button>
          )}
        </div>
        <div>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!isStepValid(step)} className="text-body-sm gap-1.5">
              Continue <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Button>
          ) : (
            <Button onClick={generatePcd} className="text-body-sm gap-1.5">
              Generate PCD <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
