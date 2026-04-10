import { getFeature } from "@/lib/projects";
import { PreviewClient } from "./preview-client";

export default async function WireframePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ featureId: string; conceptIndex: string }>;
  searchParams: Promise<{ capture?: string; type?: string }>;
}) {
  const { featureId, conceptIndex } = await params;
  const { capture, type } = await searchParams;
  const idx = parseInt(conceptIndex, 10);
  const injectCapture = capture === "true";
  const isHifi = type === "hifi";

  let feature;
  try {
    feature = await getFeature(featureId);
  } catch {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, system-ui, sans-serif", color: "#999" }}>
        Feature not found
      </div>
    );
  }

  // Support both concept wireframes and HiFi designs
  const item = isHifi ? feature.hifi_designs?.[idx] : feature.concepts?.[idx];
  if (!item) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, system-ui, sans-serif", color: "#999" }}>
        {isHifi ? "Design" : "Concept"} not found
      </div>
    );
  }

  const html = isHifi ? (item as { htmlContent: string }).htmlContent : (item as { wireframeHtml: string }).wireframeHtml;
  const name = item.name;

  return (
    <PreviewClient
      wireframeHtml={html}
      conceptName={name}
      featureName={feature.name}
      injectCapture={injectCapture}
    />
  );
}
