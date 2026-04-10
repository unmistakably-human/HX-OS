import type { ReactNode } from "react";
import type { DiscoveryDeck } from "@/lib/discovery-types";
import { ExpandableCard } from "./expandable-card";
import { Surface } from "./surface";
import { Chips } from "./chips";
import { DataTable } from "./data-table";
import { StrengthValue } from "./strength-value";
import { Pill } from "./pill";
import { DeckLabel, DeckHeading, DeckSubheading } from "./deck-typography";

function B({ children }: { children: ReactNode }) {
  return <span className="font-medium text-content-heading">{children}</span>;
}

export function buildDeckPages(data: DiscoveryDeck): ReactNode[] {
  const d = data;
  const cr = d.conversion_retention || { first_purchase: [], retention: [], takeaway: "" };
  const fb = d.feature_benchmark || { local: { brands: [], features: [] }, global: { brands: [], features: [] }, takeaway: "" };
  // Support both old { platforms, patterns } and new flat array glossary format
  const glossary = Array.isArray(d.glossary)
    ? d.glossary
    : (d.glossary as unknown as { platforms?: typeof d.glossary })?.platforms || [];

  const pages: ReactNode[] = [];

  // 1. Cover — editorial branded layout with X watermark
  pages.push(
    <div
      key="cover"
      className="relative overflow-hidden rounded-xl -mx-4"
      style={{
        minHeight: 500,
        background: "linear-gradient(135deg, #ffffff 0%, #fbf5f0 45%, #f6e6e3 100%)",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: "linear-gradient(90deg, #A8C89E 0%, #C4D4A8 100%)" }}
      />

      {/* Background X watermark */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[520px] max-h-[520px] pointer-events-none opacity-50"
        style={{
          backgroundColor: "#EFD4D4",
          WebkitMaskImage: "url(/humanx-x.svg)",
          maskImage: "url(/humanx-x.svg)",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col px-10 py-12" style={{ minHeight: 500 }}>
        {/* Top: logo + deck label */}
        <div className="flex justify-center items-center gap-3.5 mb-20">
          <img src="/humanx-logo.svg" alt="HumanX" className="h-[22px] w-auto" />
          <div className="w-px h-4 bg-black/20" />
          <span className="text-sm text-content-heading">Insights Deck</span>
        </div>

        {/* Main title + subtitle */}
        <div className="flex-1 flex flex-col justify-center text-center">
          <h1 className="text-4xl font-medium text-content-heading leading-tight mb-5 tracking-tight">
            {d.title || "Insights Deck"}
          </h1>
          <p className="text-sm text-content-secondary leading-relaxed max-w-[520px] mx-auto">
            {d.subtitle}
          </p>
        </div>
      </div>
    </div>
  );

  // 2. Overview — key metrics
  if (d.metrics && d.metrics.length > 0) {
    pages.push(
      <div key="overview">
        <DeckLabel t="Overview" />
        <DeckHeading t="Key metrics" />
        <div className="grid grid-cols-2 gap-3">
          {d.metrics.map((m, i) => (
            <div key={i} className="bg-surface-subtle rounded-lg px-4 py-3.5">
              <div className="text-xs text-content-muted mb-1">{m.label}</div>
              <div className="text-lg font-medium text-content-heading tracking-tight">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Category Insights
  pages.push(
    <div key="ci">
      <DeckLabel t="Category insights" />
      <DeckHeading t="5 insights on category evolution" />
      {(d.category_insights || []).map((x, i) => (
        <ExpandableCard key={i} label={`Insight ${x.number}`} title={x.headline}>
          <B>Evidence:</B> {x.evidence}
          <br /><br />
          <B>Implication:</B> {x.implication}
        </ExpandableCard>
      ))}
    </div>
  );

  // 3. Audience Insights
  pages.push(
    <div key="ai">
      <DeckLabel t="Audience insights" />
      <DeckHeading t="5 segments with gaps and benchmarks" />
      {(d.audience_insights || []).map((x, i) => (
        <ExpandableCard key={i} label={x.segment} title={x.headline}>
          <B>Gap:</B> {x.gap}
          <br /><br />
          <B>Benchmark:</B> {x.benchmark}
        </ExpandableCard>
      ))}
    </div>
  );

  // 4–7. UX Benchmarks (one page per attribute)
  (d.ux_benchmarks || []).forEach((x, i) => {
    pages.push(
      <div key={`ux${i}`}>
        <DeckLabel t={`UX benchmarking · ${i + 1} of ${(d.ux_benchmarks || []).length}`} />
        <DeckHeading t={x.attribute} />
        <Chips label="Dominant" items={x.dominant?.players || []} />
        <p className="text-xs text-content-secondary leading-relaxed mb-2.5">
          {x.dominant?.description}
        </p>
        <Chips label="Contrarian" items={x.contrarian?.players || []} />
        <p className="text-xs text-content-secondary leading-relaxed mb-2.5">
          {x.contrarian?.description}
        </p>
        {x.cross_category && (
          <Surface title={`Cross-category: ${x.cross_category.platform}`}>
            {x.cross_category.pattern}
          </Surface>
        )}
        {x.gap && (
          <Surface title="Underexplored space">{x.gap}</Surface>
        )}
      </div>
    );
  });

  // 8. UX Patterns to Reference (NEW)
  if (d.ux_patterns && d.ux_patterns.length > 0) {
    pages.push(
      <div key="uxpat">
        <DeckLabel t="UX patterns to reference" />
        <DeckHeading t={`${d.ux_patterns.length} patterns designers can reference from best-in-class`} />
        {d.ux_patterns.map((p, i) => (
          <ExpandableCard key={i} label={p.name} title={`Best: ${p.example}`}>
            <B>How it works:</B> {p.how}
            <br /><br />
            <B>Applicability:</B> {p.applicability}
          </ExpandableCard>
        ))}
      </div>
    );
  }

  // 9. Feature Benchmark
  pages.push(
    <div key="fb">
      <DeckLabel t="Feature benchmark" />
      <DeckHeading t="Key features: local vs. global" />
      <DeckSubheading t="Local brands" />
      <DataTable
        heads={["Feature", ...(fb.local?.brands || [])]}
        rows={(fb.local?.features || []).map((f) => [
          f.name,
          ...f.values.map((v, i) => <StrengthValue key={i} value={v} />),
        ])}
      />
      <DeckSubheading t="Global brands" />
      <DataTable
        heads={["Feature", ...(fb.global?.brands || [])]}
        rows={(fb.global?.features || []).map((f) => [
          f.name,
          ...f.values.map((v, i) => <StrengthValue key={i} value={v} />),
        ])}
      />
      {fb.takeaway && <Surface title="Key takeaway">{fb.takeaway}</Surface>}
    </div>
  );

  // 10. Cross-Category
  pages.push(
    <div key="xc">
      <DeckLabel t="Patterns outside the category" />
      <DeckHeading t="5 cross-category references worth borrowing" />
      {(d.cross_category || []).map((x, i) => (
        <ExpandableCard key={i} label={`${x.platform} — ${x.industry}`} title={x.pattern}>
          <B>Transferable:</B> {x.transferable}
          <br /><br />
          <B>Study:</B> {x.study}
        </ExpandableCard>
      ))}
    </div>
  );

  // 11. Conversion & Retention
  pages.push(
    <div key="cr">
      <DeckLabel t="Conversion & retention" />
      <DeckHeading t="How platforms drive first purchase and retention" />
      <DeckSubheading t="First-purchase triggers" />
      <DataTable
        heads={["Platform", "Market", "Trigger"]}
        rows={(cr.first_purchase || []).map((x) => [
          x.platform,
          <Pill key="m" colorIndex={3}>{x.market}</Pill>,
          x.trigger,
        ])}
      />
      <DeckSubheading t="Post-purchase retention" />
      <DataTable
        heads={["Platform", "Mechanism", "Verdict"]}
        rows={(cr.retention || []).map((x) => [
          x.platform,
          x.mechanism,
          <span
            key="v"
            className={x.verdict === "positive" ? "text-emerald-700 font-medium" : "text-red-700 font-medium"}
          >
            {x.verdict_text}
          </span>,
        ])}
      />
      {cr.takeaway && <Surface title="Key takeaway">{cr.takeaway}</Surface>}
    </div>
  );

  // 12. Opportunity Areas
  pages.push(
    <div key="op">
      <DeckLabel t="Opportunity areas" />
      <DeckHeading t="5 opportunities ranked by impact" />
      {(d.opportunities || []).map((x, i) => (
        <Surface key={i}>
          <div className="flex gap-2.5">
            <div className="text-[24px] font-medium text-content-muted leading-none shrink-0">
              {x.rank}
            </div>
            <div>
              <div className="text-sm font-medium text-content-heading mb-1">
                {x.title}
              </div>
              <div className="text-xs text-content-secondary leading-relaxed mb-1.5">
                {x.description}{" "}
                <B>Proof:</B> {x.proof}{" "}
                <B>Risk:</B> {x.risk}
              </div>
              <div className="flex gap-1 flex-wrap">
                {(x.tags || []).map((t, ti) => (
                  <Pill key={ti} colorIndex={ti}>{t}</Pill>
                ))}
              </div>
            </div>
          </div>
        </Surface>
      ))}
    </div>
  );

  // 13. Global Glossary (single slide — platforms table)
  if (glossary.length > 0) {
    pages.push(
      <div key="gl">
        <DeckLabel t="Global glossary" />
        <DeckHeading t={`${glossary.length} platforms to explore and study`} />
        <DataTable
          heads={["Platform", "Market", "URL", "Why study it"]}
          rows={glossary.map((p) => [
            p.name,
            <Pill key="m" colorIndex={3}>{p.market}</Pill>,
            p.url,
            p.why,
          ])}
        />
      </div>
    );
  }

  return pages;
}
