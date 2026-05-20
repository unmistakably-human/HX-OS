// POST /api/signals/refresh — run the full refresh.
//
// Authorisation: admin role required. The skill calls Claude with web search
// and persists every section + threads; not something we want anyone to
// trigger.
//
// Long-running. Vercel functions allow up to 300s by default on Fluid Compute,
// which fits the 7 sequential web-search calls.

import { NextRequest, NextResponse } from "next/server";
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

  try {
    await refreshAll({ sections: scope });
    return NextResponse.json({ ok: true, refreshed: scope || SECTION_IDS });
  } catch (e: unknown) {
    console.error("[api/signals/refresh] failed", e);
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
