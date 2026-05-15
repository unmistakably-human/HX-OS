import Link from "next/link";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <form
        action={login}
        className="w-full max-w-sm rounded-xl border border-border bg-surface-card p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/humanx-logo.svg" alt="HumanX Labs" className="h-9 w-auto" />
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              HumanX Labs — internal access only
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@humanx.io"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
            />
            <p className="text-xs text-muted-foreground">
              First-time admins, default password:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                HumanX@Welcome2026
              </code>
            </p>
          </div>

          {next && <input type="hidden" name="next" value={next} />}

          {error && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            Sign in
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-foreground hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
