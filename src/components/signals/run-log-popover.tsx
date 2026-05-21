"use client";

// "How this was picked" popover, anchored to a section divider's why-link
// button. Ports openRunlog() from dashboard.html. Shows: status, items shipped,
// rejection reasons, queries run, notes, error.

import { useSyncExternalStore } from "react";
import { useSignals } from "./context";
import { SECTION_LABELS, type SectionId, type MetaConfig, type AnySectionId } from "@/lib/signals/types";
import { fmtRelDate } from "./utils";

const subscribeNoop = () => () => {};
function useNowMs(): number {
  // Reads Date.now() through React's external-store API so React's purity rule
  // is satisfied — the snapshot is the boundary, not the component body.
  return useSyncExternalStore(subscribeNoop, () => Date.now(), () => 0);
}

export function RunLogPopover({ meta }: { meta: MetaConfig }) {
  const { runLog, closeRunLog, payload } = useSignals();
  const nowMs = useNowMs();
  if (!runLog) return null;

  const sectionId = runLog.sectionId;
  const sectionLabel = SECTION_LABELS[sectionId as AnySectionId] || sectionId;
  const sectionData = sectionId === "threads"
    ? payload.threads
    : payload.sections[sectionId as SectionId];
  const log = (sectionData && "run_log" in sectionData ? sectionData.run_log : null) || null;
  const itemsShipped =
    sectionId === "threads"
      ? (payload.threads?.items.length ?? 0)
      : (payload.sections[sectionId as SectionId].items.length || 0);
  const generatedAt = sectionData && "generated_at" in sectionData ? sectionData.generated_at : null;

  const fr = meta.section_freshness[sectionId as AnySectionId];
  const ageDays = fr?.last_success
    ? Math.floor((nowMs - new Date(fr.last_success).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const status = fr?.degraded ? (
    <>
      <span style={{ color: "#b45309", fontWeight: 500 }}>Degraded</span> · last good copy{" "}
      {ageDays != null ? `${ageDays} days ago` : fr.last_success ? fmtRelDate(fr.last_success) : "—"}
    </>
  ) : ageDays != null && ageDays >= 3 ? (
    <>
      <span style={{ color: "#b45309", fontWeight: 500 }}>Aged</span> · last refreshed {ageDays} days ago
    </>
  ) : (
    <>
      <span style={{ color: "#15803d", fontWeight: 500 }}>Fresh</span> · refreshed{" "}
      {generatedAt ? fmtRelDate(generatedAt) : "this run"}
    </>
  );

  // Position relative to anchor.
  const popW = Math.min(420, typeof window !== "undefined" ? window.innerWidth - 32 : 420);
  const left = Math.min(
    typeof window !== "undefined" ? window.innerWidth - popW - 16 : 0,
    Math.max(16, runLog.anchor.x - popW + runLog.anchor.width),
  );
  const top = Math.min(
    typeof window !== "undefined" ? window.innerHeight - 200 : 0,
    runLog.anchor.y + 8,
  );

  return (
    <>
      <div className="runlog-bg" onClick={closeRunLog} />
      <aside className="runlog-popover open" style={{ left, top, right: "auto" }}>
        <button type="button" className="runlog-close" onClick={closeRunLog} title="Close">
          <svg width={13} height={13} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
        <h4>How {sectionLabel} was picked</h4>
        <div className="runlog-section-title">
          {itemsShipped} item{itemsShipped === 1 ? "" : "s"} kept this week
        </div>
        <div className="runlog-summary">{status}</div>

        {log && Array.isArray(log.rejection_reasons) && log.rejection_reasons.length > 0 && (
          <div className="runlog-block">
            <h4>
              Skipped ·{" "}
              {log.candidates_rejected != null
                ? log.candidates_rejected
                : log.rejection_reasons.reduce((s, r) => s + (r.count || 0), 0)}
            </h4>
            {log.rejection_reasons.map((r, i) => (
              <div key={i} className="rej-row">
                <span>{r.reason || ""}</span>
                <span className="count">{r.count || 0}</span>
              </div>
            ))}
          </div>
        )}

        {log && Array.isArray(log.queries_run) && log.queries_run.length > 0 && (
          <div className="runlog-block">
            <h4>Searches we ran · {log.queries_run.length}</h4>
            {log.queries_run.slice(0, 12).map((q, i) => (
              <div key={i} className="query-row">
                &quot;{q}&quot;
              </div>
            ))}
          </div>
        )}

        {log && log.notes && (
          <div className="runlog-block">
            <h4>Notes</h4>
            <div style={{ fontSize: "var(--t-3)", color: "var(--ink-2)", lineHeight: 1.5 }}>{log.notes}</div>
          </div>
        )}

        {fr?.error && (
          <div
            className="runlog-block"
            style={{ background: "#fef2f2", borderRadius: 8, padding: "10px 12px", border: "none" }}
          >
            <h4 style={{ color: "#991b1b" }}>Last error</h4>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "var(--t-2)",
                color: "#7f1d1d",
                lineHeight: 1.55,
              }}
            >
              {fr.error}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
