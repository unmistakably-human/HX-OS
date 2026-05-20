"use client";

// Horizontal-scroll carousel with left/right arrow buttons, gradient masks,
// and scroll-snap. Mirrors carouselWrap + setupCarousels in dashboard.html.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function Carousel({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    setAtStart(t.scrollLeft <= 4);
    setAtEnd(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    update();
    t.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      t.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const step = () => Math.max(280, (trackRef.current?.clientWidth || 800) * 0.85);
  const scrollLeft = () => trackRef.current?.scrollBy({ left: -step(), behavior: "smooth" });
  const scrollRight = () => trackRef.current?.scrollBy({ left: step(), behavior: "smooth" });

  return (
    <div className="carousel">
      <button
        type="button"
        className="carousel-arrow left"
        onClick={scrollLeft}
        disabled={atStart}
        aria-label="Scroll left"
      >
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3l-4 4 4 4" />
        </svg>
      </button>
      <div className="carousel-track" ref={trackRef}>
        {children}
      </div>
      <button
        type="button"
        className="carousel-arrow right"
        onClick={scrollRight}
        disabled={atEnd}
        aria-label="Scroll right"
      >
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3l4 4-4 4" />
        </svg>
      </button>
    </div>
  );
}
