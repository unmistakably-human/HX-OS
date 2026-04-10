import { getProduct, listFeatures } from "@/lib/projects";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  let product;
  try {
    product = await getProduct(productId);
    // Attach features summary for sidebar
    const features = await listFeatures(productId);
    product.features = features.map((f) => ({
      id: f.id,
      name: f.name,
      feature_type: f.feature_type,
      phase_brief: f.phase_brief,
      phase_discovery: f.phase_discovery,
      phase_design_concepts: f.phase_design_concepts,
      phase_concepts: f.phase_concepts,
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
