import type { Sensor } from "@/types";
import { StatusPill } from "./StatCard";
import { cn } from "@/lib/utils";

const toneFor = (s: Sensor) =>
  !s.online ? "danger" : s.status === "error" ? "danger" : s.status === "warning" ? "warn" : "ok";

export function SensorCard({ sensor }: { sensor: Sensor }) {
  const tone = toneFor(sensor);
  return (
    <article
      className={cn(
        "panel p-4 transition-colors",
        tone === "danger" && "border-destructive/50",
        tone === "warn" && "border-warning/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{sensor.label}</h3>
          <p className="truncate text-[11px] text-muted-foreground">{sensor.hardware}</p>
        </div>
        <StatusPill
          label={sensor.online ? sensor.status.toUpperCase() : "OFFLINE"}
          tone={tone}
          pulse={tone !== "ok"}
        />
      </div>

      <p className="mt-4 font-mono text-3xl font-semibold tabular-nums text-foreground">
        {sensor.value}
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">{sensor.unit}</span>
      </p>

      <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
        {sensor.description}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
        Updated {new Date(sensor.last_update).toLocaleTimeString()}
      </p>
    </article>
  );
}
