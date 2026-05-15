import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { changePassword } from "./actions";
import { createClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

export default async function SetupPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/humanx-logo.svg" alt="HumanX Labs" className="h-9 w-auto" />
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You signed in with the default password. Pick a new one to continue.
            </p>
          </div>
        </div>

        <form action={changePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">At least 10 characters.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              required
              minLength={10}
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            Set password and continue
          </Button>
        </form>

        <form action="/logout" method="POST" className="mt-4">
          <button
            type="submit"
            className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </button>
        </form>
      </div>
    </main>
  );
}
