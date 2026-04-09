"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiscoveryDeck } from "@/lib/discovery-types";
import { buildDeckPages } from "./deck-pages";

interface DeckNavigatorProps {
  data: DiscoveryDeck;
}

export function DeckNavigator({ data }: DeckNavigatorProps) {
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));
  const pages = useRef(buildDeckPages(data));
  const total = pages.current.length;

  const go = useCallback(
    (n: number) => {
      if (n >= 0 && n < total) {
        setIdx(n);
        setSeen((prev) => new Set([...prev, n]));
      }
    },
    [total]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture arrows when an input/textarea is focused
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowRight") go(idx + 1);
      if (e.key === "ArrowLeft") go(idx - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx, go]);

  return (
    <div>
      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f3f4f6]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => go(idx - 1)}
          disabled={idx === 0}
          className="text-[12px] h-8 px-3"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Prev
        </Button>

        {/* Dot indicators */}
        <div className="flex gap-1.5 flex-wrap justify-center flex-1 mx-3">
          {pages.current.map((_, i) => (
            <div
              key={i}
              onClick={() => go(i)}
              className={`cursor-pointer rounded-full transition-all duration-200 ${
                i === idx
                  ? "w-5 h-[7px] bg-[#E8713A] rounded-[3px]"
                  : seen.has(i)
                    ? "w-[7px] h-[7px] bg-[#111827]/25"
                    : "w-[7px] h-[7px] bg-[#111827]/10"
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => go(idx + 1)}
          disabled={idx === total - 1}
          className="text-[12px] h-8 px-3"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Page counter */}
      <div className="text-[11px] text-[#9ca3af] text-right mb-3">
        {idx + 1} / {total}
      </div>

      {/* Current page */}
      <div
        key={idx}
        className="animate-in fade-in duration-300"
      >
        {pages.current[idx]}
      </div>
    </div>
  );
}
