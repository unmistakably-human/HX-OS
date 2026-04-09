import { supabase } from "@/lib/supabase";
import { extractFromPCD, extractFromDiscovery, extractFromInsights, extractFromConcepts } from "@/lib/knowledge";

export async function POST() {
  const results: string[] = [];

  try {
    // Get all products with data
    const { data: products } = await supabase
      .from("products")
      .select("id, name, enriched_pcd, discovery_insights");

    if (!products?.length) {
      return Response.json({ message: "No products found" });
    }

    for (const product of products) {
      // Extract from PCD (uses Claude — runs sequentially to avoid rate limits)
      if (product.enriched_pcd) {
        try {
          await extractFromPCD(product.id, product.enriched_pcd);
          results.push(`${product.name}: PCD extracted`);
        } catch (err) {
          results.push(`${product.name}: PCD failed - ${err}`);
        }
      }

      // Extract from discovery (no Claude call — direct mapping)
      if (product.discovery_insights) {
        try {
          const deck = typeof product.discovery_insights === "string"
            ? JSON.parse(product.discovery_insights)
            : product.discovery_insights;
          await extractFromDiscovery(product.id, deck);
          results.push(`${product.name}: Discovery extracted`);
        } catch (err) {
          results.push(`${product.name}: Discovery failed - ${err}`);
        }
      }
    }

    // Get all features with insights or concepts
    const { data: features } = await supabase
      .from("features")
      .select("id, product_id, name, insights, design_concepts, baseline, beyond_screen");

    if (features?.length) {
      for (const feature of features) {
        if (Array.isArray(feature.insights) && feature.insights.length > 0) {
          try {
            await extractFromInsights(feature.product_id, feature.id, feature.insights);
            results.push(`Feature "${feature.name}": Insights extracted`);
          } catch (err) {
            results.push(`Feature "${feature.name}": Insights failed - ${err}`);
          }
        }

        if (Array.isArray(feature.design_concepts) && feature.design_concepts.length > 0) {
          try {
            await extractFromConcepts(
              feature.product_id,
              feature.id,
              feature.design_concepts,
              feature.baseline,
              feature.beyond_screen
            );
            results.push(`Feature "${feature.name}": Concepts extracted`);
          } catch (err) {
            results.push(`Feature "${feature.name}": Concepts failed - ${err}`);
          }
        }
      }
    }

    return Response.json({ results });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
