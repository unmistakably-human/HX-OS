import { supabase } from "./supabase";
import type { Product, Feature, ProductContext, Concept, ChatMessage } from "./types";

// ═══ PRODUCTS ═══

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, features(id, name, feature_type, phase_brief, phase_discovery, phase_design_concepts, phase_concepts, chosen_concept, updated_at)")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProduct(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProduct(name: string, company?: string): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert({ name, company: company || null })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: Record<string, unknown>): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ═══ FEATURES ═══

export async function listFeatures(productId: string): Promise<Feature[]> {
  const { data, error } = await supabase
    .from("features")
    .select("*")
    .eq("product_id", productId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getFeature(featureId: string): Promise<Feature> {
  const { data, error } = await supabase
    .from("features")
    .select("*")
    .eq("id", featureId)
    .single();

  if (error) throw error;
  return data;
}

export async function createFeature(productId: string, name: string, featureType: string): Promise<Feature> {
  const { data, error } = await supabase
    .from("features")
    .insert({ product_id: productId, name, feature_type: featureType })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFeature(featureId: string, updates: Record<string, unknown>): Promise<Feature> {
  const { data, error } = await supabase
    .from("features")
    .update(updates)
    .eq("id", featureId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFeature(featureId: string): Promise<void> {
  const { error } = await supabase
    .from("features")
    .delete()
    .eq("id", featureId);

  if (error) throw error;
}

// ═══ CONVENIENCE ═══

export async function saveProductContext(id: string, context: ProductContext): Promise<void> {
  await updateProduct(id, { product_context: context });
}

export async function saveEnrichedPcd(id: string, pcd: string): Promise<void> {
  await updateProduct(id, {
    enriched_pcd: pcd,
    phase_context: "complete",
    phase_discovery: "active",
  });
}

export async function saveDiscovery(id: string, insights: unknown): Promise<void> {
  await updateProduct(id, {
    discovery_insights: typeof insights === "string" ? insights : JSON.stringify(insights),
    phase_discovery: "complete",
  });
}

export async function saveFeatureBrief(featureId: string, brief: {
  problem: string;
  must_have: string;
  not_be: string;
  additional_context: string;
}): Promise<void> {
  await updateFeature(featureId, {
    ...brief,
    phase_brief: "complete",
    phase_discovery: "active",
  });
}

export async function saveFeatureDiscovery(featureId: string, discovery: string): Promise<void> {
  await updateFeature(featureId, {
    feature_discovery: discovery,
    phase_discovery: "complete",
    phase_concepts: "active",
  });
}

export async function saveConcepts(featureId: string, concepts: Concept[]): Promise<void> {
  await updateFeature(featureId, { concepts });
}

export async function saveChatMessages(featureId: string, messages: ChatMessage[]): Promise<void> {
  await updateFeature(featureId, { chat_messages: messages });
}

export async function selectConcept(featureId: string, conceptName: string): Promise<void> {
  await updateFeature(featureId, {
    chosen_concept: conceptName,
    phase_concepts: "complete",
  });
}
