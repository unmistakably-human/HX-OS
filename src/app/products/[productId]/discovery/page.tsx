import { getProduct } from "@/lib/projects";
import { DiscoveryClient } from "@/components/discovery/discovery-client";

export default async function DiscoveryPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);

  return <DiscoveryClient project={product} />;
}
