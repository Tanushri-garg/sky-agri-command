import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plane, Loader2 } from "lucide-react";
import { authService } from "@/services/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Operator Sign In — AgriDrone GCS" },
      { name: "description", content: "Sign in to the AgriDrone ground control station to fly and monitor the agricultural spraying drone." },
      { property: "og:title", content: "Operator Sign In — AgriDrone GCS" },
      { property: "og:description", content: "Secure operator access to the AgriDrone ground control station." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("operator@agridrone.in");
  const [password, setPassword] = useState("demo1234");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authService.signIn(email, password);
      toast.success("Signed in");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel w-full max-w-sm p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md border border-primary/40 bg-primary/10">
            <Plane className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">AgriDrone GCS</h1>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Ground Control Station
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-input/40 px-3 py-2 text-sm outline-none focus:border-ring"
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-input/40 px-3 py-2 text-sm outline-none focus:border-ring"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Sign in
          </button>
        </form>

        <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
          DEMO AUTH — sessions are stored locally. Swap <code>src/services/auth.ts</code> for
          Supabase auth to enable real accounts.
        </p>
      </div>
    </div>
  );
}
