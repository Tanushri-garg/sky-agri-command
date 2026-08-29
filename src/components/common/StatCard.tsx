import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  icon,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("panel flex flex-col overflow-hidden", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {icon}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  unit,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: "default" | "primary" | "warning" | "danger" | "muted";
  className?: string;
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    warning: "text-warning",
    danger: "text-destructive",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("font-mono text-xl leading-tight font-semibold tabular-nums", toneClass)}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

export function StatusPill({
  label,
  tone = "muted",
  pulse,
}: {
  label: string;
  tone?: "ok" | "warn" | "danger" | "info" | "muted";
  pulse?: boolean;
}) {
  const map = {
    ok: "border-primary/40 bg-primary/10 text-primary",
    warn: "border-warning/40 bg-warning/10 text-warning",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    info: "border-info/40 bg-info/10 text-info",
    muted: "border-border bg-muted/50 text-muted-foreground",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        map[tone],
      )}
    >
      <span className={cn("size-1.5 rounded-full bg-current", pulse && "animate-pulse")} />
      {label}
    </span>
  );
}

export function Bar({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "warning" | "danger" | "info";
}) {
  const bg = {
    primary: "bg-primary",
    warning: "bg-warning",
    danger: "bg-destructive",
    info: "bg-info",
  }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all duration-500", bg)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
