import { redirect } from "next/navigation";
import { getProduct } from "@/lib/projects";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  try {
    const product = await getProduct(productId);

    if (product.phase_discovery === "active" || product.phase_discovery === "complete") {
      redirect(`/products/${productId}/discovery`);
    }
  } catch {
    // fall through to context
  }

  redirect(`/products/${productId}/context`);
}
