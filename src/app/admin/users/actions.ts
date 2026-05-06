"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSSRClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = "HumanX@Welcome2026";
const ALLOWED_ROLES = ["admin", "project_manager", "design_lead", "designer"] as const;
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
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function isHumanxEmail(email: string): boolean {
  return email.endsWith("@humanx.io");
}

export async function createUser(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "designer") as AppRole;

  if (!email) {
    redirect("/admin/users?error=" + encodeURIComponent("Email required"));
  }
  if (!ALLOWED_ROLES.includes(role)) {
    redirect("/admin/users?error=" + encodeURIComponent("Invalid role"));
  }

  await requireAdmin();
  const sb = await createSSRClient();

  // Domain check — humanx.io only, unless admin has pre-added an allowlist exception.
  if (!isHumanxEmail(email)) {
    const { data: exception } = await sb
      .from("allowlist")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (!exception) {
      redirect(
        "/admin/users?error=" +
          encodeURIComponent(
            "Email must be @humanx.io. For external collaborators, add to allowlist first via SQL."
          )
      );
    }
  }

  const admin = adminClient();

  // 1. Allowlist (must exist before user-create so trigger uses correct role).
  const { error: allowErr } = await sb
    .from("allowlist")
    .upsert({ email, default_role: role });
  if (allowErr) {
    redirect("/admin/users?error=" + encodeURIComponent(allowErr.message));
  }

  // 2. Auth user — uses Admin API, default password, email pre-confirmed.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (error) {
    redirect("/admin/users?error=" + encodeURIComponent(error.message));
  }

  // 3. Trigger created the profile; backfill full_name if provided.
  if (fullName && data.user) {
    await admin.from("profiles").update({ full_name: fullName }).eq("id", data.user.id);
  }

  revalidatePath("/admin/users");
  redirect(
    "/admin/users?success=" +
      encodeURIComponent(
        `Created ${email}. Default password: ${DEFAULT_PASSWORD} (must change on first login).`
      )
  );
}

export async function setDeactivated(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const deactivated = formData.get("deactivated") === "true";
  if (!userId) return;
  await requireAdmin();
  const sb = await createSSRClient();
  const { error } = await sb
    .from("profiles")
    .update({ deactivated })
    .eq("id", userId);
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
  await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  revalidatePath("/admin/users");
  redirect(
    "/admin/users?success=" +
      encodeURIComponent(`Password reset to default. User must change on next login.`)
  );
}
