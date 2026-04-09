import { getFeature } from "@/lib/projects";

export default async function WireframePreviewPage({
  params,
}: {
  params: Promise<{ featureId: string; conceptIndex: string }>;
}) {
  const { featureId, conceptIndex } = await params;
  const idx = parseInt(conceptIndex, 10);

  let feature;
  try {
    feature = await getFeature(featureId);
  } catch {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#999" }}>
        Feature not found
      </div>
    );
  }

  const concept = feature.concepts?.[idx];
  if (!concept) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#999" }}>
        Concept not found
      </div>
    );
  }

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{concept.name} — {feature.name}</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: #F5F5F5;
                color: #333;
                min-height: 100vh;
              }
            `,
          }}
        />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: concept.wireframeHtml }} />
      </body>
    </html>
  );
}
