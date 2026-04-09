import { getFeature } from "@/lib/projects";

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
                font-family: Inter, system-ui, -apple-system, sans-serif;
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
        {injectCapture && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Inject Figma's capture.js for clipboard copy
                (function() {
                  var s = document.createElement('script');
                  s.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
                  document.head.appendChild(s);
                  // Re-inject after 500ms to handle CSP race conditions
                  setTimeout(function() {
                    var s2 = document.createElement('script');
                    s2.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
                    document.head.appendChild(s2);
                  }, 500);
                })();
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
