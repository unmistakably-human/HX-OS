/**
 * Seeds the four admin auth users with the default initial password.
 * Idempotent: skips users that already exist.
 *
 * Usage: npx tsx scripts/seed-admins.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = "HumanX@Welcome2026";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMINS = [
  { email: "jay.k@humanx.io",      full_name: "Jay Khut" },
  { email: "rishabh@juicelabs.ai", full_name: "Rishabh" },
  { email: "design@humanx.io",     full_name: "Design Team" },
  { email: "krupali@humanx.io",    full_name: "Krupali" },
];

async function main() {
  for (const { email, full_name } of ADMINS) {
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (found) {
      console.log(`✓ ${email} already exists (id=${found.id}) — skipping`);
      continue;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      console.error(`✗ ${email}: ${error.message}`);
      continue;
    }
    console.log(`✓ created ${email} (id=${data.user.id})`);
  }

  console.log(`\nInitial password for all admins: ${DEFAULT_PASSWORD}`);
  console.log(`(must_change_password is true — they'll be forced to change it on first login)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
