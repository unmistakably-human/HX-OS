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
  return <span className="font-medium text-[#111827]">{children}</span>;
}

export function buildDeckPages(data: DiscoveryDeck): ReactNode[] {
  const d = data;
  const cr = d.conversion_retention || { first_purchase: [], retention: [], takeaway: "" };
  const fb = d.feature_benchmark || { local: { brands: [], features: [] }, global: { brands: [], features: [] }, takeaway: "" };
  const gl = d.glossary || { platforms: [], patterns: [] };

  const pages: ReactNode[] = [];

  // 1. Cover
  pages.push(
    <div key="cover">
      <DeckLabel t="Cover" />
      <div className="text-[19px] font-medium text-[#111827] mb-2.5 leading-snug">
        {d.title || "Insights Deck"}
      </div>
      <div className="text-[14px] text-[#6b7280] mb-4 leading-relaxed">
        {d.subtitle}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        {(d.metrics || []).map((m, i) => (
          <div key={i} className="bg-[#f4f4f5] rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-[#9ca3af]">{m.label}</div>
            <div className="text-[18px] font-medium text-[#111827]">{m.value}</div>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-[#9ca3af]">Tap cards to expand. Use arrows to navigate.</p>
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
        <DeckLabel t="UX benchmarking" />
        <DeckHeading t={x.attribute} />
        <Chips label="Dominant" items={x.dominant?.players || []} />
        <p className="text-[12px] text-[#6b7280] leading-relaxed mb-2.5">
          {x.dominant?.description}
        </p>
        <Chips label="Contrarian" items={x.contrarian?.players || []} />
        <p className="text-[12px] text-[#6b7280] leading-relaxed mb-2.5">
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

  // 8. Conversion & Retention
  pages.push(
    <div key="cr">
      <DeckLabel t="Conversion & retention" />
      <DeckHeading t="How competitors convert and retain" />
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

  // 9. Feature Benchmark
  pages.push(
    <div key="fb">
      <DeckLabel t="Feature benchmark: local vs. global" />
      <DeckHeading t="Key features across local and global brands" />
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
      <DeckLabel t="Cross-category inspiration" />
      <DeckHeading t="Patterns from outside the category" />
      {(d.cross_category || []).map((x, i) => (
        <ExpandableCard key={i} label={`${x.platform} — ${x.industry}`} title={x.pattern}>
          <B>Transferable:</B> {x.transferable}
          <br /><br />
          <B>Study:</B> {x.study}
        </ExpandableCard>
      ))}
    </div>
  );

  // 11. Opportunity Areas
  pages.push(
    <div key="op">
      <DeckLabel t="Opportunity areas" />
      <DeckHeading t="Ranked by impact" />
      {(d.opportunities || []).map((x, i) => (
        <Surface key={i}>
          <div className="flex gap-2.5">
            <div className="text-[24px] font-medium text-[#e5e7eb] leading-none shrink-0">
              {x.rank}
            </div>
            <div>
              <div className="text-[14px] font-medium text-[#111827] mb-1">
                {x.title}
              </div>
              <div className="text-[12px] text-[#6b7280] leading-relaxed mb-1.5">
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

  // 12. Glossary: Platforms
  pages.push(
    <div key="gp">
      <DeckLabel t="Global glossary: platforms" />
      <DeckHeading t="Platforms to explore" />
      {(gl.platforms || []).map((x, i) => (
        <ExpandableCard
          key={i}
          label={x.name}
          title={`${x.url || ""} — ${x.why || ""}`}
        >
          <B>Screenshot:</B> {x.screenshot}
        </ExpandableCard>
      ))}
    </div>
  );

  // 13. Patterns to Reference
  pages.push(
    <div key="gpa">
      <DeckLabel t="Patterns to reference" />
      <DeckHeading t="Key UX patterns" />
      <DataTable
        heads={["Pattern", "Best example", "Why"]}
        rows={(gl.patterns || []).map((p) => [p.name, p.example, p.why])}
      />
    </div>
  );

  return pages;
}
