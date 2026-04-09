"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, ArrowRight } from "lucide-react";
import { useStream } from "@/hooks/use-stream";
import { DiscoveryMarkdown } from "@/components/discovery/discovery-markdown";
import { PhaseHeader } from "@/components/phase-header";
import type { Project } from "@/lib/types";

export function DiscoveryClient({ project: initial }: { project: Project }) {
  const router = useRouter();
  const [project, setProject] = useState(initial);
  const { text, loading, error, done, run, reset } = useStream();
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-scroll streaming text
  useEffect(() => {
    if (loading && streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [text, loading]);

  function handleRunDiscovery() {
    reset();
    run(`/api/projects/${project.id}/discover`);
  }

  function handleRerun() {
    setProject((prev) => ({ ...prev, discoveryInsights: null }));
    reset();
    run(`/api/projects/${project.id}/discover`);
  }

  // Guard: enrichedPcd must exist
  if (!project.enrichedPcd) {
    return (
      <>
        <PhaseHeader title="Discovery" subtitle="Research & insights" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-[400px]">
            <div className="w-12 h-12 rounded-xl bg-[#f4f4f5] flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-[#a1a1aa]" />
            </div>
            <h2 className="text-[18px] font-bold text-[#111827] mb-2">
              Complete Product Context First
            </h2>
            <p className="text-[14px] text-[#71717a] mb-5">
              The discovery phase requires an enriched Product Context Document.
              Go back and complete the context phase.
            </p>
            <button
              onClick={() =>
                router.push(`/projects/${project.id}/context`)
              }
              className="px-5 py-2.5 bg-[#18181b] text-white text-[14px] font-medium rounded-lg hover:bg-[#27272a] transition-colors"
            >
              Go to Product Context
            </button>
          </div>
        </div>
      </>
    );
  }

  // STATE 2: Running
  if (loading) {
    return (
      <>
        <PhaseHeader title="Discovery" subtitle="Running analysis..." />
        <div className="flex-1 flex flex-col items-center overflow-hidden px-5 py-8">
          <div className="w-full max-w-[900px]">
            <div className="flex items-center gap-3 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8713A] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E8713A]" />
              </span>
              <h2 className="text-[20px] font-bold text-[#111827]">
                Running Discovery...
              </h2>
            </div>
            <p className="text-[14px] text-[#71717a] mb-5 ml-6">
              Searching category trends, audience behaviour, competitors, and
              global benchmarks.
            </p>

            <div
              ref={streamRef}
              className="bg-[#f9fafb] rounded-xl border border-[#e5e7eb] p-5 overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 220px)" }}
            >
              {text ? (
                <DiscoveryMarkdown content={text} />
              ) : (
                <div className="flex items-center gap-2 text-[13px] text-[#a1a1aa]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E8713A] animate-pulse" />
                  Initializing research agents...
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // STATE 3: Complete (has discovery insights or just finished streaming)
  const insights = project.discoveryInsights || (done && text ? text : null);

  if (insights) {
    return (
      <>
        <PhaseHeader
          title="Discovery"
          subtitle="Insights deck complete"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleRerun}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-lg hover:bg-[#f9fafb] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-run
              </button>
              <button
                onClick={() =>
                  router.push(`/projects/${project.id}/features`)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-[#E8713A] rounded-lg hover:bg-[#d4652f] transition-colors"
              >
                Create Feature
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="max-w-[900px] mx-auto">
            <DiscoveryMarkdown content={insights} />

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#e5e7eb]">
              <button
                onClick={handleRerun}
                className="flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium text-[#374151] bg-white border border-[#d1d5db] rounded-lg hover:bg-[#f9fafb] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Re-run Discovery
              </button>
              <button
                onClick={() =>
                  router.push(`/projects/${project.id}/features`)
                }
                className="flex items-center gap-2 px-6 py-2.5 text-[15px] font-semibold text-white bg-[#E8713A] rounded-lg hover:bg-[#d4652f] transition-colors"
              >
                Create Feature
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // STATE 1: Ready (has enrichedPcd but no discovery yet)
  return (
    <>
      <PhaseHeader title="Discovery" subtitle="Research & insights" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-[480px]">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF3ED] flex items-center justify-center mx-auto mb-5">
            <Search className="w-7 h-7 text-[#E8713A]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#111827] mb-3">
            Ready for Discovery
          </h2>
          <p className="text-[14px] text-[#71717a] leading-relaxed mb-6">
            Your Product Context Document has been generated. Run discovery to
            research category trends, audience insights, competitive benchmarks,
            and opportunities.
          </p>
          <button
            onClick={handleRunDiscovery}
            className="px-7 py-3 bg-[#E8713A] text-white text-[15px] font-semibold rounded-lg hover:bg-[#d4652f] transition-colors"
          >
            Run Full Discovery
          </button>
          <p className="text-[12px] text-[#a1a1aa] mt-3">
            Takes 60–90 seconds. Uses web search.
          </p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
