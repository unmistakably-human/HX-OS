"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Domain data
// ---------------------------------------------------------------------------
const DOMAINS = [
  { id: "all", label: "All", color: "#1a1a1a", bg: "#f0f0eb" },
  { id: "qcom", label: "Quick Commerce", color: "#b45309", bg: "#fffbeb" },
  { id: "hni", label: "HNI Investing", color: "#6d28d9", bg: "#f5f3ff" },
  { id: "retail", label: "Retail & Kids", color: "#be185d", bg: "#fdf2f8" },
  { id: "aadhaar", label: "UIDAI Aadhaar", color: "#1d4ed8", bg: "#eff6ff" },
  { id: "cyber", label: "Cybersecurity", color: "#15803d", bg: "#f0fdf4" },
  { id: "pharmacy", label: "Pharmacy", color: "#0d9488", bg: "#ecfdf5" },
  { id: "design", label: "Design Craft", color: "#c2410c", bg: "#fff7ed" },
];

// ---------------------------------------------------------------------------
// Signal data
// ---------------------------------------------------------------------------
const signals = [
  {
    brand: "CrowdStrike / IBM",
    color: "#15803d",
    text: "Global cybersecurity spend hits $240B (+12.5% YoY). Supply chain breaches involving third parties doubled to 30%. IBM X-Force reports 136% increase in cloud intrusions.",
  },
  {
    brand: "Blinkit / Zepto",
    color: "#b45309",
    text: "Q-commerce AOV diverging \u2014 Blinkit ~\u20B9709 vs Instamart ~\u20B9619, signaling premiumization. Zepto\u2019s 10-minute pharmacy delivery points to high-margin adjacencies.",
  },
  {
    brand: "1mg / PharmEasy",
    color: "#0d9488",
    text: "AI drug interaction alerts and predictive refill models reshaping pharmacy UX. Voice-first reordering going mainstream for elderly patients via Alexa and smart speakers.",
  },
  {
    brand: "UIDAI",
    color: "#1d4ed8",
    text: "1.43 billion enrolled. Virtual ID adoption growing as a privacy-first auth pattern. Free online document updates extended to June 2026. Platform supports 12 Indian languages.",
  },
  {
    brand: "Betterment / 360 ONE",
    color: "#6d28d9",
    text: "Only 1,300 SEBI-registered advisors for 850K affluent Indians. AI platforms process 20,000+ data points per client, predicting needs 12-18 months ahead.",
  },
  {
    brand: "Figma / NN/g",
    color: "#c2410c",
    text: "Every $1 in UX returns $100. Design-led companies achieve 32% faster revenue growth. 58% of designers say Figma AI will have the biggest impact on 2026 workflow.",
  },
  {
    brand: "Hamleys / Meesho",
    color: "#be185d",
    text: "Vernacular-first design mainstream \u2014 custom Hindi, Tamil, Bengali typography at brand quality. Reliance Retail\u2019s 1,621 doors bridging experiential retail with digital.",
  },
];

