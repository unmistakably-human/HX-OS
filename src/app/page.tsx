"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Plus, MoreHorizontal, Check, Trash2, Loader2, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Product, FeatureSummary, ProductContext } from "@/lib/types";
import {
  listProducts,
  createProduct,
  deleteProduct,
  deleteFeature,
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
    <span className="inline-flex items-center gap-1 text-xs">
      {done ? (
        <span className="text-hx-green-dark font-medium">{label} ✓</span>
      ) : (
        <span className="text-content-muted">{label} ○</span>
      )}
    </span>
  );
}

function StepDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={done ? "text-hx-green-dark font-medium" : "text-content-muted"}>
      {label}
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

  // Confirm delete dialog
  const [confirmDelete, setConfirmDelete] = useState<{ type: "product" | "feature"; id: string; productId?: string; name: string } | null>(null);
  const [deletingFeature, setDeletingFeature] = useState<string | null>(null);

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
              audience: parsed.audience || [],
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

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.type === "product") {
      setDeleting(confirmDelete.id);
      try {
        await deleteProduct(confirmDelete.id);
        setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      } catch (err) {
        console.error("Failed to delete product:", err);
      }
      setDeleting(null);
      setOpenMenu(null);
    } else if (confirmDelete.type === "feature") {
      setDeletingFeature(confirmDelete.id);
      try {
        await deleteFeature(confirmDelete.id);
        // Remove feature from the product's features list in local state
        setProducts((prev) =>
          prev.map((p) =>
            p.id === confirmDelete.productId
              ? { ...p, features: (p.features || []).filter((f) => f.id !== confirmDelete.id) }
              : p
          )
        );
      } catch (err) {
        console.error("Failed to delete feature:", err);
      }
      setDeletingFeature(null);
    }
    setConfirmDelete(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-content-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" strokeWidth={1.5} />
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page-alt">
      {/* Header */}
      <div className="bg-surface-card border-b border-divider">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/humanx-logo.svg" alt="" className="h-8 w-auto shrink-0" />
            <div>
              <h1 className="text-h3 font-bold text-content-heading leading-tight">HumanX Studio</h1>
              <p className="text-xs text-content-tertiary">AI Design Workflow</p>
            </div>
          </a>
          <Button
            onClick={() => setShowNewProduct(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
            New Product
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto px-6 py-6 space-y-4">
        {products.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-surface-card flex items-center justify-center mx-auto mb-4 border border-divider">
              <Plus className="w-7 h-7 text-content-muted" strokeWidth={1.5} />
            </div>
            <h2 className="text-h2 font-bold text-content-heading mb-2">No products yet</h2>
            <p className="text-sm text-content-secondary mb-6 max-w-sm mx-auto">
              Create your first product to start the design workflow.
            </p>
            <Button
              onClick={() => setShowNewProduct(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              New Product
            </Button>
          </div>
        )}

        {products.map((product) => {
          const features = (product.features || []) as FeatureSummary[];
          return (
            <div
              key={product.id}
              className="bg-surface-card border border-divider rounded-[8px] p-5"
            >
              {/* Product header */}
              <div className="flex items-start justify-between mb-3">
                <button
                  onClick={() => router.push(`/products/${product.id}/context`)}
                  className="text-left hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-h2 font-bold text-content-heading">
                      {product.name}
                    </h2>
                    {product.company && (
                      <span className="text-sm text-content-tertiary">
                        {product.company}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <PhaseCheck done={product.phase_context === "complete"} label="Context" />
                    <PhaseCheck done={product.phase_discovery === "complete"} label="Discovery" />
                    <span className="text-overline text-content-muted">
                      Updated {relativeTime(product.updated_at)}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewFeature(product.id);
                      setNewFeatureName("");
                      setNewFeatureType("screen");
                    }}
                    className="text-xs h-7 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                    New Feature
                  </Button>
                  {/* Three-dot menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === product.id ? null : product.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-surface-page-alt transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-content-tertiary" strokeWidth={1.5} />
                    </button>
                    {openMenu === product.id && (
                      <div className="absolute right-0 top-8 bg-surface-card border border-divider rounded-[8px] shadow-md z-10 py-1 min-w-[140px]">
                        <button
                          onClick={() => setConfirmDelete({ type: "product", id: product.id, name: product.name })}
                          disabled={deleting === product.id}
                          className="w-full text-left px-3 py-2 text-body-sm text-feedback-error-text hover:bg-feedback-error-bg flex items-center gap-2"
                        >
                          {deleting === product.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          )}
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Feature cards */}
              {features.length === 0 && (
                <div className="text-body-sm text-content-muted mt-2">
                  No features yet
                </div>
              )}

              {features.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {features.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => router.push(`/products/${product.id}/features/${f.id}`)}
                      className="group relative bg-surface-card border border-divider rounded-[8px] p-4 text-left hover:border-divider-card-hover transition-colors cursor-pointer"
                    >
                      {/* Delete button - top right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ type: "feature", id: f.id, productId: product.id, name: f.name || "Untitled" });
                        }}
                        className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-feedback-error-bg text-content-muted hover:text-feedback-error-text transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <div className="text-sm font-semibold text-content-heading truncate pr-6">
                        {f.name || "Untitled"}
                      </div>
                      {/* Horizontal step progress */}
                      <div className="flex items-center gap-1 mt-2 text-overline flex-wrap">
                        <StepDot done={f.phase_brief === "complete"} label="Brief" />
                        <span className="text-content-muted">&gt;</span>
                        <StepDot done={f.phase_discovery === "complete"} label="Insights" />
                        <span className="text-content-muted">&gt;</span>
                        <StepDot done={f.phase_design_concepts === "complete"} label="Concepts" />
                        <span className="text-content-muted">&gt;</span>
                        <StepDot done={f.phase_concepts === "complete"} label="Visuals" />
                        <span className="text-content-muted">&gt;</span>
                        <StepDot done={f.phase_hifi === "complete"} label="High Fidelity" />
                        <span className="text-content-muted">&gt;</span>
                        <StepDot done={f.phase_review === "complete"} label="Review" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Product Modal */}
      {showNewProduct && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50" onClick={() => { setShowNewProduct(false); setBriefFile(null); }}>
          <div className="bg-surface-card rounded-xl p-6 w-[420px] shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-h3 font-bold text-content-heading mb-4">New Product</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-body-sm text-content-secondary">Product name *</Label>
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
                <Label className="text-body-sm text-content-secondary">Company *</Label>
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
                <Label className="text-body-sm text-content-secondary">Upload brief (optional)</Label>
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
                  <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-feedback-info-bg border border-feedback-info-border rounded-[8px]">
                    <FileText className="w-4 h-4 text-feedback-info-text shrink-0" strokeWidth={1.5} />
                    <span className="text-body-sm text-feedback-info-text truncate flex-1">{briefFile.name}</span>
                    <button onClick={() => setBriefFile(null)} className="text-content-secondary hover:text-content-heading">
                      <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-divider-dashed rounded-[8px] text-content-secondary hover:border-divider-card-hover hover:text-content-heading transition-colors"
                  >
                    <Upload className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-body-sm">Choose file (PDF, MD, DOCX)</span>
                  </button>
                )}
                <p className="text-overline text-content-muted mt-1">
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
                disabled={!newProductName.trim() || !newProductCompany.trim() || creatingProduct}
              >
                {creatingProduct ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" strokeWidth={1.5} />
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
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50" onClick={() => setShowNewFeature(null)}>
          <div className="bg-surface-card rounded-xl p-6 w-[420px] shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-h3 font-bold text-content-heading mb-4">New Feature</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-body-sm text-content-secondary">Feature name *</Label>
                <Input
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                  placeholder="e.g. Product Detail Page"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-body-sm text-content-secondary mb-2 block">Type</Label>
                <RadioGroup value={newFeatureType} onValueChange={(v) => setNewFeatureType(v as "screen" | "flow")}>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="screen" id="type-screen" />
                      <Label htmlFor="type-screen" className="text-body-sm">Screen</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="flow" id="type-flow" />
                      <Label htmlFor="type-flow" className="text-body-sm">Flow</Label>
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
              >
                {creatingFeature ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" strokeWidth={1.5} />
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

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Delete {confirmDelete.name}?</DialogTitle>
              <DialogDescription>
                This {confirmDelete.type} will be permanently deleted. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting === confirmDelete.id || deletingFeature === confirmDelete.id}
              >
                {(deleting === confirmDelete.id || deletingFeature === confirmDelete.id) ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" strokeWidth={1.5} /> Deleting...</>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
