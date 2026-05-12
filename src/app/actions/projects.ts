"use server";

import { createClient as createSSR } from "@/lib/supabase-server";
import { createClient as createServiceRole } from "@supabase/supabase-js";

const ALLOWED_CREATE_ROLES = ["admin", "product_lead"];

function adminClient() {
  return createServiceRole(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Creates a project + the creator's project_members row atomically.
 * Bypasses RLS via service-role so we don't fight the trigger/policy
 * dance — replaces the legacy auto-owner trigger.
 *
 * Returns the new product row. Throws if the user isn't logged in or
 * lacks the right global role.
 */
export async function createProjectAction(name: string, company: string | null) {
  const supabase = await createSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, deactivated")
    .eq("id", user.id)
    .single();

  if (!profile || profile.deactivated) {
    throw new Error("Account is deactivated");
  }
  if (!ALLOWED_CREATE_ROLES.includes(profile.role)) {
    throw new Error("You don't have permission to create projects");
  }

  const admin = adminClient();

  const { data: product, error: productErr } = await admin
    .from("products")
    .insert({ name, company })
    .select()
    .single();
  if (productErr) throw productErr;

  const { error: memberErr } = await admin
    .from("project_members")
    .insert({
      project_id: product.id,
      user_id: user.id,
      role_in_project: "owner",
    });

  if (memberErr) {
    // Roll back the product we just created so we don't orphan it.
    await admin.from("products").delete().eq("id", product.id);
    throw memberErr;
  }

  return product;
}
