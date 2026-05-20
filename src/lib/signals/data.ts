// Server-side data layer for Signals.
//
// All Supabase reads/writes go through this module so the API routes,
// playbook orchestrator, and cron handler share a single contract.
//
// Tables (see supabase/migrations/20260521120000_signals.sql):
//   signals_meta       — singleton row, clients + freshness + voices
//   signals_sections   — one row per section_id
//   signals_threads    — singleton row, cross-section synthesis
//   signals_bookmarks  — user × item
//   signals_history    — versioned snapshots (capped at 5)
//
// All RLS-restricted: writes require admin role; reads require auth (except
// bookmarks which are owner-scoped). Server functions here intentionally do
// NOT bypass RLS — the caller is responsible for ensuring the action is
// authorised (either by going through a server route using cookies, or by
// gating ahead of time).

import "server-only";
import { createClient } from "@/lib/supabase-server";
import {
  type AnySectionId,
  type DashboardPayload,
  type DesignSurface,
  type MetaConfig,
  type SectionData,
  type SectionFreshness,
  type SectionId,
  SCHEMA_VERSION,
  SECTION_IDS,
  emptyMeta,
  emptySection,
  type ItemFor,
  type ThreadsData,
  type ClientConfig,
} from "./types";
import { validateMeta, validateSection, validateThreads, resolveConnections } from "./validation";

// ---------------------------------------------------------------------------
// Read: meta
// ---------------------------------------------------------------------------
export async function readMeta(): Promise<MetaConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("signals_meta")
    .select("data")
    .eq("id", "singleton")
    .maybeSingle();
  if (error) {
    console.error("[signals] readMeta error", error);
    return emptyMeta();
  }
  if (!data) return emptyMeta();
  return validateMeta((data as { data: unknown }).data);
}

export async function writeMeta(meta: MetaConfig): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("signals_meta")
    .upsert({ id: "singleton", data: meta as unknown as Record<string, unknown> });
  if (error) throw new Error(`writeMeta failed: ${error.message}`);
}

export async function updateSectionFreshness(
  section: AnySectionId,
  patch: Partial<SectionFreshness>,
): Promise<void> {
  const meta = await readMeta();
  const existing = meta.section_freshness[section] || {
    last_attempt: null,
    last_success: null,
    degraded: false,
    items_kept: 0,
  };
  meta.section_freshness = { ...meta.section_freshness, [section]: { ...existing, ...patch } };
  await writeMeta(meta);
}

// ---------------------------------------------------------------------------
// Read: one section
// ---------------------------------------------------------------------------
export async function readSection<S extends SectionId>(section: S): Promise<SectionData<ItemFor<S>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("signals_sections")
    .select("data")
    .eq("section_id", section)
    .maybeSingle();
  if (error) {
    console.error(`[signals] readSection(${section}) error`, error);
    return emptySection(section);
  }
  if (!data) return emptySection(section);
  const result = validateSection(section, (data as { data: unknown }).data);
  return result.data;
}