// ---------------------------------------------------------------------------
// Visual inspiration data
// ---------------------------------------------------------------------------
const visualInspo = [
  {
    img: "https://cdn.dribbble.com/userupload/17948498/file/original-3f3b5bfce5db7e30c1b9d7ee8e21428a.png?resize=752x",
    title: "Pharmacy Ordering Flow",
    src: "Dribbble \u2014 Kody Technolab",
    tags: ["Mobile", "Healthcare", "Cards"],
    accent: "#0d9488",
  },
  {
    img: "https://cdn.dribbble.com/userupload/16474953/file/original-1a3e23b32f0e6be4e5b14120303b2b5d.jpg?resize=752x",
    title: "Fintech Dashboard \u2014 Dark",
    src: "Dribbble \u2014 Jesal Mistry",
    tags: ["Dashboard", "Data Viz", "Dark Mode"],
    accent: "#6d28d9",
  },
  {
    img: "https://cdn.dribbble.com/userupload/12988553/file/original-7be2d455f08ec375a6ce51e27420d7f2.png?resize=752x",
    title: "E-Commerce Product Grid",
    src: "Dribbble \u2014 Product Cards",
    tags: ["Retail", "Grid", "Cards"],
    accent: "#be185d",
  },
  {
    img: "https://cdn.dribbble.com/userupload/15013857/file/original-b3e7d4a2c5c4a8b60d6e832b93a7c5c8.png?resize=752x",
    title: "Cybersecurity SOC Dashboard",
    src: "Dribbble \u2014 Security UI",
    tags: ["Security", "Monitoring", "Real-time"],
    accent: "#15803d",
  },
  {
    img: "https://cdn.dribbble.com/userupload/17313233/file/original-0ecba9a5f8553da56c7a4da2bdab6f15.png?resize=752x",
    title: "Quick Commerce \u2014 Bento Layout",
    src: "Dribbble \u2014 Commerce UI",
    tags: ["Bento", "Mobile", "Q-Commerce"],
    accent: "#b45309",
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Tag({ domain }: { domain: string }) {
  const d = DOMAINS.find((x) => x.id === domain) || DOMAINS[0];
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap rounded-md"
      style={{ padding: "3px 10px", background: d.bg, color: d.color }}
    >
      {d.label}
    </span>
  );
}

function XLogo() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" className="fill-content-muted">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Verified() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0 ml-[3px] bg-[#1d9bf0]">
      <svg width={10} height={10} viewBox="0 0 24 24" fill="white">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    </span>
  );
}

function TweetAction({ icon, count }: { icon: "reply" | "repost" | "heart"; count: string }) {
  return (
    <span className="flex items-center gap-[5px] text-[13px] text-content-muted">
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        {icon === "reply" && (
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        )}
        {icon === "repost" && (
          <>
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </>
        )}
        {icon === "heart" && (
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        )}
      </svg>
      {count}
    </span>
  );
}

function TweetCard({
  avatar,
  avatarBg,
  name,
  handle,
  body,
  replies,
  reposts,
  likes,
  time,
}: {
  avatar: string;
  avatarBg: string;
  name: string;
  handle: string;
  body: React.ReactNode;
  replies: string;
  reposts: string;
  likes: string;
  time: string;
}) {
  return (
    <div className="bg-surface-card border border-divider rounded-2xl px-6 py-5">
      <div className="flex items-center gap-[10px] mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
          style={{ background: avatarBg }}
        >
          {avatar}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-content-heading flex items-center">
            {name}
            <Verified />
          </div>
          <div className="text-[13px] text-content-muted">{handle}</div>
        </div>
        <XLogo />
      </div>
      <div className="text-[15px] text-content-heading leading-[1.65] mb-3 whitespace-pre-line">
        {body}
      </div>
      <div className="flex items-center gap-5 pt-[10px] border-t border-divider">
        <TweetAction icon="reply" count={replies} />
        <TweetAction icon="repost" count={reposts} />
        <TweetAction icon="heart" count={likes} />
        <span className="ml-auto text-xs text-content-muted">{time}</span>
      </div>
    </div>
  );
}

