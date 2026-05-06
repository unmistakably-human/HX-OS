import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          HumanX Labs — internal access only
        </p>

        <div className="mt-6 space-y-4">
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
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
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
        </div>
      </form>
    </main>
  );
}
