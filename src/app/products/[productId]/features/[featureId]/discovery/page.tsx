"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Loader2, Search, ArrowRight, RotateCcw } from "lucide-react";
import type { Feature, Product } from "@/lib/types";

export default function FeatureDiscoveryPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const router = useRouter();
  const productId = params.productId;
  const featureId = params.featureId;

  const [product, setProduct] = useState<Product | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, fRes] = await Promise.all([
          fetch(`/api/products/${productId}`),
          fetch(`/api/products/${productId}/features/${featureId}`),
        ]);
        if (pRes.ok) setProduct(await pRes.json());
        if (fRes.ok) setFeature(await fRes.json());
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [productId, featureId]);

  async function runDiscovery() {
    setRunning(true);
    setError(null);
    setProgress(0);

    try {
      const res = await fetch(`/api/products/${productId}/features/${featureId}/discover`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `API error ${res.status}` }));
        throw new Error(err.error || `API error ${res.status}`);
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.progress) setProgress(data.progress);
            if (data.error) throw new Error(data.error);
            if (data.done) {
              // Refresh feature data
              const fRes = await fetch(`/api/products/${productId}/features/${featureId}`);
              if (fRes.ok) setFeature(await fRes.json());
              setRunning(false);
              return;
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              throw e;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    }
    setRunning(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#9ca3af]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (!product || !feature) {
    return (
      <div className="flex items-center justify-center h-full text-[#9ca3af]">
        Feature not found
      </div>
    );
  }

  // Check if product-level context exists
  if (!product.enriched_pcd) {
    return (
      <>
        <PhaseHeader title="Feature Discovery" subtitle={feature.name} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <p className="text-[14px] text-[#6b7280] mb-4">
              Complete product context and discovery first before running feature-level research.
            </p>
            <Button onClick={() => router.push(`/products/${productId}/context`)} variant="outline">
              Go to Product Context
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Already has feature discovery
  if (feature.feature_discovery && !running) {
    return (
      <>
        <PhaseHeader
          title="Feature Discovery"
          subtitle={feature.name}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={runDiscovery}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Re-run
              </Button>
              <Button
                size="sm"
                className="bg-[#E8713A] hover:bg-[#d4652f] text-white"
                onClick={() => router.push(`/products/${productId}/features/${featureId}/concepts`)}
              >
                Generate Concepts <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[900px] mx-auto">
            <MarkdownRenderer content={feature.feature_discovery} />
          </div>
        </div>
      </>
    );
  }

  // Running state
  if (running) {
    return (
      <>
        <PhaseHeader title="Feature Discovery" subtitle={feature.name} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-[#3b82f6] animate-spin" />
            <h2 className="text-[18px] font-bold text-[#111827]">
              Running feature-level discovery...
            </h2>
          </div>
          <p className="text-[13px] text-[#9ca3af]">
            Researching competitive benchmarks and UX patterns for &ldquo;{feature.name}&rdquo;
          </p>
          {progress > 0 && (
            <div className="text-[12px] text-[#9ca3af]">
              {Math.floor(progress / 1000)}k characters processed
            </div>
          )}
          {error && (
            <div className="text-[13px] text-red-500">
              Error: {error}
              <Button variant="outline" size="sm" className="ml-3" onClick={() => { setError(null); setRunning(false); }}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </>
    );
  }

  // Ready state — show button to start
  return (
    <>
      <PhaseHeader title="Feature Discovery" subtitle={feature.name} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-[#eff6ff] flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-[#3b82f6]" />
          </div>
          <h2 className="text-[18px] font-bold text-[#111827] mb-2">
            Run Feature Discovery
          </h2>
          <p className="text-[14px] text-[#6b7280] mb-6">
            Research competitive benchmarks and UX patterns specifically for &ldquo;{feature.name}&rdquo;.
            This builds on the product-level discovery with feature-specific insights.
          </p>
          <Button
            onClick={runDiscovery}
            className="bg-[#E8713A] hover:bg-[#d4652f] text-white gap-1.5"
          >
            <Search className="w-4 h-4" />
            Run Discovery
          </Button>
        </div>
      </div>
    </>
  );
}