function Card({
  domain,
  format,
  title,
  body,
  source,
  wide,
  full,
  children,
  quote,
}: {
  domain: string;
  format?: string;
  title?: React.ReactNode;
  body?: string;
  source?: string;
  wide?: boolean;
  full?: boolean;
  children?: React.ReactNode;
  quote?: boolean;
}) {
  return (
    <div
      className="bg-surface-card border border-divider rounded-2xl overflow-hidden"
      style={{ gridColumn: full ? "1 / -1" : wide ? "span 2" : undefined }}
    >
      <div className="px-6 pt-5 flex justify-between items-center">
        <Tag domain={domain} />
        {format && (
          <span className="text-[11px] text-content-muted tracking-[0.04em] uppercase">
            {format}
          </span>
        )}
      </div>
      <div className="px-6 pt-4 pb-6">
        {quote ? (
          <>
            <blockquote
              className="text-[22px] italic leading-[1.5] text-content-heading pl-5 border-l-[3px] border-[#d5d5d0] m-0"
              style={{ fontFamily: "'Newsreader', Georgia, serif" }}
            >
              {title}
            </blockquote>
            <p className="mt-[14px] text-[13px] text-content-secondary not-italic">{source}</p>
          </>
        ) : (
          <>
            {title && (
              <h2
                className="text-[21px] font-normal leading-[1.35] mb-[10px] tracking-[-0.01em] text-content-heading"
                style={{ fontFamily: "'Newsreader', Georgia, serif" }}
              >
                {title}
              </h2>
            )}
            {body && (
              <p className="text-sm text-content-secondary leading-[1.75] m-0">{body}</p>
            )}
            {source && (
              <p className="mt-3 text-xs text-content-muted font-mono">{source}</p>
            )}
            {children}
          </>
        )}
      </div>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-[14px] py-3"
      style={{ gridColumn: "1 / -1" }}
    >
      <hr className="flex-1 border-none border-t border-divider h-px bg-divider" />
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-content-muted whitespace-nowrap">
        {label}
      </span>
      <hr className="flex-1 border-none border-t border-divider h-px bg-divider" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------
export function SignalFeed() {
  const [activeTab, setActiveTab] = useState("all");
  const [hoveredImg, setHoveredImg] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-surface-page-alt font-sans antialiased text-content-heading">
      {/* DOMAIN NAV */}
      <nav className="bg-surface-card px-8 flex gap-1 border-b border-divider overflow-x-auto">
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveTab(d.id)}
            className={[
              "px-[18px] py-3 text-[13px] font-medium bg-transparent border-none cursor-pointer",
              "flex items-center gap-[7px] whitespace-nowrap font-sans transition-all duration-200",
              activeTab === d.id
                ? "text-content-heading border-b-2 border-content-heading"
                : "text-content-muted border-b-2 border-transparent",
            ].join(" ")}
          >
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{ background: d.color }}
            />
            {d.label}
          </button>
        ))}
      </nav>

      {/* MAIN GRID */}
      <main
        className="max-w-[1320px] mx-auto px-8 pt-7 pb-20"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}
      >
        {/* ============================================================= */}
        {/* HERO CARD                                                      */}
        {/* ============================================================= */}
        <div
          className="bg-surface-card border border-divider rounded-2xl overflow-hidden"
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
          }}
        >
          {/* Hero left */}
          <div className="p-10 pl-11 flex flex-col justify-center">
            <div className="mb-[14px]">
              <Tag domain="qcom" />
            </div>
            <h2
              className="text-[32px] font-normal leading-[1.25] mb-4 tracking-[-0.02em] text-content-heading"
              style={{ fontFamily: "'Newsreader', Georgia, serif" }}
            >
              Blinkit crosses 50% market share as{" "}
              <em className="text-[#b45309]">JioMart</em> quietly hits 1.6M daily orders
            </h2>
            <p className="text-[15px] text-content-secondary leading-[1.8]">
              India&apos;s quick commerce is a four-way race. Blinkit (Zomato) leads with
              50%+ share, but Reliance&apos;s JioMart claims 1.6M daily orders by
              repurposing 3,000 retail stores as dark stores. Zepto preps a
              &#8377;11,000&nbsp;Cr IPO despite &#8377;3,367&nbsp;Cr losses. Swiggy
              Instamart targets contribution breakeven by June&nbsp;2026.
            </p>
            <p className="mt-[14px] text-xs text-content-muted font-mono">
              Inc42 &middot; LAFFAZ &middot; GrabOn &middot; Apr 2026
            </p>
          </div>

          {/* Hero right — stats */}
          <div className="bg-surface-subtle p-10 flex flex-col justify-center border-l border-divider">
            <div className="grid grid-cols-2 gap-7">
              {[
                { n: "50%+", l: "Blinkit share" },
                { n: "1.6M", l: "JioMart orders/day" },
                { n: "\u20B911K Cr", l: "Zepto IPO size" },
                { n: "33M", l: "India Q-Com users" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div
                    className="text-[34px] font-normal leading-none"
                    style={{ fontFamily: "'Newsreader', Georgia, serif" }}
                  >
                    {s.n}
                  </div>
                  <div className="text-[11px] text-content-secondary tracking-[0.06em] uppercase mt-[6px]">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* TWEETS                                                         */}
        {/* ============================================================= */}
        <SectionDivider label="From X / Tweets" />

        <TweetCard
          avatar="A"
          avatarBg="linear-gradient(135deg,#f59e0b,#d97706)"
          name="Agency Reporter"
          handle="@agencyreporter"
          body={
            <>
              <span className="text-[#1d4ed8]">@Blinkit</span>,{" "}
              <span className="text-[#1d4ed8]">@ZeptoNow</span> &amp;{" "}
              <span className="text-[#1d4ed8]">@SwiggyInstamart</span> are no longer just
              delivery apps &mdash; they&apos;re quietly becoming some of the most
              effective ad platforms in India.
              {"\n\n"}When buying is this easy, visibility becomes that valuable.
              You&apos;re not building desire &mdash; you&apos;re meeting it halfway.
              {"\n\n"}
              <span className="text-[#1d4ed8] font-medium">
                #QuickCommerce #RetailMedia
              </span>
            </>
          }
          replies="247"
          reposts="1.2K"
          likes="4.8K"
          time="Apr 9, 2026"
        />

        <TweetCard
          avatar="K"
          avatarBg="linear-gradient(135deg,#6d28d9,#7c3aed)"
          name="Kapil Gupta"
          handle="@360ONEWealth"
          body={
            <>
              The HNI client of 2026 looks nothing like the HNI of 2016.
              {"\n\n"}At The Reserve, we offer 3 engagement models: fully managed,
              co-created, or DIY. The client chooses.
              {"\n\n"}AI won&apos;t replace wealth advisors. But advisors who use AI
              well will replace those who don&apos;t.
              {"\n\n"}Our RM workbench generates portfolio reviews in minutes, not
              hours.
            </>
          }
          replies="89"
          reposts="342"
          likes="1.1K"
          time="Feb 11, 2026"
        />

        <TweetCard
          avatar="G"
          avatarBg="linear-gradient(135deg,#1d4ed8,#3b82f6)"
          name="Gartner"
          handle="@Gartner_inc"
          body={
            <>
              Top cybersecurity trends for 2026:
              {"\n\n"}&#x1F539; Agentic AI demands cybersecurity oversight
              {"\n"}&#x1F539; Post-quantum cryptography moves into action
              {"\n"}&#x1F539; IAM must adapt to AI agents
              {"\n\n"}&ldquo;Cybersecurity leaders are navigating uncharted territory as
              AI, geopolitical tensions &amp; regulatory volatility converge&rdquo;
              {"\n\n"}
              <span className="text-[#1d4ed8] font-medium">
                #Cybersecurity #AI
              </span>
            </>
          }
          replies="512"
          reposts="2.3K"
          likes="6.7K"
          time="Feb 5, 2026"
        />

        {/* ============================================================= */}
        {/* DOMAIN SIGNALS                                                 */}
        {/* ============================================================= */}
        <SectionDivider label="Domain Signals" />

        <Card
          domain="pharmacy"
          format="Market Intel"
          title="Global digital pharmacy hits $134.9B \u2014 CVS, Walgreens, 1mg racing to own the interface"
          body="The market is growing at 17.3% CAGR toward $483B by 2032. AI chatbots auto-resolve 60-70% of patient queries. The design frontier: telepharmacy with live video, IoT-connected pill dispensers, and voice-first prescription reordering for elderly users."
          source="GlobeNewswire \u00B7 SpaceoTech \u00B7 Apr 2026"
        />

        <Card
          domain="cyber"
          format="Design Strategy"
          title="The new cybersecurity aesthetic: functional minimalism + confident neutrals"
          body="With $240B global spend, security platform design is maturing. Real product screenshots over abstract illustrations, compliance badge clusters near pricing CTAs, and architecture transparency diagrams. CrowdStrike, Vanta, and Entrust lead this visual direction."
          source="Veza Digital \u00B7 ISACA \u00B7 IBM X-Force \u00B7 2026"
        />

        <Card
          domain="hni"
          format="Product Pattern"
          title="360 ONE\u2019s Account Aggregator integration reveals held-away assets"
          body="India\u2019s UHNI count projected to jump 50% by 2028, but only 1,300 SEBI-registered advisors serve 850K affluent Indians. 360 ONE now surfaces held-away assets through Account Aggregator, transforming conversations from transactional to strategic."
          source="Hubbis \u00B7 WealthMunshi \u00B7 Windmill Digital"
        />

        {/* ============================================================= */}
        {/* VISUAL INSPIRATION                                             */}
        {/* ============================================================= */}
        <SectionDivider label="Visual Inspiration" />

        <div
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 14,
          }}
        >
          {visualInspo.map((v, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredImg(i)}
              onMouseLeave={() => setHoveredImg(null)}
              className="rounded-[14px] border border-divider overflow-hidden bg-surface-card cursor-pointer transition-all duration-300"
              style={{
                transform: hoveredImg === i ? "translateY(-4px)" : "none",
                boxShadow:
                  hoveredImg === i
                    ? "0 12px 32px rgba(0,0,0,0.1)"
                    : "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Image area */}
              <div
                className="w-full flex items-center justify-center relative overflow-hidden"
                style={{
                  aspectRatio: "4/3",
                  background: `linear-gradient(135deg, ${v.accent}18 0%, ${v.accent}08 100%)`,
                }}
              >
                <img
                  src={v.img}
                  alt={v.title}
                  className="w-full h-full object-cover transition-transform duration-400"
                  style={{
                    transform: hoveredImg === i ? "scale(1.05)" : "scale(1)",
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.parentElement;
                    if (fallback) {
                      const d = document.createElement("div");
                      d.style.cssText =
                        "display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;width:100%;gap:10px;";
                      d.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${v.accent}" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span style="font-size:11px;color:${v.accent};font-weight:600;letter-spacing:0.05em;text-transform:uppercase">${v.tags[0]} UI</span>`;
                      fallback.appendChild(d);
                    }
                  }}
                />
              </div>

              {/* Caption */}
              <div className="px-[14px] pt-3 pb-[14px]">
                <div className="text-[13px] font-semibold text-content-heading leading-[1.3] mb-[6px]">
                  {v.title}
                </div>
                <div className="text-[11px] text-content-secondary mb-2">{v.src}</div>
                <div className="flex gap-[5px] flex-wrap">
                  {v.tags.map((tag, j) => (
                    <span
                      key={j}
                      className="text-[10px] font-medium rounded tracking-[0.03em]"
                      style={{
                        color: v.accent,
                        background: `${v.accent}14`,
                        padding: "2px 8px",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ============================================================= */}
        {/* DEEP READS                                                     */}
        {/* ============================================================= */}
        <SectionDivider label="Deep Reads" />

        <Card
          domain="design"
          format="NN/g Insight"
          quote
          title={
            "\u201CUX is more than UI. In the past, that was a reminder about scope; today, it\u2019s a warning about where the value of our work is moving.\u201D"
          }
          source="\u2014 Nielsen Norman Group, State of UX 2026"
        />

        <Card
          domain="retail"
          format="Brand Intelligence"
          wide
          title="Reliance Retail\u2019s 1,621 doors: Hamleys\u2019 experiential magic meets Mothercare \u00D7 Gauri & Nainika"
          body="Reliance Brands operates 934 stores + 687 shop-in-shops. Hamleys (191 global stores, 14 countries) thrives on in-store theatre \u2014 toy demonstrators, themed installations, and live demos. Mothercare\u2019s SS26 collection with designers Gauri & Nainika bridges high fashion with children\u2019s wear. The digital challenge: translating this emotional, discovery-driven retail into e-commerce that preserves the magic."
          source="Reliance Retail \u00B7 Business Standard \u00B7 TripAdvisor"
        />

        <Card
          domain="aadhaar"
          format="Platform Update"
          title="UIDAI extends free document update till June 14 \u2014 myAadhaar now supports 12 languages"
          body="1.43 billion enrollments as of Sep 2025. The portal now offers Virtual ID generation, biometric lock/unlock, and PVC card ordering. The privacy-first Virtual ID pattern (16-digit temporary number) is worth studying for any identity system worldwide."
          source="UIDAI \u00B7 myaadhaar.uidai.gov.in"
        />

        {/* ============================================================= */}
        {/* PRODUCT DESIGN UPDATES                                         */}
        {/* ============================================================= */}
        <SectionDivider label="Product Design Updates" />

        <Card domain="design" format="Trend Report" wide title="3 design shifts defining product work in 2026">
          <div
            className="border-t border-divider mt-4"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}
          >
            {[
              {
                n: "01",
                c: "#b45309",
                t: "Sonic UX",
                d: "Sound joins the design system. Soft clicks on toggles, whooshes on completion. Spotify, Apple, and Santiago Franco\u2019s portfolio show how audio cues reduce visual saturation.",
              },
              {
                n: "02",
                c: "#0d9488",
                t: "Neobrutalism",
                d: "High contrast, thick borders, loud color. Gumroad executes this across its entire ecosystem. A deliberate counter-movement against hyper-polished AI aesthetics.",
              },
              {
                n: "03",
                c: "#be185d",
                t: "GenUI / Delegative UI",
                d: "Interfaces that generate themselves. The shift from designing screens to specifying constraints. Jakob Nielsen calls it the next great UX frontier.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-5 px-4"
                style={{
                  borderRight: i < 2 ? "1px solid var(--color-divider, #eeeeea)" : "none",
                }}
              >
                <div
                  className="text-[28px] font-normal leading-none mb-[6px]"
                  style={{
                    fontFamily: "'Newsreader', Georgia, serif",
                    color: item.c,
                  }}
                >
                  {item.n}
                </div>
                <div className="text-xs text-content-secondary leading-[1.5]">
                  <strong className="text-content-heading">{item.t}</strong> &mdash;{" "}
                  {item.d}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          domain="design"
          format="UX Tigers"
          title="The Audit Interface: designing for AI review fatigue"
          body="As AI agents execute 50-step chains, the next challenge isn\u2019t the prompt interface \u2014 it\u2019s summarizing agent logic into a glanceable confidence check. Google, Figma, and Microsoft are all grappling with this Delegative UI problem."
          source="UX Tigers \u00B7 NN/g \u00B7 Jan 2026"
        />

        {/* ============================================================= */}
        {/* RAPID FIRE                                                     */}
        {/* ============================================================= */}
        <SectionDivider label="Rapid Fire \u2014 Cross-Domain Signals" />

        <Card domain="all" full>
          <ul className="list-none p-0 m-0">
            {signals.map((s, i) => (
              <li
                key={i}
                className={[
                  "py-[14px] flex gap-3 text-sm text-content-secondary leading-[1.6]",
                  i < signals.length - 1 ? "border-b border-divider" : "",
                ].join(" ")}
              >
                <span className="font-mono text-[11px] text-content-muted min-w-[22px] pt-[3px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong style={{ color: s.color }}>{s.brand}:</strong> {s.text}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* ============================================================= */}
        {/* CLOSING                                                        */}
        {/* ============================================================= */}
        <Card
          domain="cyber"
          format="Closing Thought"
          full
          quote
          title={
            "\u201CIn 2026, organizations will be judged less by periodic assessments and more by the ability to consistently demonstrate resilience, transparency, and trust.\u201D"
          }
          source="\u2014 ISACA, 6 Cybersecurity Trends That Will Shape 2026"
        />
      </main>
    </div>
  );
}
