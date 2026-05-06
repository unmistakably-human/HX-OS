"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

const PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-fuchsia-500",
  "bg-teal-500",
];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

interface Props {
  side?: "top" | "bottom";
  align?: "start" | "end";
}

export function UserMenu({ side = "bottom", align = "end" }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!email) return null;
  const initial = email.slice(0, 1).toUpperCase();
  const color = colorFor(email);

  const verticalPos = side === "bottom" ? "top-10" : "bottom-10";
  const horizontalPos = align === "end" ? "right-0" : "left-0";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90 ${color}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {initial}
      </button>
      {open && (
        <div
          className={`absolute ${verticalPos} ${horizontalPos} z-50 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg`}
          role="menu"
        >
          <div className="border-b border-border px-3 py-2.5">
            <div className="text-xs text-muted-foreground">Signed in as</div>
            <div className="truncate text-sm font-medium">{email}</div>
          </div>
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
