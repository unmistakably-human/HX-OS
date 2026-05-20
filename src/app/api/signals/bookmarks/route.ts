// /api/signals/bookmarks — owner-scoped CRUD for bookmarks.
//
// GET   → returns this user's bookmark item ids
// POST  → toggle a single bookmark { itemId, sectionId }
// DELETE → clear all bookmarks for this user

import { NextRequest, NextResponse } from "next/server";
import { clearBookmarks, readBookmarks, toggleBookmark } from "@/lib/signals/data";
import { SECTION_IDS, type SectionId } from "@/lib/signals/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ids = await readBookmarks();
    return NextResponse.json({ ids });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { itemId?: unknown; sectionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const itemId = typeof body.itemId === "string" ? body.itemId : null;
  const sectionId = typeof body.sectionId === "string" ? body.sectionId : null;
  if (!itemId || !sectionId || !SECTION_IDS.includes(sectionId as SectionId)) {
    return NextResponse.json({ error: "itemId and valid sectionId required" }, { status: 400 });
  }
  try {
    const result = await toggleBookmark(itemId, sectionId as SectionId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "not authenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE() {
  try {
    await clearBookmarks();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "not authenticated" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
