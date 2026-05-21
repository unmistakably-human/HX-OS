// POST /api/signals/refresh — run the full refresh.
//
// Authorisation: admin role required. The skill calls Claude with web search
// and persists every section + threads; not something we want anyone to
// trigger.
//
// Long-running. Response is returned IMMEDIATELY (HTTP 202); the actual work
// runs inside `after()` so the route survives client disconnects (ERR_NETWORK_CHANGED,
// closed tabs, mobile network handoffs etc.). Vercel keeps the function alive
// up to `maxDuration` while the `after` callback is pending.
//
// Clients can poll GET /api/signals to watch `meta.section_freshness` update
// as each section completes (every 30-60s is plenty).

import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { refreshAll } from "@/lib/signals/playbooks/sections";
import type { SectionId } from "@/lib/signals/types";
import { SECTION_IDS } from "@/lib/signals/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: number; body: { error: string } }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, body: { error: "not authenticated" } };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile && typeof profile === "object" && "role" in profile ? (profile as { role: string }).role : null;
  if (role !== "admin") return { ok: false, status: 403, body: { error: "admin role required" } };
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  // Optional scoped refresh: body may include { sections: ["domain-signals", ...] }
  let scope: SectionId[] | undefined;
  try {
    const body = await req.json();
    if (body && Array.isArray(body.sections)) {
      scope = (body.sections as string[]).filter((s): s is SectionId => SECTION_IDS.includes(s as SectionId));
    }
  } catch {
    // No body / invalid JSON → full refresh.
  }

  const startedAt = new Date().toISOString();
  after(async () => {
    try {
      await refreshAll({ sections: scope });
      console.log(`[api/signals/refresh] background completed (started ${startedAt})`);
    } catch (e) {
      console.error("[api/signals/refresh] background failed", e);
    }
  });

  return NextResponse.json(
    {
      ok: true,
      started: true,
      startedAt,
      scope: scope || SECTION_IDS,
      note: "Refresh running in background (~3-5 min). Poll GET /api/signals to watch meta.section_freshness as each section completes.",
    },
    { status: 202 },
  );
}
