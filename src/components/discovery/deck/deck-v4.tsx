"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  DiscoveryDeckV4,
  KpiChip,
  VocCard,
  CompetitorCard,
  IdeaCard,
  ModuleIdea,
  KpiFocusCard,
  DelighterCard,
  PositioningDot,
  FeatureHeatmapCell,
} from "@/lib/discovery-types";
import { PastelCover } from "./pastel-cover";

const ACCENT = "#E8713A";
const ACCENT_TINT = "#fdf3ee";
const ACCENT_BORDER = "#f2c6ae";

// ─────────────────────────── PRIMITIVES ───────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.08em] mb-1" style={{ color: ACCENT }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className="text-2xl mb-3 leading-tight"
      style={{ fontFamily: "'Instrument Serif', Georgia, serif", letterSpacing: "-0.01em" }}
    >
      {children}
    </h2>
  );
}

function Reframe({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs italic text-content-secondary leading-relaxed max-w-[680px] mb-3">
      {children}
    </div>
  );
}

function IdChip({ id }: { id: string }) {
  return (
    <span
      className="inline-block text-[9px] font-semibold uppercase tracking-[0.04em] rounded-sm px-1.5 py-0.5 mr-1.5 font-mono"
      style={{ color: ACCENT, background: ACCENT_TINT, border: `0.5px solid ${ACCENT_BORDER}` }}
    >
      {id}
    </span>
  );
}

function InScopeBadge() {
  return (
    <span
      className="inline-block text-[9px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-sm align-middle ml-1.5"
      style={{ background: ACCENT, color: "#fff" }}
    >
      In scope
    </span>
  );
}

function FyiTag() {
  return (
    <span className="inline-block text-[8px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-sm align-middle ml-1 text-content-muted bg-surface-page-alt">
      FYI
    </span>
  );
}

function ClientBenchmarkChip() {
  return (
    <span
      className="inline-block text-[8px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-sm align-middle ml-1.5"
      style={{ color: ACCENT, border: `0.5px solid ${ACCENT}`, background: "#fff" }}
    >
      Client benchmark
    </span>
  );
}

function KpiChipDisplay({ kpi }: { kpi: KpiChip }) {
  const arrow = kpi.direction === "down" ? "↓" : kpi.direction === "neutral" ? "→" : "↑";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] rounded-full px-2.5 py-1 text-content-heading"
      style={{ background: "#fff", border: `0.5px solid ${ACCENT_BORDER}` }}
    >
      <span style={{ color: ACCENT, fontWeight: 600 }}>{arrow}</span>
      {kpi.label}
    </span>
  );
}

function SoDesign({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div
      className="mt-3 px-4 py-3 rounded-r-[10px]"
      style={{
        background: ACCENT_TINT,
        border: `0.5px solid ${ACCENT_BORDER}`,
        borderLeft: `3px solid ${ACCENT}`,
      }}
    >
      <div
        className="text-[9px] font-semibold uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5"
        style={{ color: ACCENT }}
      >
        <span>→</span> So design
      </div>
      <ul className="text-xs text-content-heading leading-relaxed pl-4 list-disc space-y-1">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function InScopeCallout({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div
      className="mt-2 px-3 py-2 rounded-r-md text-[11px] italic text-content-heading leading-relaxed"
      style={{ background: ACCENT_TINT, borderLeft: `3px solid ${ACCENT}` }}
    >
      <span className="font-semibold not-italic mr-1" style={{ color: ACCENT }}>
        → On the in-scope surface:
      </span>
      {text}
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  reframe,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  reframe?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <Eyebrow>{eyebrow}</Eyebrow>
      <SectionTitle>{title}</SectionTitle>
      {reframe && <Reframe>{reframe}</Reframe>}
      {children}
    </section>
  );
}

function ChapterCard({ id, numeral, title, framing }: { id: string; numeral: string; title: string; framing: string }) {
  return (
    <div
      id={id}
      className="relative my-12 px-8 py-9 rounded-2xl overflow-hidden scroll-mt-24"
      style={{
        background: `linear-gradient(180deg, ${ACCENT_TINT} 0%, #fff 100%)`,
        border: `0.5px solid ${ACCENT_BORDER}`,
      }}
    >
      <div className="absolute top-0 left-0 h-full w-[4px]" style={{ background: ACCENT }} />
      <div
        className="text-[64px] leading-none mb-2"
        style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: ACCENT, letterSpacing: "-0.02em" }}
      >
        {numeral}
      </div>
      <div
        className="text-3xl mb-3"
        style={{ fontFamily: "'Instrument Serif', Georgia, serif", letterSpacing: "-0.01em" }}
      >
        {title}
      </div>
      <div className="text-base text-content-secondary leading-relaxed max-w-[580px]">{framing}</div>
    </div>
  );
}

// ─────────────────────────── SECTIONS ───────────────────────────

