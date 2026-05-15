"use server";

import { redirect } from "next/navigation";
import { createClient as createSSR } from "@/lib/supabase-server";
import { createClient as createServiceRole } from "@supabase/supabase-js";

const ALLOWED_DOMAINS = ["humanx.io", "juicelabs.ai"];

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var"
    );
  }
  return createServiceRole(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email) {
    redirect("/signup?error=" + encodeURIComponent("Email is required"));
  }
  if (password.length < 10) {
    redirect("/signup?error=" + encodeURIComponent("Password must be at least 10 characters"));
  }
  if (password !== confirm) {
    redirect("/signup?error=" + encodeURIComponent("Passwords don't match"));
  }

  const domain = email.split("@")[1] ?? "";
  if (!ALLOWED_DOMAINS.includes(domain)) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("Sign-up is restricted to @humanx.io or @juicelabs.ai emails")
    );
  }

  // Use admin API so the user is email-confirmed immediately — the DB
  // trigger still enforces the same domain check as a defence-in-depth.
  const admin = adminClient();
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) {
    redirect("/signup?error=" + encodeURIComponent(createErr.message));
  }

  // Sign in immediately so they land on the dashboard, not back at /login.
  const supabase = await createSSR();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    redirect("/login?error=" + encodeURIComponent(signInErr.message));
  }

  redirect("/");
}
