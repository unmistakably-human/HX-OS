"use client";

// Signals context — shared state every component reads/writes through.
//
// State held here:
//   - activeTab            : the domain-nav selection
//   - rapidTopic           : bento topic-chip filter
//   - drawer               : { sectionId, itemId } | null
//   - sectionView          : "bookmarks" | sectionId | null
//   - readIds              : localStorage-backed Set of viewed ids
//   - bookmarkIds          : Supabase-backed Set of bookmarked ids
//   - bookmarksPending     : in-flight POSTs (to debounce double-clicks)
//   - payload              : the full dashboard payload (from /api/signals)
//   - itemIndex            : id → {item, sectionId} lookup
//   - refresh()            : refetch the dashboard payload

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AnyItem,
  DashboardPayload,
  SectionData,
  SectionId,
} from "@/lib/signals/types";
import { SECTION_IDS, emptyMeta, emptySection } from "@/lib/signals/types";
import { buildItemIndex } from "./utils";

const READ_STORAGE_KEY = "hx-signals-read-v1";

type Drawer = { sectionId: SectionId; itemId: string } | null;
type SectionViewKey = SectionId | "bookmarks" | null;

interface SignalsContextValue {
  payload: DashboardPayload;
  itemIndex: Record<string, { item: AnyItem; sectionId: SectionId }>;
  activeTab: string;
  setActiveTab(tab: string): void;
  rapidTopic: string | null;
  setRapidTopic(topic: string | null): void;
  drawer: Drawer;
  openDrawer(sectionId: SectionId, itemId: string): void;
  closeDrawer(): void;
  sectionView: SectionViewKey;
  openSectionView(view: SectionViewKey): void;
  closeSectionView(): void;
  runLog: { sectionId: SectionId | "threads"; anchor: { x: number; y: number; width: number } } | null;
  openRunLog(sectionId: SectionId | "threads", anchor: HTMLElement): void;
  closeRunLog(): void;
  isRead(id: string): boolean;
  markRead(id: string): void;
  markAllRead(): void;
  resetRead(): void;
  isBookmarked(id: string): boolean;
  toggleBookmark(itemId: string, sectionId: SectionId): Promise<void>;
  clearBookmarks(): Promise<void>;
  refresh(): Promise<void>;
}

const SignalsContext = createContext<SignalsContextValue | null>(null);

export function useSignals(): SignalsContextValue {
  const ctx = useContext(SignalsContext);
  if (!ctx) throw new Error("useSignals must be used inside <SignalsProvider>");
  return ctx;
}

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}
function saveReadIds(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(s)));
  } catch {
    /* quota errors swallowed */
  }
}

function emptyPayload(): DashboardPayload {
  return {
    meta: emptyMeta(),
    sections: {
      "domain-signals": emptySection("domain-signals"),
      "competitor-updates": emptySection("competitor-updates"),
      "leader-tweets": emptySection("leader-tweets"),
      "design-tool-news": emptySection("design-tool-news"),
      "visual-inspiration": emptySection("visual-inspiration"),
      "lenny-podcast": emptySection("lenny-podcast"),
      "reddit-threads": emptySection("reddit-threads"),
    },
    threads: null,
    bookmarks: [],
  };
}

