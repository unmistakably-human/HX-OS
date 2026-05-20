"use client";

// Floating glass section nav. Anchors map to section-divider id attributes
// (`anchor-<section-id>`). Slides in once the user scrolls past the masthead;
// auto-highlights the section the user is currently reading.

import { useEffect, useRef, useState } from "react";

const RAIL_SECTIONS = [
  { anchor: "top", label: "Top" },
  { anchor: "anchor-leader-tweets", label: "Posts" },
  { anchor: "anchor-competitor-updates", label: "Competitors" },
  { anchor: "anchor-domain-signals", label: "Market" },
  { anchor: "anchor-reddit-threads", label: "Community" },
  { anchor: "anchor-visual-inspiration", label: "Visuals" },
  { anchor: "anchor-design-tool-news", label: "Tools" },
];

export function GlassNav() {
  const navRef = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState<string>("top");

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const masthead = document.querySelector("header.masthead") as HTMLElement | null;
      if (!masthead) return;
      const threshold = masthead.offsetHeight - 8;
      setStuck(window.scrollY > threshold);

      // Activation line — clears the masthead/floating nav.
      const activationY = 140;
      let activeAnchor = RAIL_SECTIONS[0].anchor;
      for (const s of RAIL_SECTIONS) {
        const el = s.anchor === "top"
          ? (document.querySelector("header.masthead") as HTMLElement | null)
          : document.getElementById(s.anchor);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= activationY) activeAnchor = s.anchor;
        else break;
      }
      setActive(activeAnchor);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const jumpTo = (anchor: string) => {
    if (anchor === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const target = document.getElementById(anchor);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      ref={navRef}
      className={`section-nav${stuck ? " stuck" : ""}`}
      aria-label="Section navigation"
    >
      {RAIL_SECTIONS.map((s) => (
        <button
          key={s.anchor}
          type="button"
          className={`section-nav-item${active === s.anchor ? " active" : ""}`}
          onClick={() => jumpTo(s.anchor)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
