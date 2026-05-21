// GET /api/signals — return the full dashboard payload for the current user.
//
// Used by the dashboard's SignalsDashboard component (client) and (once
// wired up) by Server Components that want SSR-rendered initial state.

import { NextResponse } from "next/server";
import { readDashboard } from "@/lib/signals/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await readDashboard();
    return NextResponse.json(payload);
  } catch (e: unknown) {
    console.error("[api/signals] GET failed", e);
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
