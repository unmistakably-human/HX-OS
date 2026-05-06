import { redirect } from "next/navigation";
import { changePassword } from "./actions";
import { createClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <form
        action={changePassword}
        className="w-full max-w-sm rounded-xl border border-border bg-surface-card p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You signed in with the default password. Pick a new one to continue.
        </p>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">At least 10 characters.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
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
        </div>
      </form>
    </main>
  );
}
