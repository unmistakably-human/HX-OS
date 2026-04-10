import type { Product } from "./types";

/**
 * Truncate enriched PCD at the nearest paragraph break.
 */
export function truncatePCD(pcd: string | null, maxChars = 3000): string {
  if (!pcd) return "";
  if (pcd.length <= maxChars) return pcd;
  const cut = pcd.lastIndexOf("\n\n", maxChars);
  return pcd.slice(0, cut > maxChars * 0.5 ? cut : maxChars) + "\n\n[truncated]";
}

/**
 * Build a cacheable product context block for use as `cachedContext` in Claude calls.
 * Combines enriched PCD, design tokens, and product metadata into one stable string.
 * This should be passed via `cachedContext` (not in the user message) so it gets cached
 * across multiple calls within the same product/feature session.
 */
export function buildProductContext(product: Product, maxPcdChars = 3000): string {
  const parts: string[] = [];

  // Product identity
  parts.push(`Product: ${product.name}${product.company ? ` (${product.company})` : ""}`);

  // Enriched PCD
  if (product.enriched_pcd) {
    parts.push("══ ENRICHED PRODUCT CONTEXT ══\n" + truncatePCD(product.enriched_pcd, maxPcdChars));
  }

  // Design tokens
  const ctx = product.product_context;
  if (ctx) {
    const tokenParts: string[] = [];
    if (ctx.colors) tokenParts.push(`Colors: ${ctx.colors}`);
    if (ctx.fonts) tokenParts.push(`Fonts: ${ctx.fonts}`);
    if (ctx.designTokens) {
      const dt = ctx.designTokens;
      if (dt.brandColors?.length) {
        tokenParts.push(`Brand colors: ${dt.brandColors.map((c) => `${c.name}: ${c.hex}`).join(", ")}`);
      }
      if (dt.neutrals?.length) {
        tokenParts.push(`Neutrals: ${dt.neutrals.map((c) => `${c.name}: ${c.hex}`).join(", ")}`);
      }
      if (dt.typography?.length) {
        tokenParts.push(`Typography: ${dt.typography.map((t) => `${t.level}: ${t.font} ${t.weight}${t.size ? ` ${t.size}` : ""}`).join(", ")}`);
      }
      if (dt.gradient) {
        tokenParts.push(`Gradient: ${dt.gradient}`);
      }
    }
    if (tokenParts.length > 0) {
      parts.push("══ DESIGN TOKENS ══\n" + tokenParts.join("\n"));
    }

    // Platform
    if (ctx.platform) parts.push(`Platform: ${ctx.platform}`);
  }

  return parts.join("\n\n");
}

/**
 * Build a cacheable feature context block.
 */
export function buildFeatureContext(feature: {
  name: string;
  problem?: string | null;
  must_have?: string | null;
  not_be?: string | null;
  additional_context?: string | null;
  feature_discovery?: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`Feature: ${feature.name}`);
  if (feature.problem) parts.push(`Problem: ${feature.problem}`);
  if (feature.must_have) parts.push(`Must-have: ${feature.must_have}`);
  if (feature.not_be) parts.push(`Should NOT be: ${feature.not_be}`);
  if (feature.additional_context) parts.push(`Context: ${feature.additional_context}`);
  if (feature.feature_discovery) {
    parts.push("Feature Discovery:\n" + feature.feature_discovery.slice(0, 2000));
  }
  return parts.join("\n");
}
