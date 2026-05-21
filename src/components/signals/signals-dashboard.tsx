"use client";

// Top-level Signals dashboard. This replaces the old SignalFeed component.
//
// Composition:
//   <SignalsProvider>
//     <div className="signals-root">
//       <Masthead />
//       <DomainNav />
//       <GlassNav />
//       <main className="main-grid">
//         <ThreadsBriefing />
//         <BentoHero />
//         <LeaderTweetsSection />
//         <CompetitorsSection />
//         <DomainSignalsSection />
//         <CommunitySection />
//         <VisualInspirationSection />
//         <BriefSection />
//         <ClosingSection />
//       </main>
//     </div>
//     <Drawer />
//     <RunLogPopover />
//     <SectionView />
//   </SignalsProvider>

import "./signals.css";
import { useEffect, useRef } from "react";
import type { DashboardPayload, MetaConfig } from "@/lib/signals/types";
import { SignalsProvider, useSignals } from "./context";
import { Masthead } from "./masthead";
import { DomainNav } from "./domain-nav";
import { GlassNav } from "./glass-nav";
import { BentoHero } from "./bento-hero";
import {
  BriefSection,
  ClosingSection,
  CommunitySection,
  CompetitorsSection,
  DomainSignalsSection,
  LeaderTweetsSection,
  ThreadsBriefing,
  VisualInspirationSection,
} from "./sections";
import { Drawer } from "./drawer";
import { RunLogPopover } from "./run-log-popover";
import { SectionView } from "./section-view";

function DomainTintEffect({ meta }: { meta: MetaConfig }) {
  const { activeTab } = useSignals();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    rootRef.current = document.querySelector(".signals-root");
    const el = rootRef.current;
    if (!el) return;
    const isClient = activeTab && activeTab !== "all" && activeTab !== "cross";
    if (isClient) {
      const client = meta.clients.find((c) => c.id === activeTab);
      if (client) {
        const h = client.color.replace("#", "");
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        const mix = (v: number) => Math.round(v + (255 - v) * 0.96);
        el.style.setProperty("--domain-tint", client.color);
        el.style.background = `rgb(${mix(r)},${mix(g)},${mix(b)})`;
        el.setAttribute("data-domain-tint", activeTab);
        return;
      }
    }
    el.style.removeProperty("--domain-tint");
    el.style.background = "";
    el.removeAttribute("data-domain-tint");
  }, [activeTab, meta.clients]);

  return null;
}

function DashboardBody({ meta }: { meta: MetaConfig }) {
  const heroSkip = new Set<string>();
  return (
    <main className="main-grid">
      <ThreadsBriefing />
      <BentoHero clients={meta.clients} heroSkip={heroSkip} />
      <LeaderTweetsSection meta={meta} heroSkip={heroSkip} />
      <CompetitorsSection clients={meta.clients} meta={meta} heroSkip={heroSkip} />
      <DomainSignalsSection clients={meta.clients} meta={meta} heroSkip={heroSkip} />
      <CommunitySection clients={meta.clients} meta={meta} />
      <VisualInspirationSection meta={meta} />
      <BriefSection meta={meta} />
      <ClosingSection />
    </main>
  );
}

export function SignalsDashboard({ initialPayload }: { initialPayload?: DashboardPayload }) {
  return (
    <SignalsProvider initialPayload={initialPayload}>
      <SignalsBody />
    </SignalsProvider>
  );
}

function SignalsBody() {
  const { payload } = useSignals();
  return (
    <>
      <div className="signals-root">
        <Masthead meta={payload.meta} />
        <DomainNav meta={payload.meta} />
        <GlassNav />
        <DashboardBody meta={payload.meta} />
        <DomainTintEffect meta={payload.meta} />
      </div>
      <div className="signals-root-modal-host">
        <Drawer clients={payload.meta.clients} metaConfig={payload.meta} />
        <RunLogPopover meta={payload.meta} />
        <SectionView clients={payload.meta.clients} meta={payload.meta} />
      </div>
    </>
  );
}