function HeroBanner({ deck }: { deck: DiscoveryDeckV4 }) {
  const { hero } = deck;
  return (
    <div className="mt-6 mb-6">
      <div
        className="flex gap-3 items-start rounded-[10px] px-4 py-3 mb-4"
        style={{
          background: `repeating-linear-gradient(135deg, ${ACCENT_TINT}, ${ACCENT_TINT} 8px, #fff 8px, #fff 16px)`,
          border: `0.5px dashed ${ACCENT}`,
        }}
      >
        <div className="text-xl leading-none" style={{ color: ACCENT }}>⊙</div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: ACCENT }}>
            Discovery mode · ideas, not verdicts
          </div>
          <div className="text-[13px] text-content-heading leading-relaxed">{hero.banner}</div>
        </div>
      </div>

      {/* Designer tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        {hero.tiles.map((t, i) => (
          <div key={i} className="rounded-lg px-4 py-3.5 bg-surface-subtle border border-divider/40">
            <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-content-muted mb-1.5">
              {t.label}
            </div>
            <div className="text-sm font-medium text-content-heading leading-snug">{t.value}</div>
            {t.sub && <div className="text-[11px] text-content-secondary mt-1 leading-relaxed">{t.sub}</div>}
          </div>
        ))}
      </div>

      {/* KPI strip */}
      {hero.kpis?.length ? (
        <div
          className="mt-4 px-3.5 py-3 rounded-lg flex flex-wrap gap-2 items-center"
          style={{ background: ACCENT_TINT, border: `0.5px dashed ${ACCENT_BORDER}` }}
        >
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.08em] mr-1.5"
            style={{ color: ACCENT }}
          >
            Client KPIs we&apos;re designing against
          </span>
          {hero.kpis.map((k, i) => (
            <KpiChipDisplay key={i} kpi={k} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function KycSection({ deck }: { deck: DiscoveryDeckV4 }) {
  const { know_your_client: kyc } = deck;
  return (
    <Section
      id="know-your-client"
      eyebrow="01 · Know your client"
      title={kyc.title || "Know your client"}
      reframe={
        <>
          Six quick reads on who we&apos;re working with, in plain language.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        {kyc.blocks.map((b, i) => (
          <div key={i} className="rounded-[8px] px-4 py-3.5 bg-white border border-divider/40">
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-1.5">
              {b.label}
            </div>
            <div className="text-[13px] text-content-heading leading-relaxed">{b.body}</div>
          </div>
        ))}
      </div>
      <SoDesign items={kyc.so_design} />
    </Section>
  );
}

function ProductContextSectionBlock({ deck }: { deck: DiscoveryDeckV4 }) {
  const pc = deck.product_context;
  return (
    <Section
      id="product-context"
      eyebrow="02 · The product"
      title="What we're building"
      reframe={
        <>
          A short read of the product and where, exactly, this engagement&apos;s design work lives.{" "}
          <b>Surfaces marked IN SCOPE are what we&apos;re here to design.</b> The rest is FYI context.
        </>
      }
    >
      <div className="rounded-[8px] px-4 py-3.5 bg-white border border-divider/40 mb-3">
        <div
          className="text-sm italic leading-relaxed text-content-heading"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          {pc.definition}
        </div>
        {pc.is_is_not && (
          <div className="text-[11px] text-content-muted mt-2">{pc.is_is_not}</div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {pc.surfaces.map((s, i) => (
          <div
            key={i}
            className="rounded-[8px] px-4 py-3.5 bg-white"
            style={
              s.in_scope
                ? { borderLeft: `4px solid ${ACCENT}`, background: ACCENT_TINT, border: "0.5px solid transparent", borderLeftWidth: 4, borderLeftColor: ACCENT }
                : { border: "0.5px solid #ececea" }
            }
          >
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: s.in_scope ? ACCENT : "#6b6b6b" }}>
              {s.label}
              {s.in_scope ? <InScopeBadge /> : <FyiTag />}
            </div>
            <ul className="text-xs text-content-heading leading-relaxed">
              {s.items.map((it, j) => (
                <li key={j} className="py-1 border-b border-dashed border-divider/40 last:border-0">
                  <b className="font-medium" style={{ color: ACCENT }}>{it.name}</b>
                  {" — "}
                  <span className="text-content-secondary">{it.role}</span>
                </li>
              ))}
            </ul>
            {s.in_scope && (
              <div
                className="mt-2 px-3 py-2 rounded-r-md text-[11px] italic text-content-heading leading-relaxed"
                style={{ background: "#fff", borderLeft: `3px solid ${ACCENT}` }}
              >
                This is what we&apos;re here to design. The rest of the map is FYI.
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function CategoryInsightsSection({ deck }: { deck: DiscoveryDeckV4 }) {
  return (
    <Section
      id="category-insights"
      eyebrow="03 · Category insights"
      title="Five reads on where the category is going"
      reframe={
        <>
          Each insight has a quick &ldquo;<b>Could mean</b>&rdquo; block — alternative reads of what the evidence might
          point to, without picking one.
        </>
      }
    >
      <div className="space-y-2.5">
        {deck.category_insights.map((ci) => (
          <div key={ci.id} className="rounded-[8px] px-4 py-3.5 bg-white border border-divider/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <IdChip id={ci.id} />
              <span className="text-[9px] uppercase tracking-[0.06em] text-content-muted">{ci.label}</span>
              {ci.contradicts_convention && (
                <span
                  className="text-[8px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-sm"
                  style={{ color: ACCENT, border: `0.5px dashed ${ACCENT}` }}
                >
                  Goes against the grain
                </span>
              )}
            </div>
            <div className="text-[13px] text-content-heading leading-relaxed mb-1.5">{ci.statement}</div>
            {ci.evidence && <div className="text-[11px] text-content-muted mb-2">Evidence: {ci.evidence}</div>}
            {ci.could_mean?.length ? (
              <div
                className="text-[11px] italic text-content-heading leading-relaxed rounded-r-md px-3 py-2"
                style={{ background: "#fafaf7", borderLeft: "2px solid #c8c8c4" }}
              >
                <b className="not-italic font-semibold mr-1" style={{ color: ACCENT }}>Could mean:</b>
                {ci.could_mean.join(" — or — ")}
              </div>
            ) : null}
            <InScopeCallout text={ci.on_in_scope} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function AudienceSetSection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.audience_set?.length) return null;
  return (
    <Section
      id="audience-set"
      eyebrow="04 · Audience set"
      title="Role-types"
      reframe="A 2×2 matrix on transacts × uses-the-product. Four role-types."
    >
      <div className="grid grid-cols-2 gap-2.5">
        {deck.audience_set.map((r, i) => (
          <div key={i} className="rounded-[8px] px-4 py-3.5 bg-white border border-divider/40">
            <div className="text-[11px] font-semibold mb-1" style={{ color: ACCENT }}>{r.title}</div>
            <div className="text-[12px] text-content-heading leading-relaxed">{r.description}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function JourneyGridSection({ deck }: { deck: DiscoveryDeckV4 }) {
  const jg = deck.journey_grid;
  if (!jg?.modules?.length) return null;
  const intensityGlyph = (n: number) => {
    if (n >= 3) return "●●●";
    if (n === 2) return "●●";
    if (n === 1) return "●";
    if (n === 0) return "·";
    return "○";
  };
  return (
    <Section
      id="journey-grid"
      eyebrow="05 · Customer journey"
      title="Personas × user-facing modules"
      reframe="Cells show engagement intensity. ENTRY badge on each persona's primary entry surface; DROP on known friction. The in-scope column is highlighted."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr>
              <th className="text-left px-2 py-2 text-content-muted text-[9px] uppercase tracking-[0.06em] font-semibold border-b border-divider/40">
                Persona
              </th>
              {jg.modules.map((m, i) => (
                <th
                  key={i}
                  className="text-left px-2 py-2 text-[9px] uppercase tracking-[0.06em] font-semibold border-b border-divider/40"
                  style={i === jg.in_scope_module_index ? { color: ACCENT, background: ACCENT_TINT } : { color: "#6b6b6b" }}
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jg.rows.map((row, ri) => (
              <tr key={ri}>
                <td className="px-2 py-2 text-content-heading font-medium border-b border-dashed border-divider/40">
                  {row.persona}
                </td>
                {row.cells.map((c, ci) => (
                  <td
                    key={ci}
                    className="px-2 py-2 border-b border-dashed border-divider/40"
                    style={ci === jg.in_scope_module_index ? { background: ACCENT_TINT } : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: c.intensity > 0 ? ACCENT : "#9a9a9a" }}>
                        {intensityGlyph(c.intensity)}
                      </span>
                      {c.entry && (
                        <span className="text-[8px] font-semibold rounded-sm px-1" style={{ color: "#fff", background: ACCENT }}>
                          ENTRY
                        </span>
                      )}
                      {c.drop && (
                        <span className="text-[8px] font-semibold rounded-sm px-1 text-content-muted bg-surface-page-alt">
                          DROP
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SoDesign items={jg.so_design} />
    </Section>
  );
}

function BehaviourInsightsSection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.behaviour_insights?.length) return null;
  return (
    <Section
      id="behaviour-insights"
      eyebrow="06 · Behaviour insights"
      title="What trips each persona up"
    >
      <div className="space-y-2.5">
        {deck.behaviour_insights.map((b) => (
          <div key={b.id} className="rounded-[8px] px-4 py-3.5 bg-white border border-divider/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <IdChip id={b.id} />
              <span className="text-[12px] font-medium text-content-heading">{b.persona}</span>
            </div>
            <div className="text-[12px] text-content-secondary leading-relaxed mb-2">{b.frictions}</div>
            {b.could_mean?.length ? (
              <div
                className="text-[11px] italic text-content-heading leading-relaxed rounded-r-md px-3 py-2 mb-2"
                style={{ background: "#fafaf7", borderLeft: "2px solid #c8c8c4" }}
              >
                <b className="not-italic font-semibold mr-1" style={{ color: ACCENT }}>Could mean:</b>
                {b.could_mean.join(" — or — ")}
              </div>
            ) : null}
            {b.benchmark && (
              <div className="text-[11px] text-content-muted">Benchmark: {b.benchmark}</div>
            )}
            <InScopeCallout text={b.on_in_scope} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function VocCardItem({ card }: { card: VocCard }) {
  const catLabel: Record<VocCard["category"], string> = {
    ui_ux: "UI / UX",
    product_ia: "Product / IA",
    content: "Content",
    trust: "Trust",
    service: "Service",
  };
  return (
    <div className="rounded-[8px] px-3.5 py-3 bg-white border border-divider/40">
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <IdChip id={card.id} />
        <span className="text-[9px] font-mono text-content-muted bg-surface-page-alt px-1.5 py-0.5 rounded-sm border border-divider/40">
          {card.source}
        </span>
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-sm"
          style={{ color: ACCENT, background: ACCENT_TINT }}
        >
          {catLabel[card.category]}
        </span>
        <span className="text-[9px] text-content-muted ml-auto">{card.target}</span>
        {card.client_benchmark && <ClientBenchmarkChip />}
      </div>
      <div
        className="text-[12px] italic text-content-heading leading-relaxed rounded-r-md px-2.5 py-1.5 mb-1.5"
        style={{ background: "#fafaf7", borderLeft: "2px solid #c8c8c4" }}
      >
        &ldquo;{card.quote}&rdquo;
      </div>
      <div className="text-[11px] text-content-heading leading-relaxed mb-1.5">{card.summary}</div>
      <div className="text-[9px] italic text-content-muted">Frequency: {card.frequency}</div>
    </div>
  );
}

function VocSection({ deck }: { deck: DiscoveryDeckV4 }) {
  const voc = deck.voice_of_customer;
  if (!voc || (!voc.category_complaints?.length && !voc.competitor_complaints?.length && !voc.client_complaints?.length)) {
    return null;
  }
  return (
    <Section
      id="voice-of-customer"
      eyebrow="07 · Voice of customer"
      title="What people actually complain about"
      reframe={
        <>
          A web-search pass over app store reviews, Reddit, forums, Trustpilot and Google reviews — filtered to
          design-relevant complaints only.
        </>
      }
    >
      {voc.category_complaints?.length ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-2">
            Category-level complaints
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {voc.category_complaints.map((c, i) => (
              <VocCardItem key={i} card={c} />
            ))}
          </div>
        </>
      ) : null}
      {voc.competitor_complaints?.length ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-2">
            Competitor complaints
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {voc.competitor_complaints.map((c, i) => (
              <VocCardItem key={i} card={c} />
            ))}
          </div>
        </>
      ) : null}
      {voc.client_complaints?.length ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-2">
            Client complaints
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {voc.client_complaints.map((c, i) => (
              <VocCardItem key={i} card={c} />
            ))}
          </div>
        </>
      ) : null}
      <SoDesign items={voc.so_design} />
    </Section>
  );
}

function CompetitorItem({ c }: { c: CompetitorCard }) {
  return (
    <div className="rounded-[10px] px-4 py-3.5 bg-white border border-divider/40 mb-2">
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className="text-[13px] font-semibold text-content-heading">{c.name}</span>
        <span className="text-[9px] bg-surface-page-alt rounded-sm px-1.5 py-0.5 text-content-muted">{c.country}</span>
        {c.client_benchmark && <ClientBenchmarkChip />}
      </div>
      <div className="text-[11px] text-content-heading leading-relaxed mb-1">
        <b className="text-[9px] uppercase tracking-[0.06em] mr-1.5" style={{ color: ACCENT }}>Best at</b>
        {c.best_at}
      </div>
      <div className="text-[11px] text-content-heading leading-relaxed mb-1">
        <b className="text-[9px] uppercase tracking-[0.06em] mr-1.5" style={{ color: ACCENT }}>Weakest at</b>
        {c.weakest_at}
      </div>
      <div className="text-[11px] text-content-heading leading-relaxed">
        <b className="text-[9px] uppercase tracking-[0.06em] mr-1.5" style={{ color: ACCENT }}>What to steal</b>
        {c.what_to_steal}
      </div>
    </div>
  );
}

function CompetitorSetSection({ deck }: { deck: DiscoveryDeckV4 }) {
  const cs = deck.competitor_set;
  if (!cs?.cards?.length) return null;
  const direct = cs.cards.filter((c) => c.cluster === "direct_local");
  const global = cs.cards.filter((c) => c.cluster === "global_anchor");
  return (
    <Section
      id="competitor-set"
      eyebrow="08 · Who's in the picture"
      title="Competitors · including client benchmarks"
      reframe="Best at / Weakest at / What to steal — per competitor. Client-named benchmarks are tagged inline."
    >
      {direct.length ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-2 mt-2">
            Direct
          </div>
          {direct.map((c, i) => (
            <CompetitorItem key={i} c={c} />
          ))}
        </>
      ) : null}
      {global.length ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-2 mt-4">
            Global anchors
          </div>
          {global.map((c, i) => (
            <CompetitorItem key={i} c={c} />
          ))}
        </>
      ) : null}
      <SoDesign items={cs.so_design} />
    </Section>
  );
}

function CompetitiveDimensionsSection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.competitive_dimensions?.length) return null;
  return (
    <Section
      id="competitive-dimensions"
      eyebrow="09 · Competitive dimensions"
      title="Where the design lever is"
    >
      <div className="space-y-3">
        {deck.competitive_dimensions.map((d) => (
          <div key={d.id} className="rounded-[8px] px-4 py-3.5 bg-white border border-divider/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <IdChip id={d.id} />
              <span
                className="text-[12px] italic text-content-heading"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                {d.gap_statement}
              </span>
            </div>
            {d.local_pattern?.length ? (
              <div className="text-[11px] text-content-heading leading-relaxed mb-1">
                <b className="text-[9px] uppercase tracking-[0.06em] mr-1.5" style={{ color: ACCENT }}>Local pattern</b>
                {d.local_pattern.map((lp, i) => (
                  <span key={i} className="mr-1.5">
                    <IdChip id={lp.id} />
                    {lp.text}
                  </span>
                ))}
              </div>
            ) : null}
            {d.cross_category?.length ? (
              <div className="text-[11px] text-content-heading leading-relaxed mb-1">
                <b className="text-[9px] uppercase tracking-[0.06em] mr-1.5" style={{ color: ACCENT }}>Cross-category</b>
                {d.cross_category.map((cc, i) => (
                  <span key={i} className="mr-1.5">
                    <IdChip id={cc.id} />
                    {cc.text}
                  </span>
                ))}
              </div>
            ) : null}
            {d.audience_impact && (
              <div className="text-[11px] text-content-muted">Audience impact: {d.audience_impact}</div>
            )}
            <InScopeCallout text={d.on_in_scope} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function HeatmapCellGlyph({ cell }: { cell: FeatureHeatmapCell }) {
  if (cell.status === "strong") return <span style={{ color: "#15803d" }}>●</span>;
  if (cell.status === "basic") return <span style={{ color: "#a16207" }}>◐</span>;
  return <span style={{ color: "#9a9a9a" }}>○</span>;
}

function FeatureHeatmapSection({ deck }: { deck: DiscoveryDeckV4 }) {
  const fh = deck.feature_heatmap;
  if (!fh?.features?.length) return null;
  const localCount = fh.local_brands?.length || 0;
  return (
    <Section
      id="feature-heatmap"
      eyebrow="10 · Feature heatmap"
      title="Local vs global, with the target column"
      reframe="A single grid. The dashed line separates local from global. The target column is highlighted."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr>
              <th className="text-left px-2 py-2 text-[9px] uppercase tracking-[0.06em] text-content-muted font-semibold border-b border-divider/40">
                Feature
              </th>
              {fh.local_brands.map((b, i) => (
                <th
                  key={i}
                  className="text-left px-2 py-2 text-[9px] uppercase tracking-[0.06em] text-content-muted font-semibold border-b border-divider/40"
                  style={i === localCount - 1 ? { borderRight: "1px dashed #c8c8c4" } : undefined}
                >
                  {b}
                </th>
              ))}
              {fh.global_brands.map((b, i) => (
                <th
                  key={i}
                  className="text-left px-2 py-2 text-[9px] uppercase tracking-[0.06em] text-content-muted font-semibold border-b border-divider/40"
                >
                  {b}
                </th>
              ))}
              <th
                className="text-left px-2 py-2 text-[9px] uppercase tracking-[0.06em] font-semibold border-b border-divider/40"
                style={{ color: ACCENT, borderLeft: `3px solid ${ACCENT}`, background: ACCENT_TINT }}
              >
                {fh.target_column}
              </th>
            </tr>
          </thead>
          <tbody>
            {fh.features.map((feat, ri) => (
              <tr key={ri}>
                <td className="px-2 py-2 text-content-heading border-b border-dashed border-divider/40">{feat}</td>
                {(fh.rows[ri] || []).map((cell, ci) => {
                  const isLastLocal = ci === localCount - 1;
                  const isTarget = ci === (fh.rows[ri] || []).length - 1;
                  return (
                    <td
                      key={ci}
                      className="px-2 py-2 border-b border-dashed border-divider/40"
                      style={{
                        ...(isLastLocal ? { borderRight: "1px dashed #c8c8c4" } : {}),
                        ...(isTarget ? { borderLeft: `3px solid ${ACCENT}`, background: ACCENT_TINT } : {}),
                      }}
                    >
                      <HeatmapCellGlyph cell={cell} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fh.read && (
        <div
          className="mt-3 text-[12px] text-content-heading leading-relaxed rounded-r-md px-3 py-2"
          style={{ background: ACCENT_TINT, borderLeft: `3px solid ${ACCENT}` }}
        >
          <b className="font-semibold mr-1.5" style={{ color: ACCENT }}>Read:</b>
          {fh.read}
        </div>
      )}
      <SoDesign items={fh.so_design} />
    </Section>
  );
}

function PositioningDotGlyph({ d }: { d: PositioningDot }) {
  const color =
    d.kind === "target"
      ? ACCENT
      : d.kind === "client_benchmark"
      ? "#fff"
      : d.kind === "global"
      ? "#9a9a9a"
      : "#1a1a1a";
  const stroke = d.kind === "client_benchmark" ? ACCENT : "none";
  const strokeDash = d.kind === "global" ? "3,2" : "";
  return (
    <g transform={`translate(${d.x * 4 + 30} ${(100 - d.y) * 2 + 20})`}>
      <circle r="6" fill={color} stroke={stroke} strokeWidth={d.kind === "client_benchmark" ? 1.5 : 1} strokeDasharray={strokeDash} />
      <text x="10" y="4" fontSize="9" fill="#1a1a1a" fontFamily="Inter">
        {d.label}
      </text>
    </g>
  );
}

function PositioningMapSection({ deck }: { deck: DiscoveryDeckV4 }) {
  const pm = deck.positioning_map;
  if (!pm?.dots?.length) return null;
  return (
    <Section
      id="positioning-map"
      eyebrow="11 · Positioning map"
      title="Where the target sits"
      reframe="Direct competitors plotted; global anchors dashed; client benchmarks ringed in terracotta; target highlighted."
    >
      <div className="rounded-[8px] bg-white border border-divider/40 p-4">
        <svg viewBox="0 0 480 260" className="w-full">
          <rect x="30" y="20" width="400" height="200" fill="#fafaf7" stroke="#ececea" strokeWidth="0.5" />
          <text x="230" y="15" textAnchor="middle" fontSize="9" fontFamily="Inter" fill="#9a9a9a">
            {pm.axis_y.high}
          </text>
          <text x="230" y="235" textAnchor="middle" fontSize="9" fontFamily="Inter" fill="#9a9a9a">
            {pm.axis_y.low}
          </text>
          <text x="25" y="120" textAnchor="end" fontSize="9" fontFamily="Inter" fill="#9a9a9a">
            {pm.axis_x.low}
          </text>
          <text x="435" y="120" textAnchor="start" fontSize="9" fontFamily="Inter" fill="#9a9a9a">
            {pm.axis_x.high}
          </text>
          {pm.dots.map((d, i) => (
            <PositioningDotGlyph key={i} d={d} />
          ))}
        </svg>
      </div>
      <SoDesign items={pm.so_design} />
    </Section>
  );
}

function IdeaCardItem({ idea }: { idea: IdeaCard }) {
  return (
    <div className="rounded-[10px] px-4 py-3.5 bg-white border border-divider/40 mb-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[18px] italic"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: ACCENT }}
        >
          {idea.serial}
        </span>
        <span className="text-[13px] font-medium text-content-heading leading-snug">{idea.statement}</span>
      </div>
      {idea.whats_behind_it && (
        <div className="text-[11px] text-content-secondary leading-relaxed mb-1.5">
          <b className="text-[9px] uppercase tracking-[0.06em] mr-1.5" style={{ color: ACCENT }}>What&apos;s behind it</b>
          {idea.whats_behind_it}
        </div>
      )}
      {idea.kpi_tags?.length ? (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {idea.kpi_tags.map((k, i) => (
            <KpiChipDisplay key={i} kpi={k} />
          ))}
        </div>
      ) : null}
      {idea.audience_impact?.length ? (
        <div className="text-[10px] text-content-muted mb-1.5">
          Audience: {idea.audience_impact.join(" · ")}
        </div>
      ) : null}
      <InScopeCallout text={idea.on_in_scope} />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="text-[11px] text-content-heading rounded-md bg-surface-subtle px-2.5 py-1.5">
          <b className="text-[9px] uppercase tracking-[0.06em] mr-1" style={{ color: ACCENT }}>Possible upside</b>
          {idea.possible_upside}
        </div>
        <div className="text-[11px] text-content-heading rounded-md bg-surface-subtle px-2.5 py-1.5">
          <b className="text-[9px] uppercase tracking-[0.06em] mr-1" style={{ color: ACCENT }}>Possible cost</b>
          {idea.possible_cost}
        </div>
      </div>
      {idea.falsified_by && (
        <div className="text-[10px] italic text-content-muted mt-2">
          Falsified by: {idea.falsified_by}
        </div>
      )}
      {idea.traces?.length ? (
        <div className="text-[10px] text-content-muted mt-1">
          Traces: {idea.traces.join(", ")}
        </div>
      ) : null}
    </div>
  );
}

function IdeasSection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.ideas?.length) return null;
  return (
    <Section
      id="ideas"
      eyebrow="12 · Ideas to pressure-test"
      title="Ideas the research surfaces"
      reframe="Each idea has a KPI tag where the research supports the link, plus an in-scope callout where it lives on the surface we're designing. The team's job in kickoff is to pressure-test these."
    >
      {deck.ideas.map((idea, i) => (
        <IdeaCardItem key={i} idea={idea} />
      ))}
    </Section>
  );
}

function TensionsSection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.tensions?.length) return null;
  return (
    <Section
      id="tensions"
      eyebrow="13 · Tensions"
      title="What the team has to resolve"
      reframe="Each tension carries the lean and the counter — no false Path A / Path B."
    >
      {deck.tensions.map((t, i) => (
        <div key={i} className="rounded-[10px] px-4 py-3.5 bg-white border border-divider/40 mb-2.5">
          <div
            className="text-[16px] italic mb-1.5"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            {t.headline}
          </div>
          <div className="text-[9px] uppercase tracking-[0.06em] text-content-muted mb-2">{t.tag.replace(/_/g, " ")}</div>
          <div className="text-[12px] text-content-heading leading-relaxed mb-1.5">
            <b className="text-[9px] uppercase tracking-[0.06em] mr-1.5" style={{ color: ACCENT }}>What the research suggests</b>
            {t.research_suggests}
          </div>
          <div className="text-[12px] text-content-heading leading-relaxed mb-1.5">
            <b className="text-[9px] uppercase tracking-[0.06em] mr-1.5" style={{ color: ACCENT }}>What pulls the other way</b>
            {t.pulls_other_way}
          </div>
          {t.affects && (
            <div className="text-[11px] text-content-muted">Affects: {t.affects}</div>
          )}
        </div>
      ))}
    </Section>
  );
}

function ModuleIdeasSection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.module_ideas?.length) return null;
  return (
    <Section
      id="module-ideas"
      eyebrow="14 · Module ideas worth designing"
      title="The modules the research argues for"
      reframe="Which ones are P0 vs P1, how much effort each takes — the team makes those calls in kickoff. The chip flags modules likely to live on the in-scope surface."
    >
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-content-muted font-semibold border-b border-divider/40">
              Module
            </th>
            <th className="text-left px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-content-muted font-semibold border-b border-divider/40">
              What this module would be
            </th>
          </tr>
        </thead>
        <tbody>
          {deck.module_ideas.map((m: ModuleIdea, i) => (
            <tr key={i}>
              <td className="px-3 py-3 align-top border-b border-dashed border-divider/40 w-1/3">
                <div className="font-medium text-content-heading flex items-center gap-1.5">
                  {m.name}
                  {m.on_in_scope && <InScopeBadge />}
                </div>
                {m.descriptor && (
                  <div className="text-[10px] text-content-muted mt-0.5">{m.descriptor}</div>
                )}
              </td>
              <td className="px-3 py-3 align-top text-content-heading border-b border-dashed border-divider/40">
                {m.what_it_is}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function KpiFocusItem({ k }: { k: KpiFocusCard }) {
  return (
    <div
      className="rounded-[10px] px-4 py-3.5 bg-white mb-3"
      style={{ border: "0.5px solid #ececea", borderLeft: `3px solid ${ACCENT}` }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <IdChip id={k.id} />
        <KpiChipDisplay kpi={k.kpi} />
      </div>
      <div className="text-[14px] font-semibold text-content-heading mb-1">{k.kpi.label}</div>
      <div className="text-[11px] text-content-muted mb-3">
        {k.current_state && <span>Today: {k.current_state}. </span>}
        {k.target && (
          <span>
            <b style={{ color: ACCENT, fontWeight: 500 }}>Target: {k.target}.</b>
          </span>
        )}
      </div>
      {k.what_moves_this?.length ? (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-1.5">
            What moves this needle
          </div>
          <ul className="text-[12px] text-content-heading leading-relaxed mb-2">
            {k.what_moves_this.map((it, i) => (
              <li key={i} className="py-1 border-b border-dashed border-divider/40 last:border-0">
                {it.anchor ? (
                  <a href={`#${it.anchor}`} style={{ color: ACCENT, borderBottom: `0.5px solid ${ACCENT}` }}>
                    {it.text}
                  </a>
                ) : (
                  it.text
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {k.what_doesnt && (
        <div className="text-[11px] text-content-muted bg-surface-subtle rounded-md px-2.5 py-1.5 leading-relaxed">
          <b className="text-content-muted font-medium">What doesn&apos;t:</b> {k.what_doesnt}
        </div>
      )}
    </div>
  );
}

function KpiFocusSection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.kpi_focus?.length) return null;
  return (
    <Section
      id="kpi-focus"
      eyebrow="15 · KPI focus"
      title="Where each KPI's needle moves most"
      reframe="For each client KPI, where in the design our leverage is highest — and where it isn't."
    >
      {deck.kpi_focus.map((k, i) => (
        <KpiFocusItem key={i} k={k} />
      ))}
    </Section>
  );
}

function DelighterItem({ d }: { d: DelighterCard }) {
  const registerLabel: Record<DelighterCard["register"], string> = {
    ritual: "Ritual",
    memory: "Memory",
    social: "Social",
    earned_progress: "Earned progress",
    circular: "Circular",
  };
  return (
    <div
      className="relative rounded-[14px] px-6 py-6 mb-4 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, #fff, ${ACCENT_TINT} 100%)`,
        border: `0.5px solid ${ACCENT_BORDER}`,
      }}
    >
      <div className="absolute top-0 left-0 h-full w-[4px]" style={{ background: ACCENT }} />
      <div
        className="text-[12px] italic mb-1.5"
        style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: ACCENT, letterSpacing: "0.04em" }}
      >
        {d.id} · {registerLabel[d.register]}
      </div>
      <div
        className="text-[28px] mb-3"
        style={{ fontFamily: "'Instrument Serif', Georgia, serif", letterSpacing: "-0.01em" }}
      >
        {d.name}
      </div>
      <div
        className="text-[16px] italic leading-relaxed mb-4 px-3 py-2 rounded-r-md"
        style={{
          background: "#fff",
          borderLeft: `3px solid ${ACCENT}`,
          fontFamily: "'Instrument Serif', Georgia, serif",
        }}
      >
        {d.hook}
      </div>
      <div className="mb-3">
        <div className="text-[9px] font-semibold uppercase tracking-[0.08em] mb-1.5" style={{ color: ACCENT }}>
          What it is
        </div>
        <div className="text-[12px] text-content-heading leading-relaxed">{d.what_it_is}</div>
      </div>
      {d.mechanic?.length ? (
        <div className="mb-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.08em] mb-1.5" style={{ color: ACCENT }}>
            The mechanic
          </div>
          <ul className="text-[12px] text-content-heading leading-relaxed">
            {d.mechanic.map((m, i) => (
              <li key={i} className="py-1 pl-5 relative border-b border-dashed border-divider/40 last:border-0">
                <span className="absolute left-0 top-1 font-semibold" style={{ color: ACCENT }}>→</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.08em] mb-1.5" style={{ color: ACCENT }}>
            Why this fits the brand
          </div>
          <div className="text-[12px] text-content-heading leading-relaxed">{d.brand_fit}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.08em] mb-1.5" style={{ color: ACCENT }}>
            Why this grabs the user
          </div>
          <div className="text-[12px] text-content-heading leading-relaxed">{d.user_hook}</div>
        </div>
      </div>
      {d.borrowed_from && (
        <div
          className="text-[11px] italic text-content-muted px-3 py-2 rounded-md mb-3"
          style={{ background: "#fafaf7", border: `0.5px dashed #c8c8c4` }}
        >
          <b className="not-italic font-semibold text-[9px] uppercase tracking-[0.04em] mr-1.5" style={{ color: ACCENT }}>
            Borrowed from
          </b>
          {d.borrowed_from}
        </div>
      )}
      {d.sketch_svg && (
        <div className="bg-white border border-divider/40 rounded-md p-3.5 text-center mb-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-content-muted mb-2">
            First-look sketch
          </div>
          {/* sketch_svg comes from the model — we sanitised the JSON parse */}
          <div className="max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: d.sketch_svg }} />
        </div>
      )}
      {d.risks?.length ? (
        <div
          className="bg-surface-subtle rounded-r-md px-3 py-2"
          style={{ borderLeft: "2px solid #c8c8c4" }}
        >
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-1.5">
            Risks the team should debate
          </div>
          <ul className="text-[11px] text-content-muted leading-relaxed list-disc pl-4 space-y-0.5">
            {d.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BeyondSection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.beyond_the_brief?.length) return null;
  return (
    <Section
      id="beyond-the-brief"
      eyebrow="16 · Beyond the brief"
      title="Features that could make this unforgettable"
      reframe={
        <>
          These aren&apos;t on the v1 critical path — they&apos;re <b>provocations</b>. Each one was generated lateral-first
          (borrowed from outside the category), then traced back.
        </>
      }
    >
      {deck.beyond_the_brief.map((d, i) => (
        <DelighterItem key={i} d={d} />
      ))}
    </Section>
  );
}

function KickoffSection({ deck }: { deck: DiscoveryDeckV4 }) {
  const k = deck.kickoff;
  if (!k || (!k.questions?.length && !k.sprints?.length)) return null;
  return (
    <Section
      id="kickoff"
      eyebrow="17 · Kickoff"
      title="Open questions and sprint sketch"
    >
      {k.questions?.length ? (
        <table className="w-full text-[12px] border-collapse mb-4">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-content-muted font-semibold border-b border-divider/40">
                Question
              </th>
              <th className="text-left px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-content-muted font-semibold border-b border-divider/40">
                Why it matters
              </th>
              <th className="text-left px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-content-muted font-semibold border-b border-divider/40">
                Owner
              </th>
            </tr>
          </thead>
          <tbody>
            {k.questions.map((q, i) => (
              <tr key={i}>
                <td className="px-3 py-2 align-top text-content-heading border-b border-dashed border-divider/40">{q.question}</td>
                <td className="px-3 py-2 align-top text-content-secondary border-b border-dashed border-divider/40">{q.why_matters}</td>
                <td className="px-3 py-2 align-top text-content-muted border-b border-dashed border-divider/40">{q.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {k.sprints?.length ? (
        <div className="flex flex-wrap gap-2">
          {k.sprints.map((s, i) => (
            <div
              key={i}
              className="rounded-md px-3 py-2 text-[11px]"
              style={{ background: ACCENT_TINT, border: `0.5px solid ${ACCENT_BORDER}` }}
            >
              <div className="text-[9px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: ACCENT }}>
                {s.label}
              </div>
              <div className="text-content-heading leading-relaxed">{s.modules.join(" · ")}</div>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function ClosingThesisSection({ deck }: { deck: DiscoveryDeckV4 }) {
  const ct = deck.closing_thesis;
  if (!ct) return null;
  return (
    <section
      id="closing-thesis"
      className="rounded-[12px] px-6 py-6 mb-10 scroll-mt-24"
      style={{
        background: `linear-gradient(180deg, ${ACCENT_TINT}, #fff)`,
        border: `0.5px solid ${ACCENT_BORDER}`,
      }}
    >
      <Eyebrow>18 · Where this lands</Eyebrow>
      <SectionTitle>The deck&apos;s lean</SectionTitle>
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-1.5">
          What this deck leans toward
        </div>
        <div className="text-[13px] text-content-heading leading-relaxed">{ct.leans_toward}</div>
        <div className="text-[11px] italic text-content-muted mt-2">This is the deck&apos;s read, not the team&apos;s call.</div>
      </div>
      {ct.research_makes_clear?.length ? (
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-1.5">
            Three things the research makes clear
          </div>
          <ul className="text-[12px] text-content-heading leading-relaxed list-decimal pl-5">
            {ct.research_makes_clear.map((s, i) => (
              <li key={i} className="py-1">{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {ct.tensions_still_live?.length ? (
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-1.5">
            Three tensions still live
          </div>
          <ul className="text-[12px] text-content-heading leading-relaxed">
            {ct.tensions_still_live.map((s, i) => (
              <li key={i} className="py-1 border-b border-dashed border-divider/40 last:border-0">→ {s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {ct.doesnt_answer && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-content-muted mb-1.5">
            One thing this deck deliberately does not answer
          </div>
          <div className="text-[12px] text-content-heading leading-relaxed">{ct.doesnt_answer}</div>
        </div>
      )}
    </section>
  );
}

function GlossarySection({ deck }: { deck: DiscoveryDeckV4 }) {
  if (!deck.glossary?.length) return null;
  return (
    <Section
      id="glossary"
      eyebrow="19 · Glossary"
      title="Platforms to explore and study"
    >
      <div className="grid grid-cols-2 gap-2.5">
        {deck.glossary.map((p, i) => (
          <div key={i} className="rounded-[8px] px-4 py-3 bg-white border border-divider/40">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[12px] font-medium text-content-heading">{p.name}</span>
              <span className="text-[9px] bg-surface-page-alt rounded-sm px-1.5 py-0.5 text-content-muted">{p.market}</span>
            </div>
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[10px]" style={{ color: ACCENT }}>
                {p.url}
              </a>
            )}
            <div className="text-[11px] text-content-secondary mt-1.5 leading-relaxed">{p.why}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─────────────────────────── SIDE NAV ───────────────────────────

const NAV_GROUPS: { actId: string; act: string; sections: { id: string; label: string }[] }[] = [
  {
    actId: "act-i",
    act: "Act I — The landscape",
    sections: [
      { id: "know-your-client", label: "Know your client" },
      { id: "product-context", label: "The product" },
      { id: "category-insights", label: "Category insights" },
    ],
  },
  {
    actId: "act-ii",
    act: "Act II — The people",
    sections: [
      { id: "audience-set", label: "Audience set" },
      { id: "journey-grid", label: "Customer journey" },
      { id: "behaviour-insights", label: "Behaviour insights" },
      { id: "voice-of-customer", label: "Voice of customer" },
    ],
  },
  {
    actId: "act-iii",
    act: "Act III — The landscape",
    sections: [
      { id: "competitor-set", label: "Competitor set" },
      { id: "competitive-dimensions", label: "Dimensions" },
      { id: "feature-heatmap", label: "Feature heatmap" },
      { id: "positioning-map", label: "Positioning map" },
    ],
  },
  {
    actId: "act-iv",
    act: "Act IV — Your turn",
    sections: [
      { id: "ideas", label: "Ideas" },
      { id: "tensions", label: "Tensions" },
      { id: "module-ideas", label: "Module ideas" },
      { id: "kpi-focus", label: "KPI focus" },
      { id: "beyond-the-brief", label: "Beyond the brief" },
      { id: "kickoff", label: "Kickoff" },
      { id: "closing-thesis", label: "Where this lands" },
      { id: "glossary", label: "Glossary" },
    ],
  },
];

function SideNav({ activeId }: { activeId: string }) {
  return (
    <nav className="text-[11px] leading-relaxed sticky top-4 self-start hidden lg:block w-44 shrink-0">
      {NAV_GROUPS.map((g) => (
        <div key={g.actId} className="mb-4">
          <a
            href={`#${g.actId}`}
            className="block font-semibold uppercase tracking-[0.06em] text-content-muted text-[9px] mb-1.5"
          >
            {g.act}
          </a>
          <ul className="space-y-1">
            {g.sections.map((s) => {
              const isActive = s.id === activeId;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block transition-colors"
                    style={
                      isActive
                        ? { color: ACCENT, fontWeight: 600 }
                        : { color: "#6b6b6b" }
                    }
                  >
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ─────────────────────────── ROOT ───────────────────────────

export function DeckV4({ deck }: { deck: DiscoveryDeckV4 }) {
  const [activeId, setActiveId] = useState<string>("know-your-client");
  const containerRef = useRef<HTMLDivElement>(null);

  // Track which section is currently in view for the side-nav active state.
  const allSectionIds = useMemo(
    () => NAV_GROUPS.flatMap((g) => g.sections.map((s) => s.id)),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observed: HTMLElement[] = [];
    for (const id of allSectionIds) {
      const el = document.getElementById(id);
      if (el) observed.push(el);
    }
    if (!observed.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75] },
    );
    for (const el of observed) obs.observe(el);
    return () => obs.disconnect();
  }, [allSectionIds]);

  return (
    <div ref={containerRef} className="flex gap-8">
      <SideNav activeId={activeId} />
      <div className="flex-1 min-w-0">
        <PastelCover title={deck.title} subtitle={deck.subtitle} />
        <HeroBanner deck={deck} />

        <ChapterCard
          id="act-i"
          numeral="I"
          title="The landscape"
          framing="Who the client is, what we're being asked to build, and how the category around it is shifting. Read this first; everything else hangs off it."
        />
        <KycSection deck={deck} />
        <ProductContextSectionBlock deck={deck} />
        <CategoryInsightsSection deck={deck} />

        <ChapterCard
          id="act-ii"
          numeral="II"
          title="The people"
          framing="Who the design has to serve, where they spend time in the product, what trips them up, and what they actually complain about online."
        />
        <AudienceSetSection deck={deck} />
        <JourneyGridSection deck={deck} />
        <BehaviourInsightsSection deck={deck} />
        <VocSection deck={deck} />

        <ChapterCard
          id="act-iii"
          numeral="III"
          title="The competitive landscape"
          framing="Who else is in this market, what they do well, where they lose, and what's worth copying — including the brands the client has named as inspiration."
        />
        <CompetitorSetSection deck={deck} />
        <CompetitiveDimensionsSection deck={deck} />
        <FeatureHeatmapSection deck={deck} />
        <PositioningMapSection deck={deck} />

        <ChapterCard
          id="act-iv"
          numeral="IV"
          title="Your turn"
          framing="Ideas to pressure-test, tensions to resolve, modules to design — and a focused read on which of these moves the KPIs the client cares about most."
        />
        <IdeasSection deck={deck} />
        <TensionsSection deck={deck} />
        <ModuleIdeasSection deck={deck} />
        <KpiFocusSection deck={deck} />
        <BeyondSection deck={deck} />
        <KickoffSection deck={deck} />
        <ClosingThesisSection deck={deck} />
        <GlossarySection deck={deck} />
      </div>
    </div>
  );
}
