"use client";

import { useEffect } from "react";

export function PreviewClient({
  wireframeHtml,
  conceptName,
  featureName,
  injectCapture,
}: {
  wireframeHtml: string;
  conceptName: string;
  featureName: string;
  injectCapture: boolean;
}) {
  useEffect(() => {
    // Set page title
    document.title = `${conceptName} — ${featureName}`;

    if (injectCapture) {
      // Inject Figma's capture.js
      const script = document.createElement("script");
      script.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
      document.head.appendChild(script);

      // Re-inject after 500ms to handle race conditions
      const timer = setTimeout(() => {
        const script2 = document.createElement("script");
        script2.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
        document.head.appendChild(script2);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [injectCapture, conceptName, featureName]);

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        background: "#F5F5F5",
        color: "#333",
        minHeight: "100vh",
      }}
      dangerouslySetInnerHTML={{ __html: wireframeHtml }}
    />
  );
}
