import { getFeature } from "@/lib/projects";
import { PreviewClient } from "./preview-client";

export default async function WireframePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ featureId: string; conceptIndex: string }>;
  searchParams: Promise<{ capture?: string }>;
}) {
  const { featureId, conceptIndex } = await params;
  const { capture } = await searchParams;
  const idx = parseInt(conceptIndex, 10);
  const injectCapture = capture === "true";

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

  const concept = feature.concepts?.[idx];
  if (!concept) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, system-ui, sans-serif", color: "#999" }}>
        Concept not found
      </div>
    );
  }

  return (
    <PreviewClient
      wireframeHtml={concept.wireframeHtml}
      conceptName={concept.name}
      featureName={feature.name}
      injectCapture={injectCapture}
    />
  );
}
