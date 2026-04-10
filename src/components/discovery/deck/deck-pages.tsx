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

  // 1. Cover — overview with metrics + HumanX branding
  pages.push(
    <div key="cover">
      <div className="flex items-center gap-2.5 mb-6">
        <img src="/humanx-logo.svg" alt="" className="h-6 w-auto" />
        <span className="text-xs tracking-widest uppercase text-content-muted font-medium">Discovery Agent</span>
      </div>
      <div className="text-2xl font-medium text-content-heading mb-3 leading-snug tracking-tight">
        {d.title || "Insights Deck"}
      </div>
      <div className="text-sm text-content-secondary mb-5 leading-relaxed">
        {d.subtitle}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {(d.metrics || []).map((m, i) => (
          <div key={i} className="bg-surface-subtle rounded-lg px-3.5 py-3">
            <div className="text-xs text-content-muted mb-1">{m.label}</div>
            <div className="text-lg font-medium text-content-heading tracking-tight">{m.value}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-content-muted">Tap cards to expand. Use arrows or keyboard to navigate.</p>
    </div>
  );

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
