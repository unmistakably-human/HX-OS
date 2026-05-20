// Pattern mockups — synthetic SVGs that visually represent each design pattern
// from visual-inspiration cards. Ported 1:1 from mockupSvg() in
// signals-final/dashboard.html so the visual library stays identical.
//
// Each mockup renders a 200x150 viewBox with consistent inkpalette + an accent
// derived from the card's domain. Patterns with no specific mockup fall back
// to a generic phone frame.

import type { JSX } from "react";

const INK = "#1a1a1a";
const INK2 = "#5a5a52";
const INK3 = "#9a9a94";
const SURFACE = "#ffffff";
const SURFACE2 = "#f5f5f3";
const HAIRLINE = "#e5e5e0";

function phoneFrame(cx: number, cy: number, w: number, h: number, content: JSX.Element): JSX.Element {
  return (
    <>
      <rect className="mockup-frame" x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={10} fill={SURFACE} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
      {content}
    </>
  );
}

export function MockupSvg({ pattern, accent }: { pattern?: string; accent: string }): JSX.Element {
  let body: JSX.Element;
  switch (pattern) {
    case "live-eta-overlay":
      body = (
        <>
          <rect x={0} y={0} width={200} height={150} fill="#eaeae0" />
          <path d="M-5 95 Q 60 60, 130 80 T 210 50" stroke={HAIRLINE} strokeWidth={6} fill="none" />
          <path d="M-5 95 Q 60 60, 130 80 T 210 50" stroke="#d8d8c8" strokeWidth={2} fill="none" strokeDasharray="4 4" />
          <path d="M30 -5 Q 60 30, 50 80 T 80 160" stroke={HAIRLINE} strokeWidth={5} fill="none" />
          <circle cx={50} cy={80} r={5} fill={accent} />
          <circle cx={50} cy={80} r={11} fill={accent} opacity={0.18} />
          <circle cx={160} cy={60} r={4} fill={INK} />
          <rect x={20} y={100} width={160} height={38} rx={8} fill={SURFACE} opacity={0.92} stroke={HAIRLINE} />
          <circle cx={32} cy={119} r={7} fill={accent} opacity={0.18} />
          <circle cx={32} cy={119} r={3.5} fill={accent} />
          <rect x={46} y={110} width={44} height={5} rx={2} fill={INK} />
          <rect x={46} y={121} width={80} height={3} rx={1.5} fill={INK3} />
          <rect x={46} y={128} width={58} height={3} rx={1.5} fill={INK3} opacity={0.6} />
          <rect x={138} y={108} width={34} height={22} rx={6} fill={INK} />
          <text x={155} y={123} fontFamily="-apple-system, sans-serif" fontSize={10} fontWeight={700} fill="#fff" textAnchor="middle">8 min</text>
        </>
      );
      break;
    case "fee-disclosure":
      body = phoneFrame(
        100, 75, 120, 130,
        <>
          <rect x={46} y={20} width={60} height={4} rx={2} fill={INK} />
          <rect x={46} y={29} width={40} height={3} rx={1.5} fill={INK3} />
          {[0, 1, 2, 3].map((i) => {
            const y = 48 + i * 16;
            return (
              <g key={i}>
                <rect x={46} y={y} width={50} height={3.5} rx={1.5} fill={INK2} />
                <rect x={135} y={y} width={20} height={3.5} rx={1.5} fill={INK2} />
                {i === 2 && (
                  <>
                    <rect x={42} y={y - 4} width={118} height={12} rx={3} fill={accent} opacity={0.10} />
                    <circle cx={156} cy={y + 1} r={3} fill={accent} />
                    <text x={156} y={y + 3.5} fontFamily="sans-serif" fontSize={6} fontWeight={700} fill="#fff" textAnchor="middle">?</text>
                  </>
                )}
              </g>
            );
          })}
          <line x1={46} y1={118} x2={156} y2={118} stroke={HAIRLINE} />
          <rect x={46} y={124} width={34} height={4} rx={2} fill={INK} />
          <rect x={120} y={124} width={34} height={4} rx={2} fill={accent} />
        </>,
      );
      break;
    case "score-chip":
      body = phoneFrame(
        100, 75, 130, 130,
        <>
          <rect x={42} y={20} width={116} height={58} rx={6} fill={SURFACE2} />
          <circle cx={100} cy={49} r={14} fill={accent} opacity={0.20} />
          <rect x={48} y={86} width={42} height={14} rx={7} fill={accent} />
          <circle cx={55} cy={93} r={3} fill="#fff" />
          <rect x={62} y={91} width={22} height={4} rx={1.5} fill="#fff" />
          <rect x={48} y={106} width={74} height={4} rx={2} fill={INK} />
          <rect x={48} y={115} width={58} height={3} rx={1.5} fill={INK3} />
          <rect x={48} y={128} width={104} height={4} rx={2} fill={HAIRLINE} />
          <rect x={48} y={128} width={68} height={4} rx={2} fill={accent} />
        </>,
      );
      break;
    case "out-of-stock-substitution":
      body = phoneFrame(
        100, 75, 124, 130,
        <>
          <rect x={44} y={22} width={112} height={22} rx={6} fill={accent} opacity={0.12} />
          <circle cx={56} cy={33} r={5} fill={accent} />
          <rect x={66} y={29} width={60} height={3.5} rx={1.5} fill={INK} />
          <rect x={66} y={36} width={44} height={3} rx={1.5} fill={INK3} />
          <rect x={44} y={54} width={80} height={4} rx={2} fill={INK} />
          {[0, 1, 2].map((i) => {
            const y = 70 + i * 18;
            return (
              <g key={i}>
                <rect x={44} y={y} width={112} height={14} rx={7} fill={SURFACE2} stroke={HAIRLINE} />
                <circle cx={54} cy={y + 7} r={4} fill={accent} opacity={0.4 + i * 0.2} />
                <rect x={64} y={y + 5} width={50} height={3} rx={1.5} fill={INK2} />
                <rect x={138} y={y + 5} width={14} height={3} rx={1.5} fill={INK3} />
              </g>
            );
          })}
        </>,
      );
      break;
    case "agent-status-card":
    case "reconciliation-confidence": {
      const states = pattern === "reconciliation-confidence"
        ? [
            { c: "#15803d", l: "auto", pct: 96 },
            { c: "#d97706", l: "review", pct: 64 },
            { c: INK3, l: "no match", pct: 12 },
          ]
        : [
            { c: "#15803d", l: "active", pct: 88 },
            { c: "#d97706", l: "paused", pct: 50 },
            { c: accent, l: "blocked", pct: 22 },
          ];
      body = (
        <>
          <rect x={0} y={0} width={200} height={150} fill={SURFACE2} />
          <rect x={14} y={14} width={80} height={4} rx={2} fill={INK} />
          <rect x={14} y={22} width={48} height={3} rx={1.5} fill={INK3} />
          {states.map((s, i) => {
            const y = 36 + i * 34;
            return (
              <g key={i}>
                <rect x={14} y={y} width={172} height={28} rx={6} fill={SURFACE} stroke={HAIRLINE} />
                <circle cx={26} cy={y + 14} r={4} fill={s.c} />
                <rect x={36} y={y + 8} width={56} height={3.5} rx={1.5} fill={INK} />
                <rect x={36} y={y + 16} width={40} height={3} rx={1.5} fill={INK3} />
                <rect x={106} y={y + 12} width={60} height={4} rx={2} fill={HAIRLINE} />
                <rect x={106} y={y + 12} width={(60 * s.pct) / 100} height={4} rx={2} fill={s.c} />
                <text x={170} y={y + 16} fontFamily="sans-serif" fontSize={7} fontWeight={700} fill={s.c}>{s.pct}%</text>
              </g>
            );
          })}
        </>
      );
      break;
    }
    case "credit-decision-inline":
      body = (
        <>
          <rect x={0} y={0} width={200} height={150} fill={SURFACE2} />
          <rect x={14} y={36} width={172} height={110} rx={14} fill={SURFACE} stroke={HAIRLINE} />
          <rect x={92} y={42} width={16} height={2.5} rx={1.25} fill={HAIRLINE} />
          <rect x={26} y={56} width={60} height={4} rx={2} fill={INK} />
          <rect x={26} y={65} width={40} height={3} rx={1.5} fill={INK3} />
          <rect x={26} y={80} width={148} height={32} rx={7} fill={accent} opacity={0.08} stroke={accent} />
          <rect x={34} y={87} width={14} height={14} rx={3} fill={accent} />
          <rect x={54} y={88} width={56} height={3.5} rx={1.5} fill={INK} />
          <rect x={54} y={97} width={40} height={3} rx={1.5} fill={accent} />
          <rect x={138} y={92} width={28} height={6} rx={3} fill={accent} />
          <rect x={26} y={120} width={148} height={18} rx={9} fill={INK} />
          <rect x={86} y={127} width={28} height={4} rx={2} fill="#fff" />
        </>
      );
      break;
    case "empty-state-b2b":
      body = (
        <>
          <rect x={0} y={0} width={200} height={150} fill={SURFACE} />
          <circle cx={100} cy={62} r={32} fill={accent} opacity={0.10} />
          <rect x={84} y={48} width={32} height={22} rx={3} fill={accent} opacity={0.5} />
          <line x1={84} y1={58} x2={116} y2={58} stroke="#fff" strokeWidth={1.5} />
          <rect x={60} y={100} width={80} height={4} rx={2} fill={INK} />
          <rect x={48} y={111} width={104} height={3} rx={1.5} fill={INK3} />
          <rect x={56} y={120} width={88} height={3} rx={1.5} fill={INK3} />
          <rect x={76} y={132} width={48} height={12} rx={6} fill={accent} />
        </>
      );
      break;
    case "scent-discovery":
      body = phoneFrame(
        100, 75, 130, 130,
        <>
          <text x={100} y={29} fontFamily="serif" fontSize={9} fill={INK} textAnchor="middle" fontStyle="italic">Find your scent</text>
          <circle cx={86} cy={38} r={2.5} fill={accent} />
          <circle cx={100} cy={38} r={2.5} fill={accent} />
          <circle cx={114} cy={38} r={2.5} fill={HAIRLINE} />
          <rect x={92} y={48} width={16} height={22} rx={2} fill={accent} opacity={0.18} />
          <rect x={96} y={44} width={8} height={6} rx={1} fill={accent} opacity={0.4} />
          {[0, 1, 2].map((i) => {
            const y = 78 + i * 16;
            const sel = i === 1;
            return (
              <g key={i}>
                <rect x={44} y={y} width={112} height={12} rx={6} fill={sel ? accent : SURFACE2} stroke={sel ? accent : HAIRLINE} />
                <rect x={56} y={y + 4.5} width={54 - i * 6} height={3} rx={1.5} fill={sel ? "#fff" : INK2} />
              </g>
            );
          })}
          <rect x={68} y={130} width={64} height={12} rx={6} fill={INK} />
          <rect x={84} y={135} width={32} height={3} rx={1.5} fill="#fff" />
        </>,
      );
      break;
    case "editorial-pdp":
      body = phoneFrame(
        100, 75, 130, 130,
        <>
          <text x={100} y={32} fontFamily="serif" fontSize={12} fontWeight={400} fill={INK} textAnchor="middle" fontStyle="italic">Aesop</text>
          <rect x={46} y={40} width={108} height={3} rx={1.5} fill={INK} />
          <rect x={56} y={50} width={88} height={46} rx={2} fill={SURFACE2} />
          <rect x={86} y={60} width={28} height={30} rx={1} fill={accent} opacity={0.6} />
          <rect x={46} y={104} width={108} height={2.5} rx={1.25} fill={INK2} />
          <rect x={46} y={111} width={100} height={2.5} rx={1.25} fill={INK2} />
          <rect x={46} y={118} width={104} height={2.5} rx={1.25} fill={INK2} />
          <rect x={46} y={125} width={58} height={2.5} rx={1.25} fill={INK3} />
          <rect x={46} y={135} width={36} height={3} rx={1.5} fill={accent} />
        </>,
      );
      break;
    case "quick-replenish":
      body = phoneFrame(
        100, 75, 130, 130,
        <>
          <rect x={46} y={22} width={50} height={4} rx={2} fill={INK} />
          <rect x={46} y={30} width={32} height={3} rx={1.5} fill={INK3} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => {
              const x = 46 + c * 36;
              const y = 42 + r * 32;
              const filled = (r + c) % 2 === 0;
              return (
                <g key={`${r}-${c}`}>
                  <rect x={x} y={y} width={30} height={26} rx={4} fill={filled ? accent : SURFACE2} opacity={filled ? 0.18 : 1} />
                  <rect x={x + 4} y={y + 18} width={20} height={2} rx={1} fill={INK2} />
                </g>
              );
            }),
          )}
        </>,
      );
      break;
    case "ar-tryOn":
      body = phoneFrame(
        100, 75, 124, 130,
        <>
          <rect x={44} y={22} width={112} height={78} rx={6} fill={INK} />
          <circle cx={100} cy={58} r={22} fill={SURFACE2} opacity={0.30} />
          <ellipse cx={92} cy={56} rx={2} ry={3} fill="#fff" opacity={0.5} />
          <ellipse cx={108} cy={56} rx={2} ry={3} fill="#fff" opacity={0.5} />
          <path d="M93 70 Q 100 76, 107 70" stroke={accent} strokeWidth={3} fill="none" strokeLinecap="round" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = 50 + i * 18;
            const sel = i === 3;
            return (
              <g key={i}>
                <circle cx={x} cy={118} r={sel ? 8 : 6} fill={accent} opacity={0.30 + i * 0.10} />
                {sel && <circle cx={x} cy={118} r={9} fill="none" stroke={INK} strokeWidth={1.5} />}
              </g>
            );
          })}
          <rect x={50} y={134} width={108} height={2} rx={1} fill={HAIRLINE} />
          <circle cx={104} cy={135} r={3} fill={accent} />
        </>,
      );
      break;
    case "tab-bar-evolution":
      body = phoneFrame(
        100, 75, 130, 130,
        <>
          <rect x={46} y={22} width={40} height={3} rx={1.5} fill={INK} />
          <rect x={46} y={29} width={60} height={3} rx={1.5} fill={INK3} />
          <rect x={46} y={40} width={108} height={62} rx={4} fill={SURFACE2} />
          <circle cx={100} cy={71} r={14} fill={accent} opacity={0.12} />
          <rect x={44} y={118} width={112} height={20} rx={10} fill={SURFACE} stroke={HAIRLINE} />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={54 + i * 22} cy={128} r={3} fill={i === 0 ? accent : INK3} />
          ))}
          <circle cx={146} cy={128} r={6} fill={accent} />
          <line x1={143} y1={128} x2={149} y2={128} stroke="#fff" strokeWidth={1.5} />
          <line x1={146} y1={125} x2={146} y2={131} stroke="#fff" strokeWidth={1.5} />
        </>,
      );
      break;
    case "onboarding-tone-of-voice":
      body = (
        <>
          <rect x={0} y={0} width={200} height={150} fill={SURFACE} />
          <rect x={16} y={20} width={78} height={116} rx={8} fill={SURFACE} stroke={HAIRLINE} />
          <rect x={24} y={36} width={50} height={3} rx={1.5} fill={INK} />
          <rect x={24} y={44} width={62} height={2.5} rx={1.25} fill={INK3} />
          <rect x={24} y={56} width={62} height={2.5} rx={1.25} fill={INK3} />
          <rect x={24} y={64} width={40} height={2.5} rx={1.25} fill={INK3} />
          <rect x={38} y={116} width={34} height={10} rx={5} fill={INK} />
          <rect x={106} y={20} width={78} height={116} rx={8} fill={accent} opacity={0.06} />
          <rect x={106} y={20} width={78} height={116} rx={8} fill="none" stroke={accent} />
          <text x={116} y={42} fontFamily="serif" fontSize={9} fontWeight={400} fill={INK} fontStyle="italic">Hello</text>
          <rect x={114} y={50} width={60} height={2.5} rx={1.25} fill={INK2} />
          <rect x={114} y={58} width={56} height={2.5} rx={1.25} fill={INK2} />
          <rect x={128} y={116} width={34} height={10} rx={5} fill={accent} />
        </>
      );
      break;
    default:
      body = phoneFrame(
        100, 75, 124, 130,
        <>
          <rect x={46} y={22} width={48} height={4} rx={2} fill={INK} />
          <rect x={46} y={30} width={32} height={3} rx={1.5} fill={INK3} />
          <rect x={46} y={42} width={108} height={40} rx={4} fill={SURFACE2} />
          <circle cx={100} cy={62} r={10} fill={accent} opacity={0.4} />
          <rect x={46} y={92} width={108} height={3} rx={1.5} fill={INK2} />
          <rect x={46} y={100} width={80} height={3} rx={1.5} fill={INK3} />
          <rect x={46} y={120} width={48} height={14} rx={7} fill={accent} />
        </>,
      );
  }
  return (
    <svg className="mockup" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">
      {body}
    </svg>
  );
}
