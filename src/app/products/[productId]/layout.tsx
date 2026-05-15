import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = await createClient();

  let product;
  try {
    const { data: p, error: pErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    if (pErr || !p) throw pErr ?? new Error("not found");
    product = p;

    const { data: features, error: fErr } = await supabase
      .from("features")
      .select("id, name, feature_type, phase_brief, phase_discovery, phase_design_concepts, phase_concepts, phase_flow, phase_hifi, phase_review, chosen_concept, updated_at")
      .eq("product_id", productId)
      .order("updated_at", { ascending: false });
    if (fErr) throw fErr;
    product.features = (features ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      feature_type: f.feature_type,
      phase_brief: f.phase_brief,
      phase_discovery: f.phase_discovery,
      phase_design_concepts: f.phase_design_concepts,
      phase_concepts: f.phase_concepts,
      phase_flow: f.phase_flow || "locked",
      phase_hifi: f.phase_hifi || "locked",
      phase_review: f.phase_review || "locked",
      chosen_concept: f.chosen_concept,
      updated_at: f.updated_at,
    }));
  } catch {
    return (
      <div className="flex items-center justify-center h-screen text-content-muted">
        Product not found
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar product={product} productId={productId} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