export function SignalsProvider({
  initialPayload,
  children,
}: {
  initialPayload?: DashboardPayload;
  children: ReactNode;
}) {
  const [payload, setPayload] = useState<DashboardPayload>(initialPayload ?? emptyPayload());
  const [activeTab, setActiveTab] = useState<string>("all");
  const [rapidTopic, setRapidTopic] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [sectionView, setSectionView] = useState<SectionViewKey>(null);
  const [runLog, setRunLog] = useState<{
    sectionId: SectionId | "threads";
    anchor: { x: number; y: number; width: number };
  } | null>(null);

  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set(payload.bookmarks));
  const pendingBookmarks = useRef(new Set<string>());

  // Sync bookmarkIds whenever payload changes
  useEffect(() => {
    setBookmarkIds(new Set(payload.bookmarks));
  }, [payload.bookmarks]);

  const itemIndex = useMemo(() => {
    return buildItemIndex(payload.sections as unknown as Record<SectionId, { items: AnyItem[] }>);
  }, [payload.sections]);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/signals", { cache: "no-store" });
      if (!r.ok) return;
      const next = (await r.json()) as DashboardPayload;
      setPayload(next);
    } catch (e) {
      console.warn("[signals] refresh failed", e);
    }
  }, []);

  // Initial fetch when no SSR payload provided.
  useEffect(() => {
    if (!initialPayload) {
      void refresh();
    }
  }, [initialPayload, refresh]);

  const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const s of SECTION_IDS) {
        const data = payload.sections[s] as SectionData;
        for (const it of data.items) next.add(it.id);
      }
      saveReadIds(next);
      return next;
    });
  }, [payload.sections]);

  const resetRead = useCallback(() => {
    setReadIds(new Set());
    saveReadIds(new Set());
  }, []);

  const isBookmarked = useCallback((id: string) => bookmarkIds.has(id), [bookmarkIds]);

  const toggleBookmark = useCallback(
    async (itemId: string, sectionId: SectionId) => {
      if (pendingBookmarks.current.has(itemId)) return;
      pendingBookmarks.current.add(itemId);
      // Optimistic update
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        return next;
      });
      try {
        const r = await fetch("/api/signals/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, sectionId }),
        });
        if (!r.ok) {
          // Roll back
          setBookmarkIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
          });
        }
      } catch (e) {
        console.warn("[signals] toggleBookmark failed", e);
      } finally {
        pendingBookmarks.current.delete(itemId);
      }
    },
    [],
  );

  const clearBookmarks = useCallback(async () => {
    const prev = bookmarkIds;
    setBookmarkIds(new Set());
    try {
      const r = await fetch("/api/signals/bookmarks", { method: "DELETE" });
      if (!r.ok) setBookmarkIds(prev);
    } catch (e) {
      console.warn("[signals] clearBookmarks failed", e);
      setBookmarkIds(prev);
    }
  }, [bookmarkIds]);

  const openDrawer = useCallback(
    (sectionId: SectionId, itemId: string) => {
      markRead(itemId);
      setDrawer({ sectionId, itemId });
    },
    [markRead],
  );
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const openSectionView = useCallback((view: SectionViewKey) => {
    setSectionView(view);
    if (typeof document !== "undefined") document.body.style.overflow = view ? "hidden" : "";
  }, []);
  const closeSectionView = useCallback(() => {
    setSectionView(null);
    if (typeof document !== "undefined") document.body.style.overflow = "";
  }, []);

  const openRunLog = useCallback((sectionId: SectionId | "threads", anchor: HTMLElement) => {
    const r = anchor.getBoundingClientRect();
    setRunLog({ sectionId, anchor: { x: r.left, y: r.bottom, width: r.width } });
  }, []);
  const closeRunLog = useCallback(() => setRunLog(null), []);

  // ESC closes the topmost layer (drawer > runlog > section view).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (drawer) closeDrawer();
      else if (runLog) closeRunLog();
      else if (sectionView) closeSectionView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, runLog, sectionView, closeDrawer, closeRunLog, closeSectionView]);

  const value: SignalsContextValue = {
    payload,
    itemIndex,
    activeTab,
    setActiveTab,
    rapidTopic,
    setRapidTopic,
    drawer,
    openDrawer,
    closeDrawer,
    sectionView,
    openSectionView,
    closeSectionView,
    runLog,
    openRunLog,
    closeRunLog,
    isRead,
    markRead,
    markAllRead,
    resetRead,
    isBookmarked,
    toggleBookmark,
    clearBookmarks,
    refresh,
  };

  return <SignalsContext.Provider value={value}>{children}</SignalsContext.Provider>;
}
