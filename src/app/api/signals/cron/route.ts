// /api/signals/cron — Vercel cron entry point.
//
// Configured in vercel.ts to run at 9 AM IST (03:30 UTC) on weekdays —
// matches the cadence documented in signals-final/skills/refresh-signals/SKILL.md.
//
// Vercel signs cron requests with the CRON_SECRET environment variable —
// this guard is the platform-recommended way to ensure only the scheduler
// can invoke long-running refreshes.

import { NextRequest, NextResponse } from "next/server";
import { refreshAll } from "@/lib/signals/playbooks/sections";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  try {
    await refreshAll();
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
  } catch (e: unknown) {
    console.error("[api/signals/cron] failed", e);
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
