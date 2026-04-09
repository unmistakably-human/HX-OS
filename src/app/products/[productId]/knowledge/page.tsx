"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { PhaseHeader } from "@/components/phase-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Search } from "lucide-react";
import type { KnowledgeEntry } from "@/lib/types";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Pinned" },
  { key: "user_behaviour", label: "User" },
  { key: "domain", label: "Domain" },
  { key: "competitor", label: "Competitor" },
  { key: "pattern", label: "Pattern" },
  { key: "opportunity", label: "Opportunity" },
  { key: "persona", label: "Persona" },
  { key: "market", label: "Market" },
  { key: "principle", label: "Principle" },
];

const CATEGORY_COLORS: Record<string, string> = {
  user_behaviour: "#10B981",
  domain: "#F59E0B",
  competitor: "#3B82F6",
  pattern: "#8B5CF6",
  opportunity: "#EC4899",
  persona: "#10B981",
  market: "#F59E0B",
  principle: "#6366F1",
  architecture: "#14B8A6",
  visual: "#F43F5E",
};

function InsightCard({
  entry,
  onTogglePin,
  showProduct,
}: {
  entry: KnowledgeEntry & { product_name?: string };
  onTogglePin: (id: string) => void;
  showProduct?: boolean;
}) {
  const color = CATEGORY_COLORS[entry.category] || "#6B7280";
  return (
    <div className="p-4 bg-white border border-[#e5e7eb] rounded-xl hover:border-[#d1d5db] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ color, background: color + "15" }}
            >
              {entry.category.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] text-[#9ca3af]">{entry.source.replace(/_/g, " ")}</span>
            {showProduct && entry.product_name && (
              <span className="text-[10px] font-medium text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded-md">
                {entry.product_name}
              </span>
            )}
          </div>
          <h4 className="text-[14px] font-semibold text-[#111827] leading-snug mb-1">
            {entry.title}
          </h4>
          <p className="text-[13px] text-[#6b7280] leading-relaxed">
            {entry.content}
          </p>
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.map((tag, i) => (
                <span key={i} className="text-[10px] text-[#9ca3af] bg-[#f4f4f5] px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onTogglePin(entry.id)}
          className="shrink-0 p-1.5 rounded-md hover:bg-[#f4f4f5] transition-colors"
          title={entry.is_pinned ? "Unpin" : "Pin"}
        >
          <Star
            className={`w-4 h-4 ${entry.is_pinned ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#d1d5db]"}`}
            strokeWidth={1.5}
          />
        </button>
      </div>
    </div>
  );
}

export default function KnowledgeBrowserPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [crossProductEntries, setCrossProductEntries] = useState<(KnowledgeEntry & { product_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/knowledge`);
      if (res.ok) setEntries(await res.json());
    } catch {
      // ignore
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Load cross-product entries based on product name/context
  useEffect(() => {
    async function loadCrossProduct() {
      try {
        // Use a broad query based on available entries
        const topEntries = entries.slice(0, 3).map((e) => e.title).join(" ");
        if (!topEntries) return;
        const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(topEntries)}&excludeProduct=${productId}&limit=8`);
        if (res.ok) setCrossProductEntries(await res.json());
      } catch {
        // ignore
      }
    }
    if (entries.length > 0) loadCrossProduct();
  }, [entries, productId]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadEntries();
      setCrossProductEntries([]);
      return;
    }
    setSearching(true);
    try {
      // Search within this product
      const res = await fetch(`/api/products/${productId}/knowledge?search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setEntries(await res.json());
      // Search across products
      const crossRes = await fetch(`/api/knowledge/search?q=${encodeURIComponent(searchQuery)}&excludeProduct=${productId}&limit=8`);
      if (crossRes.ok) setCrossProductEntries(await crossRes.json());
    } catch {
      // ignore
    }
    setSearching(false);
  }, [searchQuery, productId, loadEntries]);

  const handleTogglePin = useCallback(async (knowledgeId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/knowledge/${knowledgeId}/pin`, { method: "POST" });
      if (res.ok) {
        const { isPinned } = await res.json();
        setEntries((prev) =>
          prev.map((e) =>
            e.id === knowledgeId
              ? { ...e, is_pinned: isPinned, pinned_at: isPinned ? new Date().toISOString() : null }
              : e
          )
        );
      }
    } catch {
      // ignore
    }
  }, [productId]);

  const filteredEntries =
    activeFilter === "all"
      ? entries
      : activeFilter === "pinned"
        ? entries.filter((e) => e.is_pinned)
        : entries.filter((e) => e.category === activeFilter);

  const pinnedCount = entries.filter((e) => e.is_pinned).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#9ca3af]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PhaseHeader
        title="Knowledge Base"
        subtitle={`${entries.length} entries${pinnedCount > 0 ? ` · ${pinnedCount} pinned` : ""}`}
      />

      {/* Search bar */}
      <div className="px-5 py-3 border-b border-[#e5e7eb] bg-white flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" strokeWidth={1.5} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search knowledge entries..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch} disabled={searching}>
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Category filter tabs */}
      <div className="px-5 py-2 border-b border-[#e5e7eb] bg-white overflow-x-auto">
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat.key;
            const count =
              cat.key === "all"
                ? entries.length
                : cat.key === "pinned"
                  ? pinnedCount
                  : entries.filter((e) => e.category === cat.key).length;
            if (cat.key !== "all" && cat.key !== "pinned" && count === 0) return null;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveFilter(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#18181b] text-white"
                    : "text-[#6b7280] hover:bg-[#f4f4f5]"
                }`}
              >
                {cat.label}
                {count > 0 && (
                  <span className={`ml-1.5 ${isActive ? "text-white/60" : "text-[#9ca3af]"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-[#9ca3af]">
            <p className="text-[14px]">No entries found</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <InsightCard key={entry.id} entry={entry} onTogglePin={handleTogglePin} />
          ))
        )}

        {/* Cross-product section */}
        {crossProductEntries.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
            <h3 className="text-[14px] font-bold text-[#111827] uppercase tracking-wide mb-4">
              From Other Products
            </h3>
            <div className="space-y-3">
              {crossProductEntries.map((entry) => (
                <InsightCard
                  key={entry.id}
                  entry={entry}
                  onTogglePin={handleTogglePin}
                  showProduct
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
