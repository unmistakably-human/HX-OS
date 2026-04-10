import type { DiscoveryDeck } from "./discovery-types";

function esc(s: string | undefined | null): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sec(label: string, title: string, body: string): string {
  return `<div style="page-break-inside:avoid;margin-bottom:28px"><div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:#9a9a9a;margin-bottom:4px">${esc(label)}</div><div style="font-size:18px;font-weight:500;color:#1a1a1a;margin-bottom:12px">${esc(title)}</div>${body}</div>`;
}

function crd(label: string, title: string, body: string): string {
  return `<div style="border:0.5px solid #E8713A;border-radius:10px;padding:14px 16px;margin-bottom:8px"><div style="font-size:10px;font-weight:500;color:#E8713A;margin-bottom:3px">${esc(label)}</div><div style="font-size:13px;font-weight:500;color:#1a1a1a;line-height:1.45">${esc(title)}</div><div style="margin-top:9px;padding-top:9px;border-top:0.5px solid rgba(0,0,0,0.1);font-size:12px;color:#6b6b6b;line-height:1.65">${body}</div></div>`;
}

function srf(title: string, body: string): string {
  return `<div style="background:#f5f5f3;border-radius:10px;padding:14px 16px;margin-bottom:8px"><div style="font-size:13px;font-weight:500;color:#E8713A;margin-bottom:4px">${esc(title)}</div><div style="font-size:12px;color:#6b6b6b;line-height:1.6">${esc(body)}</div></div>`;
}

function tbl(hs: string[], rs: string[][]): string {
  let h = `<table style="width:100%;font-size:11px;border-collapse:collapse;margin-bottom:10px"><thead><tr>${hs.map(x => `<th style="text-align:left;padding:6px;border-bottom:1px solid #ddd;color:#6b6b6b;font-weight:500">${esc(x)}</th>`).join("")}</tr></thead><tbody>`;
  rs.forEach(r => {
    h += `<tr>${r.map(c => `<td style="padding:5px 6px;border-bottom:1px solid #eee;color:#1a1a1a">${esc(c)}</td>`).join("")}</tr>`;
  });
  return h + "</tbody></table>";
}

export function buildExportHtml(data: DiscoveryDeck): string {
  const d = data;
  const cr = d.conversion_retention || { first_purchase: [], retention: [], takeaway: "" };
  const fb = d.feature_benchmark || { local: { brands: [], features: [] }, global: { brands: [], features: [] }, takeaway: "" };
  const gl = Array.isArray(d.glossary)
    ? d.glossary
    : (d.glossary as unknown as { platforms?: typeof d.glossary })?.platforms || [];

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(d.title || "Insights Deck")}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto;font-size:14px;line-height:1.5}@media print{body{padding:20px}}</style></head><body>`;

  // Cover
  html += `<div style="margin-bottom:32px"><div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#E8713A;margin-bottom:8px">HumanX Studio — Insights Deck</div><div style="font-size:22px;font-weight:500;margin-bottom:6px">${esc(d.title)}</div><div style="font-size:14px;color:#6b6b6b;margin-bottom:16px">${esc(d.subtitle)}</div><div style="display:flex;gap:12px;flex-wrap:wrap">`;
  (d.metrics || []).forEach(m => {
    html += `<div style="background:#f5f5f3;border-radius:6px;padding:8px 14px"><div style="font-size:10px;color:#9a9a9a">${esc(m.label)}</div><div style="font-size:16px;font-weight:500">${esc(m.value)}</div></div>`;
  });
  html += "</div></div>";

  // Category Insights
  let cb = "";
  (d.category_insights || []).forEach(x => {
    cb += crd("Insight " + x.number, x.headline, `<b>Evidence:</b> ${esc(x.evidence)}<br><br><b>Implication:</b> ${esc(x.implication)}`);
  });
  html += sec("Category insights", "5 insights on category evolution", cb);

  // Audience Insights
  let ab = "";
  (d.audience_insights || []).forEach(x => {
    ab += crd(x.segment, x.headline, `<b>Gap:</b> ${esc(x.gap)}<br><br><b>Benchmark:</b> ${esc(x.benchmark)}`);
  });
  html += sec("Audience insights", "5 segments with gaps and benchmarks", ab);

  // UX Benchmarks
  (d.ux_benchmarks || []).forEach(x => {
    let b = `<p style="font-size:12px;color:#6b6b6b;margin-bottom:10px"><b>Dominant:</b> ${(x.dominant?.players || []).join(", ")} — ${esc(x.dominant?.description)}</p>`;
    b += `<p style="font-size:12px;color:#6b6b6b;margin-bottom:10px"><b>Contrarian:</b> ${(x.contrarian?.players || []).join(", ")} — ${esc(x.contrarian?.description)}</p>`;
    if (x.cross_category) b += srf("Cross-category: " + x.cross_category.platform, x.cross_category.pattern);
    if (x.gap) b += srf("Underexplored space", x.gap);
    html += sec("UX benchmarking", x.attribute, b);
  });

  // Conversion & Retention
  let crb = tbl(["Platform", "Market", "Trigger"], (cr.first_purchase || []).map(x => [x.platform, x.market, x.trigger]));
  crb += tbl(["Platform", "Mechanism", "Verdict"], (cr.retention || []).map(x => [x.platform, x.mechanism, x.verdict_text]));
  if (cr.takeaway) crb += srf("Key takeaway", cr.takeaway);
  html += sec("Conversion & retention", "How competitors convert and retain", crb);

  // Feature Benchmark
  let fbb = `<b style="font-size:13px">Local brands</b>` + tbl(["Feature", ...(fb.local?.brands || [])], (fb.local?.features || []).map(f => [f.name, ...f.values]));
  fbb += `<b style="font-size:13px">Global brands</b>` + tbl(["Feature", ...(fb.global?.brands || [])], (fb.global?.features || []).map(f => [f.name, ...f.values]));
  if (fb.takeaway) fbb += srf("Key takeaway", fb.takeaway);
  html += sec("Feature benchmark", "Local vs. global", fbb);

  // Cross-Category
  let xb = "";
  (d.cross_category || []).forEach(x => {
    xb += crd(x.platform + " — " + x.industry, x.pattern, `<b>Transferable:</b> ${esc(x.transferable)}<br><br><b>Study:</b> ${esc(x.study)}`);
  });
  html += sec("Cross-category inspiration", "Patterns from outside the category", xb);

  // Opportunities
  let ob = "";
  (d.opportunities || []).forEach(x => {
    ob += `<div style="background:#f5f5f3;border-radius:10px;padding:14px 16px;margin-bottom:8px"><div style="font-size:14px;font-weight:500;margin-bottom:4px">${x.rank}. ${esc(x.title)}</div><div style="font-size:12px;color:#6b6b6b;line-height:1.6">${esc(x.description)} <b>Proof:</b> ${esc(x.proof)} <b>Risk:</b> ${esc(x.risk)}</div></div>`;
  });
  html += sec("Opportunity areas", "Ranked by impact", ob);

  // Glossary
  let gb = "";
  gl.forEach(x => {
    gb += crd(x.name + " (" + x.market + ")", (x.url || "") + " — " + (x.why || ""), "");
  });
  html += sec("Global glossary", "Platforms to study", gb);

  html += "</body></html>";
  return html;
}

export function downloadDeckHtml(data: DiscoveryDeck): void {
  const html = buildExportHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (data.title || "insights-deck").replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").toLowerCase() + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
