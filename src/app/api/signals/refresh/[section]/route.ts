// POST /api/signals/refresh/[section] — run a single section refresh.
//
// Threads always re-run after a section refresh because threads is derived
// state and a partial refresh would leave stale signal_refs.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { runSection, runThreads } from "@/lib/signals/playbooks/sections";
import { SECTION_IDS, type SectionId } from "@/lib/signals/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ section: string }> },
) {
  const { section } = await ctx.params;
  if (!SECTION_IDS.includes(section as SectionId)) {
    return NextResponse.json({ error: `unknown section ${section}` }, { status: 400 });
  }
  // Admin gate
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile && typeof profile === "object" && "role" in profile ? (profile as { role: string }).role : null;
  if (role !== "admin") return NextResponse.json({ error: "admin role required" }, { status: 403 });

  try {
    const data = await runSection(section as SectionId);
    // Threads are derived — re-run after any section refresh.
    await runThreads();
    return NextResponse.json({ ok: true, section, items_shipped: data.items.length });
  } catch (e: unknown) {
    console.error(`[api/signals/refresh/${section}] failed`, e);
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
