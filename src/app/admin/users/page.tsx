import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound, UserX, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { CreateUserForm } from "./create-user-form";
import { setDeactivated, resetPassword } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  project_manager: "Project Manager",
  design_lead: "Design Lead",
  designer: "Designer",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-violet-100 text-violet-900",
  project_manager: "bg-blue-100 text-blue-900",
  design_lead: "bg-emerald-100 text-emerald-900",
  designer: "bg-slate-100 text-slate-900",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || me.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-page px-4">
        <div className="max-w-md rounded-xl border border-border bg-surface-card p-8 text-center">
          <h1 className="text-xl font-semibold">Forbidden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only admins can manage users.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, must_change_password, deactivated, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-surface-page">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">User access</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create accounts for leads, managers, and designers. New users sign in with the
              default password and must change it on first login.
            </p>
          </div>
        </div>

        {/* Create form */}
        <section className="mb-8 rounded-xl border border-border bg-surface-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Create new user
          </h2>
          <CreateUserForm />
          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
              {success}
            </p>
          )}
        </section>

        {/* User list */}
        <section className="rounded-xl border border-border bg-surface-card">
          <h2 className="border-b border-border px-6 py-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Existing users ({profiles?.length ?? 0})
          </h2>
          {!profiles || profiles.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {profiles.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-4 px-6 py-4 ${p.deactivated ? "opacity-50" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {p.full_name || p.email.split("@")[0]}
                      </span>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          ROLE_BADGE[p.role] ?? "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {ROLE_LABEL[p.role] ?? p.role}
                      </span>
                      {p.must_change_password && !p.deactivated && (
                        <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Pending first login
                        </span>
                      )}
                      {p.deactivated && (
                        <span className="inline-flex shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900">
                          Deactivated
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                  </div>

                  <form action={resetPassword}>
                    <input type="hidden" name="user_id" value={p.id} />
                    <button
                      type="submit"
                      title="Reset to default password"
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset password
                    </button>
                  </form>

                  <form action={setDeactivated}>
                    <input type="hidden" name="user_id" value={p.id} />
                    <input
                      type="hidden"
                      name="deactivated"
                      value={p.deactivated ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      title={p.deactivated ? "Reactivate" : "Deactivate"}
                      disabled={p.id === user.id}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {p.deactivated ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5" />
                          Reactivate
                        </>
                      ) : (
                        <>
                          <UserX className="h-3.5 w-3.5" />
                          Deactivate
                        </>
                      )}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Default password for new accounts and resets:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">HumanX@Welcome2026</code>
        </p>
      </div>
    </main>
  );
}