// Write a validated section payload + bump freshness. Caller has already
// validated the payload (this is enforced by the type signature).
export async function writeSection<S extends SectionId>(
  section: S,
  data: SectionData<ItemFor<S>>,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("signals_sections").upsert({
    section_id: section,
    data: data as unknown as Record<string, unknown>,
    generated_at: data.generated_at,
    schema_version: data.schema_version,
  });
  if (error) throw new Error(`writeSection(${section}) failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Read: threads
// ---------------------------------------------------------------------------
export async function readThreads(): Promise<ThreadsData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("signals_threads")
    .select("data")
    .eq("id", "singleton")
    .maybeSingle();
  if (error) {
    console.error("[signals] readThreads error", error);
    return null;
  }
  if (!data) return null;
  const result = validateThreads((data as { data: unknown }).data);
  if (!result.data.items.length && !result.data.briefing_line) return null;
  return result.data;
}

export async function writeThreads(threads: ThreadsData): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("signals_threads")
    .upsert({ id: "singleton", data: threads as unknown as Record<string, unknown> });
  if (error) throw new Error(`writeThreads failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Read: bookmarks (current user)
// ---------------------------------------------------------------------------
export async function readBookmarks(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("signals_bookmarks")
    .select("item_id")
    .eq("user_id", user.id);
  if (error) {
    console.error("[signals] readBookmarks error", error);
    return [];
  }
  return (data || []).map((r: { item_id: string }) => r.item_id);
}

export async function toggleBookmark(itemId: string, sectionId: SectionId): Promise<{ bookmarked: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  // Check current state
  const { data: existing } = await supabase
    .from("signals_bookmarks")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("signals_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("item_id", itemId);
    if (error) throw new Error(`bookmark delete failed: ${error.message}`);
    return { bookmarked: false };
  }
  const { error } = await supabase
    .from("signals_bookmarks")
    .insert({ user_id: user.id, item_id: itemId, section_id: sectionId });
  if (error) throw new Error(`bookmark insert failed: ${error.message}`);
  return { bookmarked: true };
}

export async function clearBookmarks(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  const { error } = await supabase.from("signals_bookmarks").delete().eq("user_id", user.id);
  if (error) throw new Error(`clearBookmarks failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// History — versioned snapshots. Insert-only; the DB trigger prunes.
// ---------------------------------------------------------------------------
export async function pushHistory(snapshot: DashboardPayload, itemsShipped: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("signals_history")
    .insert({ snapshot: snapshot as unknown as Record<string, unknown>, items_shipped: itemsShipped });
  if (error) {
    console.warn("[signals] pushHistory failed", error);
  }
}

// ---------------------------------------------------------------------------
// Compose the full dashboard payload.
//
// One trip to the DB pulls every section in parallel; the resolveConnections
// pass (mirrors build.js) silently drops cross-section refs whose targets
// aren't present in this read.
// ---------------------------------------------------------------------------
export async function readDashboard(): Promise<DashboardPayload> {
  const [
    meta,
    domainSignals,
    competitorUpdates,
    leaderTweets,
    designToolNews,
    visualInspiration,
    lennyPodcast,
    redditThreads,
    threads,
    bookmarks,
  ] = await Promise.all([
    readMeta(),
    readSection("domain-signals"),
    readSection("competitor-updates"),
    readSection("leader-tweets"),
    readSection("design-tool-news"),
    readSection("visual-inspiration"),
    readSection("lenny-podcast"),
    readSection("reddit-threads"),
    readThreads(),
    readBookmarks(),
  ]);

  // Match build.js: prune dead `connections` refs after all sections loaded.
  resolveConnections([
    domainSignals,
    competitorUpdates,
    leaderTweets,
    designToolNews,
    visualInspiration,
    lennyPodcast,
    redditThreads,
  ]);

  return {
    meta,
    sections: {
      "domain-signals": domainSignals,
      "competitor-updates": competitorUpdates,
      "leader-tweets": leaderTweets,
      "design-tool-news": designToolNews,
      "visual-inspiration": visualInspiration,
      "lenny-podcast": lennyPodcast,
      "reddit-threads": redditThreads,
    },
    threads,
    bookmarks,
  };
}

// ---------------------------------------------------------------------------
// Admin write helpers — used by an eventual admin UI. Defined here so the
// API layer doesn't reinvent them.
// ---------------------------------------------------------------------------
export async function upsertClient(client: ClientConfig): Promise<void> {
  const meta = await readMeta();
  const existing = meta.clients.findIndex((c) => c.id === client.id);
  if (existing >= 0) meta.clients[existing] = client;
  else meta.clients.push(client);
  await writeMeta(meta);
}

export async function removeClient(clientId: string): Promise<void> {
  const meta = await readMeta();
  meta.clients = meta.clients.filter((c) => c.id !== clientId);
  await writeMeta(meta);
}

// Convenience: pull the controlled list of design surfaces actually in use
// across the current dataset. Used by the section-view filter chips.
export function uniqueSurfacesFor(items: { design_surface?: DesignSurface[] }[]): DesignSurface[] {
  const set = new Set<DesignSurface>();
  for (const it of items) for (const s of it.design_surface || []) set.add(s);
  return Array.from(set).sort();
}

// Helper: list section ids in the canonical reading order used by the page.
export function orderedSectionIds(): SectionId[] {
  return [...SECTION_IDS];
}

// Sanity export for callers that need the schema version (e.g. when freshly
// authoring meta inside an admin tool).
export const SIGNALS_SCHEMA_VERSION = SCHEMA_VERSION;
