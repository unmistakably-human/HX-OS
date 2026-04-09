"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Plus, MoreHorizontal, Check, Trash2, Loader2, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Product, FeatureSummary, ProductContext } from "@/lib/types";
import {
  listProducts,
  createProduct,
  deleteProduct,
  createFeature,
  saveProductContext,
} from "@/lib/projects";

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function PhaseCheck({ done, label }: { done: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px]">
      {done ? (
        <span className="text-[#065f46] font-medium">{label} ✓</span>
      ) : (
        <span className="text-[#9ca3af]">{label} ○</span>
      )}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New product modal
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCompany, setNewProductCompany] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New feature modal
  const [showNewFeature, setShowNewFeature] = useState<string | null>(null);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureType, setNewFeatureType] = useState<"screen" | "flow">("screen");
  const [creatingFeature, setCreatingFeature] = useState(false);

  // Delete menu
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const data = await listProducts();
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listProducts();
        if (!cancelled) {
          setProducts(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function handleCreateProduct() {
    if (!newProductName.trim()) return;
    setCreatingProduct(true);
    try {
      const product = await createProduct(newProductName.trim(), newProductCompany.trim() || undefined);

      // If a brief file was uploaded, parse it and save context
      if (briefFile) {
        try {
          const text = await readFileAsText(briefFile);
          const res = await fetch("/api/parse-brief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          if (res.ok) {
            const parsed = await res.json();
            const emptySeg = { name: "", age: "", gender: "", loc: "", income: "", behaviour: "" };
            const ctx: ProductContext = {
              productName: newProductName.trim(),
              company: newProductCompany.trim(),
              productType: parsed.productType || "",
              stage: parsed.stage || "",
              industries: parsed.industries || [],
              audience: parsed.audience || "",
              platform: parsed.platform || "",
              explain: parsed.explain || "",
              briefWhy: parsed.briefWhy || "",
              valueProp: parsed.valueProp || "",
              notThis: parsed.notThis || "",
              clientBrief: parsed.clientBrief || "",
              seg1: parsed.seg1 || emptySeg,
              seg2: parsed.seg2 || emptySeg,
              behInsights: parsed.behInsights || "",
              competitors: parsed.competitors || "",
              flows: parsed.flows || "",
              ia: parsed.ia || "",
              figmaLink: parsed.figmaLink || "",
              upcoming: parsed.upcoming || "",
              dsChoice: "",
              vibe: parsed.vibe || "",
              colors: parsed.colors || "",
              fonts: parsed.fonts || "",
            };
            await saveProductContext(product.id, ctx);
          }
        } catch {
          // Brief parsing failed — continue without it
        }
      }

      setShowNewProduct(false);
      setNewProductName("");
      setNewProductCompany("");
      setBriefFile(null);
      router.push(`/products/${product.id}/context`);
    } catch (err) {
      console.error("Failed to create product:", err);
    }
    setCreatingProduct(false);
  }

  async function handleCreateFeature(productId: string) {
    if (!newFeatureName.trim()) return;
    setCreatingFeature(true);
    try {
      const feature = await createFeature(productId, newFeatureName.trim(), newFeatureType);
      setShowNewFeature(null);
      setNewFeatureName("");
      setNewFeatureType("screen");
      router.push(`/products/${productId}/features/${feature.id}`);
    } catch (err) {
      console.error("Failed to create feature:", err);
    }
    setCreatingFeature(false);
  }

  async function handleDeleteProduct(id: string) {
    setDeleting(id);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
    setDeleting(null);
    setOpenMenu(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-[#9ca3af]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e7eb]">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-[#18181b]">HumanX Studio</h1>
            <p className="text-[12px] text-[#71717a]">AI Design Workflow</p>
          </div>
          <Button
            onClick={() => setShowNewProduct(true)}
            className="bg-[#E8713A] hover:bg-[#d4652f] text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Product
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto px-6 py-6 space-y-4">
        {products.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4 border border-[#e5e7eb]">
              <Plus className="w-7 h-7 text-[#9ca3af]" />
            </div>
            <h2 className="text-[18px] font-bold text-[#111827] mb-2">No products yet</h2>
            <p className="text-[14px] text-[#6b7280] mb-6 max-w-sm mx-auto">
              Create your first product to start the design workflow.
            </p>
            <Button
              onClick={() => setShowNewProduct(true)}
              className="bg-[#E8713A] hover:bg-[#d4652f] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Product
            </Button>
          </div>
        )}

        {products.map((product) => {
          const features = (product.features || []) as FeatureSummary[];
          return (
            <div
              key={product.id}
              className="bg-white border border-[#e5e7eb] rounded-xl p-5"
            >
              {/* Product header */}
              <div className="flex items-start justify-between mb-3">
                <button
                  onClick={() => router.push(`/products/${product.id}/context`)}
                  className="text-left hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-bold text-[#18181b]">
                      {product.name}
                    </h2>
                    {product.company && (
                      <span className="text-[14px] text-[#71717a]">
                        {product.company}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <PhaseCheck done={product.phase_context === "complete"} label="Context" />
                    <PhaseCheck done={product.phase_discovery === "complete"} label="Discovery" />
                    <span className="text-[11px] text-[#9ca3af]">
                      Updated {relativeTime(product.updated_at)}
                    </span>
                  </div>
                </button>

                {/* Three-dot menu */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === product.id ? null : product.id);
                    }}
                    className="p-1.5 rounded-md hover:bg-[#f4f4f5] transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-[#71717a]" />
                  </button>
                  {openMenu === product.id && (
                    <div className="absolute right-0 top-8 bg-white border border-[#e5e7eb] rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={deleting === product.id}
                        className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        {deleting === product.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Feature cards */}
              {features.length === 0 && (
                <div className="text-[13px] text-[#9ca3af] mt-2">
                  No features yet
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-3">
                {features.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => router.push(`/products/${product.id}/features/${f.id}`)}
                    className="w-[200px] bg-white border border-[#e5e7eb] rounded-lg p-3 text-left hover:border-[#d1d5db] transition-colors"
                  >
                    <div className="text-[14px] font-semibold text-[#111827] truncate">
                      {f.name || "Untitled"}
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px]">
                        {f.phase_brief === "complete" ? (
                          <Check className="w-3 h-3 text-[#065f46]" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-[#d1d5db] inline-block" />
                        )}
                        <span className={f.phase_brief === "complete" ? "text-[#065f46]" : "text-[#9ca3af]"}>
                          Brief
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        {f.phase_discovery === "complete" ? (
                          <Check className="w-3 h-3 text-[#065f46]" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-[#d1d5db] inline-block" />
                        )}
                        <span className={f.phase_discovery === "complete" ? "text-[#065f46]" : "text-[#9ca3af]"}>
                          Discovery
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        {f.phase_concepts === "complete" ? (
                          <Check className="w-3 h-3 text-[#065f46]" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-[#d1d5db] inline-block" />
                        )}
                        <span className={f.phase_concepts === "complete" ? "text-[#065f46]" : "text-[#9ca3af]"}>
                          Concepts
                        </span>
                      </div>
                    </div>
                    {f.chosen_concept && (
                      <div className="mt-2 text-[11px] text-[#E8713A] font-medium truncate">
                        {f.chosen_concept}
                      </div>
                    )}
                  </button>
                ))}

                {/* + New Feature card */}
                <button
                  onClick={() => {
                    setShowNewFeature(product.id);
                    setNewFeatureName("");
                    setNewFeatureType("screen");
                  }}
                  className="w-[200px] border-2 border-dashed border-[#d1d5db] rounded-lg p-3 text-center hover:border-[#E8713A] hover:text-[#E8713A] transition-colors text-[#9ca3af]"
                >
                  <Plus className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-[13px] font-medium">New Feature</div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Product Modal */}
      {showNewProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowNewProduct(false); setBriefFile(null); }}>
          <div className="bg-white rounded-xl p-6 w-[420px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-[#18181b] mb-4">New Product</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-[13px] text-[#374151]">Product name *</Label>
                <Input
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Perfora Oral Care"
                  className="mt-1"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && !creatingProduct && handleCreateProduct()}
                />
              </div>
              <div>
                <Label className="text-[13px] text-[#374151]">Company (optional)</Label>
                <Input
                  value={newProductCompany}
                  onChange={(e) => setNewProductCompany(e.target.value)}
                  placeholder="e.g. Perfora"
                  className="mt-1"
                  onKeyDown={(e) => e.key === "Enter" && !creatingProduct && handleCreateProduct()}
                />
              </div>

              {/* Upload Brief */}
              <div>
                <Label className="text-[13px] text-[#374151]">Upload brief (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.md,.txt,.docx,.doc"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setBriefFile(file);
                    e.target.value = "";
                  }}
                />
                {briefFile ? (
                  <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-[#eff6ff] border border-[#93c5fd] rounded-lg">
                    <FileText className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                    <span className="text-[13px] text-[#1d4ed8] truncate flex-1">{briefFile.name}</span>
                    <button onClick={() => setBriefFile(null)} className="text-[#6b7280] hover:text-[#111827]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-[#d1d5db] rounded-lg text-[#6b7280] hover:border-[#E8713A] hover:text-[#E8713A] transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-[13px]">Choose file (PDF, MD, DOCX)</span>
                  </button>
                )}
                <p className="text-[11px] text-[#9ca3af] mt-1">
                  AI will extract fields from the brief after you click Create.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => { setShowNewProduct(false); setBriefFile(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProduct}
                disabled={!newProductName.trim() || creatingProduct}
                className="bg-[#E8713A] hover:bg-[#d4652f] text-white"
              >
                {creatingProduct ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    {briefFile ? "Extracting & Creating..." : "Creating..."}
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Feature Modal */}
      {showNewFeature && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowNewFeature(null)}>
          <div className="bg-white rounded-xl p-6 w-[420px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-[#18181b] mb-4">New Feature</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-[13px] text-[#374151]">Feature name *</Label>
                <Input
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                  placeholder="e.g. Product Detail Page"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-[13px] text-[#374151] mb-2 block">Type</Label>
                <RadioGroup value={newFeatureType} onValueChange={(v) => setNewFeatureType(v as "screen" | "flow")}>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="screen" id="type-screen" />
                      <Label htmlFor="type-screen" className="text-[13px]">Screen</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="flow" id="type-flow" />
                      <Label htmlFor="type-flow" className="text-[13px]">Flow</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setShowNewFeature(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleCreateFeature(showNewFeature)}
                disabled={!newFeatureName.trim() || creatingFeature}
                className="bg-[#E8713A] hover:bg-[#d4652f] text-white"
              >
                {creatingFeature ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
