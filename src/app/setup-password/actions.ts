"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

const DEFAULT_PASSWORD = "HumanX@Welcome2026";

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 10) {
    redirect("/setup-password?error=" + encodeURIComponent("Password must be at least 10 characters"));
  }
  if (password === DEFAULT_PASSWORD) {
    redirect("/setup-password?error=" + encodeURIComponent("Pick a new password — you can't keep the default"));
  }
  if (password !== confirm) {
    redirect("/setup-password?error=" + encodeURIComponent("Passwords don't match"));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: updateErr } = await supabase.auth.updateUser({ password });
  if (updateErr) {
    redirect("/setup-password?error=" + encodeURIComponent(updateErr.message));
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (profileErr) {
    redirect("/setup-password?error=" + encodeURIComponent(profileErr.message));
  }

  redirect("/");
}
