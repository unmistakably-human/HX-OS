"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Loader2 } from "lucide-react";
import { sanitizeUserFlow, type Feature, type UserFlow } from "@/lib/types";

const CARD_W = 175;
const CARD_H = 140;
const GAP_X = 105;
const GAP_Y = 90;
const ELEMENT_H = 20;
const PADDING = 50;

const sBg: Record<string, string> = { original: "#EEF2FF", new: "#ECFDF5", updated: "#FFFBEB" };
const sFg: Record<string, string> = { original: "#4338CA", new: "#047857", updated: "#B45309" };

export default function FlowPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const productId = params.productId;
  const featureId = params.featureId;

  const [feature, setFeature] = useState<Feature | null>(null);
  const [flow, setFlow] = useState<UserFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState("flow");
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/products/${productId}/features/${featureId}`);
        if (res.ok) {
          const feat: Feature = await res.json();
          setFeature(feat);
          if (feat.user_flow) {
            setFlow(sanitizeUserFlow(feat.user_flow));
          } else {
            // Auto-trigger generation
            setGenerating(true);
            try {
              const genRes = await fetch(`/api/products/${productId}/features/${featureId}/flow`, { method: "POST" });
              if (genRes.ok) {
                const data = await genRes.json();
                setFlow(sanitizeUserFlow(data));
              }
            } catch { /* ignore */ }
            setGenerating(false);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [productId, featureId]);

  if (loading || generating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-content-muted" strokeWidth={1.5} />
        <p className="text-sm text-content-secondary">{generating ? "Generating user flow..." : "Loading..."}</p>
        <p className="text-xs text-content-muted">This takes 15-30 seconds</p>
      </div>
    );
  }

  if (!flow || !flow.screens?.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-content-muted">
        No flow data available
      </div>
    );
  }

  const screens = flow.screens || [];
  const decisions = flow.decisions || [];
  const connections = flow.connections || [];
  const allNodes = [...screens, ...decisions];

  const getNode = (id: string) => allNodes.find((n) => n.id === id);

  const minY = Math.min(...allNodes.map((n) => n.y));
  const maxX = Math.max(...allNodes.map((n) => n.x));
  const maxY = Math.max(...allNodes.map((n) => n.y));
  const yOff = -minY * (CARD_H + GAP_Y);

  const p = (x: number, y: number, el = 4) => ({
    px: PADDING + x * (CARD_W + GAP_X),
    py: PADDING + 30 + y * (CARD_H + GAP_Y) + yOff,
    h: CARD_H + Math.max(0, el - 4) * ELEMENT_H,
  });

  const svgW = PADDING * 2 + (maxX + 1) * (CARD_W + GAP_X) + 20;
  const svgH = PADDING * 2 + (maxY - minY + 1) * (CARD_H + GAP_Y) + 100;

  const edge = (fid: string, tid: string) => {
    const f = getNode(fid), t = getNode(tid);
    if (!f || !t) return null;
    const fp = p(f.x, f.y, (f as typeof screens[0]).elements?.length || 4);
    const tp = p(t.x, t.y, (t as typeof screens[0]).elements?.length || 4);
    const isDiam = decisions.some((d) => d.id === fid);
    const toDiam = decisions.some((d) => d.id === tid);
    const ds = 30;
    if (t.y > f.y && Math.abs(t.x - f.x) < 0.6) return { x1: fp.px + CARD_W / 2, y1: fp.py + fp.h, x2: tp.px + CARD_W / 2, y2: tp.py };
    if (t.y < f.y && Math.abs(t.x - f.x) < 0.6) return { x1: fp.px + CARD_W / 2, y1: fp.py, x2: tp.px + CARD_W / 2, y2: tp.py + tp.h };
    if (t.x >= f.x) return { x1: isDiam ? fp.px + CARD_W / 2 + ds : fp.px + CARD_W, y1: fp.py + fp.h / 2, x2: toDiam ? tp.px + CARD_W / 2 - ds : tp.px, y2: tp.py + tp.h / 2 };
    return { x1: fp.px, y1: fp.py + fp.h / 2, x2: tp.px + CARD_W, y2: tp.py + tp.h / 2 };
  };

  const curve = (pts: ReturnType<typeof edge>) => {
    if (!pts) return "";
    if (Math.abs(pts.y2 - pts.y1) < 12) return `M${pts.x1},${pts.y1}L${pts.x2},${pts.y2}`;
    const r = 0.4;
    return `M${pts.x1},${pts.y1} C${pts.x1 + (pts.x2 - pts.x1) * r},${pts.y1} ${pts.x2 - (pts.x2 - pts.x1) * r},${pts.y2} ${pts.x2},${pts.y2}`;
  };

  const errorScreenIds = screens.filter((s) =>
    connections.some((c) => c.to === s.id && c.type === "error") ||
    s.title.toLowerCase().includes("error") || s.title.toLowerCase().includes("failed")
  ).map((s) => s.id);

  const entryScreenIds = screens.filter((s) =>
    s.title.toLowerCase().includes("deep link") || s.title.toLowerCase().includes("notification") || s.title.toLowerCase().includes("entry")
  ).map((s) => s.id);

  const tabs = [
    { key: "flow", label: "Flow Diagram", count: `${screens.length} screens` },
    { key: "steps", label: "Steps & Changes", count: `${(flow.changelog || []).length} items` },
    { key: "rationale", label: "What Was Added & Why", count: `${(flow.rationale || []).length} additions` },
    { key: "edges", label: "Edge Cases", count: `${(flow.edge_cases || []).reduce((a, c) => a + c.items.length, 0)} cases` },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PhaseHeader title="User Flow" subtitle={feature?.name || "Flow"} />

      {/* Tabs */}
      <div className="px-5 flex gap-1 bg-white border-b border-divider overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key ? "border-content-heading text-content-heading" : "border-transparent text-content-muted"
            }`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              tab === t.key ? "bg-surface-subtle text-content-heading" : "bg-surface-subtle text-content-muted"
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        {/* ── FLOW DIAGRAM ── */}
        {tab === "flow" && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 bg-surface-subtle border-b border-divider flex flex-wrap items-center gap-5">
              <span className="text-xs text-content-muted">Click any screen to highlight</span>
              <span className="flex items-center gap-1.5 text-xs text-content-muted"><span className="inline-block w-5 h-px bg-content-muted rounded" /> Happy path</span>
              <span className="flex items-center gap-1.5 text-xs text-red-500"><span className="inline-block w-5 h-px rounded bg-red-500" /> Error / alt</span>
              <span className="flex items-center gap-1.5 text-xs text-content-muted">
                <svg width="9" height="9" viewBox="0 0 10 10"><polygon points="5,0 10,5 5,10 0,5" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg> Decision
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <svg width={svgW} height={svgH} style={{ fontFamily: "system-ui, sans-serif" }}>
                <defs>
                  <marker id="arrow" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#9CA3AF"/></marker>
                  <marker id="arrow-err" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#EF4444"/></marker>
                </defs>

                {connections.map((c, i) => {
                  const pts = edge(c.from, c.to);
                  if (!pts) return null;
                  const isE = c.type === "error";
                  const d = curve(pts);
                  const mx = (pts.x1 + pts.x2) / 2, my = (pts.y1 + pts.y2) / 2;
                  return (
                    <g key={i}>
                      <path d={d} fill="none" stroke={isE ? "#EF4444" : "#9CA3AF"} strokeWidth="1.5" markerEnd={isE ? "url(#arrow-err)" : "url(#arrow)"} strokeDasharray={isE ? "5,3" : "none"} />
                      <rect x={mx - c.label.length * 3 - 5} y={my - 16} width={c.label.length * 6 + 10} height={16} rx="4" fill="white" fillOpacity="0.94" stroke={isE ? "#FECACA" : "#E5E7EB"} strokeWidth="0.5" />
                      <text x={mx} y={my - 5.5} textAnchor="middle" fontSize="9" fill={isE ? "#DC2626" : "#6B7280"} fontWeight="500">{c.label}</text>
                    </g>
                  );
                })}

                {screens.map((s) => {
                  const sp = p(s.x, s.y, s.elements.length);
                  const isA = activeScreen === s.id;
                  const isErr = errorScreenIds.includes(s.id);
                  const isEntry = entryScreenIds.includes(s.id);
                  return (
                    <g key={s.id} onClick={() => setActiveScreen(isA ? null : s.id)} style={{ cursor: "pointer" }}>
                      <rect x={sp.px - 1} y={sp.py - 1} width={CARD_W + 2} height={sp.h + 2} rx="10" fill="none" stroke={isA ? "#4F46E5" : "transparent"} strokeWidth="2" />
                      <rect x={sp.px} y={sp.py} width={CARD_W} height={sp.h} rx="9" fill={isErr ? "#FFFBFB" : isEntry ? "#F0FDF9" : "white"} stroke={isErr ? "#FECACA" : isEntry ? "#BBF7D0" : "#E5E7EB"} strokeWidth="1" />
                      <rect x={sp.px} y={sp.py} width={CARD_W} height={28} rx="9" fill={isErr ? "#FEF2F2" : isEntry ? "#F0FDF4" : "#F9FAFB"} />
                      <rect x={sp.px} y={sp.py + 14} width={CARD_W} height={14} fill={isErr ? "#FEF2F2" : isEntry ? "#F0FDF4" : "#F9FAFB"} />
                      <text x={sp.px + CARD_W / 2} y={sp.py + 18} textAnchor="middle" fontWeight="700" fontSize="11" fill={isErr ? "#991B1B" : isEntry ? "#166534" : "#111827"}>{s.title}</text>
                      <line x1={sp.px} y1={sp.py + 28} x2={sp.px + CARD_W} y2={sp.py + 28} stroke={isErr ? "#FECACA" : isEntry ? "#BBF7D0" : "#E5E7EB"} />
                      {s.elements.map((el, j) => (
                        <text key={j} x={sp.px + 12} y={sp.py + 44 + j * ELEMENT_H} fontSize="10" fill="#6B7280">{el}</text>
                      ))}
                    </g>
                  );
                })}

                {decisions.map((d) => {
                  const dp = p(d.x, d.y);
                  const cx = dp.px + CARD_W / 2, cy = dp.py + CARD_H / 2, sz = 30;
                  return (
                    <g key={d.id}>
                      <polygon points={`${cx},${cy - sz} ${cx + sz},${cy} ${cx},${cy + sz} ${cx - sz},${cy}`} fill="white" stroke="#A5B4FC" strokeWidth="1.5" />
                      <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="9" fill="#4338CA" fontWeight="600">{d.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* ── STEPS & CHANGES ── */}
        {tab === "steps" && (
          <div className="p-6 overflow-y-auto h-full">
            <p className="text-sm text-content-secondary mb-5">How the flow was constructed from the selected concept.</p>
            <div className="space-y-2.5">
              {(flow.changelog || []).map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg border border-divider bg-surface-subtle">
                  <span className="flex-shrink-0 mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: sBg[s.status] || sBg.new, color: sFg[s.status] || sFg.new }}>{s.status}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content-heading">{s.screen}</p>
                    <p className="text-sm text-content-secondary mt-0.5 leading-relaxed">{s.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RATIONALE ── */}
        {tab === "rationale" && (
          <div className="p-6 overflow-y-auto h-full">
            <p className="text-sm text-content-secondary mb-5">Why each new screen or decision point was added.</p>
            <div className="space-y-5">
              {(flow.rationale || []).map((r, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg border border-divider flex items-center justify-center text-base bg-surface-subtle">{r.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content-heading">{r.title}</p>
                    <p className="text-sm text-content-secondary mt-1 leading-relaxed">{r.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EDGE CASES ── */}
        {tab === "edges" && (
          <div className="p-6 overflow-y-auto h-full">
            <p className="text-sm text-content-secondary mb-5">
              {(flow.edge_cases || []).reduce((a, c) => a + c.items.length, 0)} edge cases across {(flow.edge_cases || []).length} categories.
            </p>
            <div className="space-y-2.5">
              {(flow.edge_cases || []).map((cat, ci) => {
                const isOpen = expandedCategory === ci;
                return (
                  <div key={ci} className="border border-divider rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedCategory(isOpen ? null : ci)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isOpen ? "bg-surface-subtle" : "bg-white"}`}>
                      <span className="text-sm font-semibold text-content-heading">{cat.category}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-subtle text-content-muted">{cat.items.length}</span>
                        <svg width="14" height="14" viewBox="0 0 16 16" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 py-3 border-t border-divider space-y-3">
                        {cat.items.map((item, ii) => (
                          <div key={ii} className="flex gap-3 items-start">
                            <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-[#C7D2FE]" />
                            <p className="text-sm text-content-secondary leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
