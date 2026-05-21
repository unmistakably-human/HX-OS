// POST /api/signals/refresh/[section] — run a single section refresh.
//
// Threads always re-run after a section refresh because threads is derived
// state and a partial refresh would leave stale signal_refs.
//
// Same fire-and-forget pattern as the full refresh route: returns 202
// immediately, work continues in `after()`.

import { NextResponse, after } from "next/server";
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

  const startedAt = new Date().toISOString();
  const sectionId = section as SectionId;
  after(async () => {
    try {
      await runSection(sectionId);
      // Threads are derived — re-run after any section refresh.
      await runThreads();
      console.log(`[api/signals/refresh/${section}] background completed`);
    } catch (e) {
      console.error(`[api/signals/refresh/${section}] background failed`, e);
    }
  });

  return NextResponse.json(
    {
      ok: true,
      started: true,
      startedAt,
      section: sectionId,
      note: "Refresh running in background. Poll GET /api/signals to watch meta.section_freshness.",
    },
    { status: 202 },
  );
}
