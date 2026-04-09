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
      phase_concepts: f.phase_concepts,
      chosen_concept: f.chosen_concept,
      updated_at: f.updated_at,
    }));
  } catch {
    return (
      <div className="flex items-center justify-center h-screen text-[#9ca3af]">
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
