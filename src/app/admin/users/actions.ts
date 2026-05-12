"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSSRClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = "HumanX@Welcome2026";
const ALLOWED_ROLES = ["admin", "product_lead", "designer"] as const;
type AppRole = (typeof ALLOWED_ROLES)[number];

async function requireAdmin() {
  const supabase = await createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, deactivated")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin" || profile.deactivated) {
    throw new Error("Forbidden — admin only");
  }
  return user;
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function changeRole(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as AppRole;
  if (!userId) return;
  if (!ALLOWED_ROLES.includes(role)) {
    redirect("/admin/users?error=" + encodeURIComponent("Invalid role"));
  }
  const me = await requireAdmin();
  if (userId === me.id && role !== "admin") {
    redirect(
      "/admin/users?error=" +
        encodeURIComponent("You can't demote yourself out of admin — ask another admin to do it.")
    );
  }
  const sb = await createSSRClient();
  const { error } = await sb.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    redirect("/admin/users?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/users");
}

export async function setDeactivated(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const deactivated = formData.get("deactivated") === "true";
  if (!userId) return;
  await requireAdmin();
  const sb = await createSSRClient();
  const { error } = await sb.from("profiles").update({ deactivated }).eq("id", userId);
  if (error) {
    redirect("/admin/users?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/users");
}

export async function resetPassword(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return;
  await requireAdmin();
  const admin = adminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: DEFAULT_PASSWORD,
  });
  if (error) {
    redirect("/admin/users?error=" + encodeURIComponent(error.message));
  }
  await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
  revalidatePath("/admin/users");
  redirect(
    "/admin/users?success=" +
      encodeURIComponent(`Password reset to default. User must change on next login.`)
  );
}
