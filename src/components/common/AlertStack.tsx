import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { SafetyAlert } from "@/types";
import { cn } from "@/lib/utils";

export function AlertStack({ alerts, compact }: { alerts: SafetyAlert[]; compact?: boolean }) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
        <ShieldCheck className="size-4" />
        All safety checks nominal
      </div>
    );
  }
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
      {alerts.map((a) => (
        <div
          key={a.code}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2",
            a.level === "critical"
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-warning/40 bg-warning/10 text-warning",
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em]">{a.label}</p>
            <p className="text-[11px] text-foreground/80">{a.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
