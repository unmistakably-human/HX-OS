import { getFeature } from "@/lib/projects";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ featureId: string; conceptIndex: string }> }
) {
  const { featureId, conceptIndex } = await params;
  const idx = parseInt(conceptIndex, 10);

  let feature;
  try {
    feature = await getFeature(featureId);
  } catch {
    return new Response("Feature not found", { status: 404 });
  }

  const concept = feature.concepts?.[idx];
  if (!concept) {
    return new Response("Concept not found", { status: 404 });
  }

  // Escape backticks and ${} in wireframeHtml to prevent template literal injection
  const safeHtml = concept.wireframeHtml
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${concept.name} — ${feature.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: #F5F5F5;
      color: #333;
      min-height: 100vh;
    }
    #figma-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #18181b;
      color: white;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 99999;
      font-family: Inter, system-ui, sans-serif;
      font-size: 14px;
    }
    #figma-banner button {
      background: #E8713A;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: Inter, system-ui, sans-serif;
    }
    #figma-banner button:hover { background: #d4652f; }
    #figma-banner button:disabled { opacity: 0.6; cursor: not-allowed; }
    #figma-banner .status { font-size: 13px; color: #a1a1aa; }
    #figma-banner .success { color: #4ade80; }
    #figma-banner .error { color: #f87171; }
    #wireframe-content { padding-top: 52px; }
  </style>
</head>
<body>
  <div id="figma-banner">
    <span>Copy this wireframe to paste into Figma</span>
    <div style="display:flex;align-items:center;gap:12px;">
      <span id="banner-status" class="status"></span>
      <button id="copy-btn" onclick="copyToFigma()">Copy to Figma</button>
    </div>
  </div>
  <div id="wireframe-content">
    ${concept.wireframeHtml}
  </div>
  <script src="https://mcp.figma.com/mcp/html-to-design/capture.js"></script>
  <script>
    async function copyToFigma() {
      var btn = document.getElementById('copy-btn');
      var status = document.getElementById('banner-status');
      btn.disabled = true;
      btn.textContent = 'Capturing...';
      status.className = 'status';
      status.textContent = '';
      try {
        if (window.figma && window.figma.captureForDesign) {
          var result = await window.figma.captureForDesign({
            selector: '#wireframe-content'
          });
          if (result && result.success !== false) {
            status.className = 'status success';
            status.textContent = 'Copied! Paste into Figma (Cmd+V)';
            btn.textContent = 'Copied!';
          } else {
            throw new Error(result.error || 'Capture failed');
          }
        } else {
          throw new Error('Figma capture not loaded');
        }
      } catch(e) {
        status.className = 'status error';
        status.textContent = e.message || 'Failed';
        btn.textContent = 'Retry';
      }
      btn.disabled = false;
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
