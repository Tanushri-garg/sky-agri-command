import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Metric, StatusPill } from "@/components/common/StatCard";
import { useTelemetry, useTelemetryHistory } from "@/hooks/useTelemetry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/telemetry")({
  head: () => ({
    meta: [
      { title: "Telemetry — AgriDrone GCS" },
      {
        name: "description",
        content:
          "Real-time telemetry charts for altitude, speed, battery, flow rate, GPS satellites and signal strength streamed from the spraying drone.",
      },
      { property: "og:title", content: "Telemetry — AgriDrone GCS" },
      { property: "og:description", content: "Live charts of flight and spray telemetry." },
    ],
  }),
  component: TelemetryPage,
});

type SeriesKey = "altitude" | "speed" | "battery_percentage" | "flow_rate" | "gps_satellites" | "signal_strength";

const SERIES: { key: SeriesKey; label: string; unit: string; color: string; area?: boolean }[] = [
  { key: "altitude", label: "Altitude", unit: "m", color: "var(--color-primary)", area: true },
  { key: "speed", label: "Ground speed", unit: "m/s", color: "var(--color-info)" },
  { key: "battery_percentage", label: "Battery", unit: "%", color: "var(--color-warning)", area: true },
  { key: "flow_rate", label: "Spray flow", unit: "L/min", color: "var(--color-chart-2)", area: true },
  { key: "gps_satellites", label: "GPS satellites", unit: "sats", color: "var(--color-chart-4)" },
  { key: "signal_strength", label: "Signal strength", unit: "%", color: "var(--color-chart-5)" },
];

const WINDOWS = [
  { label: "1 min", points: 60 },
  { label: "3 min", points: 180 },
  { label: "All", points: 100000 },
];

function TelemetryPage() {
  const t = useTelemetry();
  const history = useTelemetryHistory();
  const [win, setWin] = useState(1);

  const data = useMemo(() => {
    const points = WINDOWS[win]!.points;
    return history.slice(-points).map((h) => ({
      time: new Date(h.timestamp).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
      altitude: Number(h.altitude.toFixed(2)),
      speed: Number(h.speed.toFixed(2)),
      battery_percentage: Number(h.battery_percentage.toFixed(1)),
      flow_rate: Number(h.flow_rate.toFixed(2)),
      gps_satellites: h.gps_satellites,
      signal_strength: Number(h.signal_strength.toFixed(0)),
    }));
  }, [history, win]);

  return (
    <AppShell title="Telemetry" subtitle="Live data stream — 1 Hz sampling with rolling history buffer">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill
          label={t.connection === "connected" ? "Stream live" : "Stream offline"}
          tone={t.connection === "connected" ? "ok" : "danger"}
          pulse={t.connection === "connected"}
        />
        <StatusPill label={`${history.length} samples buffered`} tone="muted" />
        <div className="ml-auto flex gap-1 rounded-md border border-border bg-card p-1">
          {WINDOWS.map((w, i) => (
            <button
              key={w.label}
              onClick={() => setWin(i)}
              className={cn(
                "rounded px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors",
                i === win ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Altitude" value={t.altitude.toFixed(1)} unit="m" tone="primary" />
        <Metric label="Speed" value={t.speed.toFixed(1)} unit="m/s" />
        <Metric label="Battery" value={t.battery_percentage.toFixed(0)} unit="%" tone="warning" />
        <Metric label="Flow" value={t.flow_rate.toFixed(2)} unit="L/min" />
        <Metric label="Satellites" value={t.gps_satellites} />
        <Metric label="Signal" value={t.signal_strength.toFixed(0)} unit="%" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {SERIES.map((s) => (
          <Panel key={s.key} title={`${s.label} (${s.unit})`} bodyClassName="p-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {s.area ? (
                  <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" minTickGap={40} />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={s.key}
                      stroke={s.color}
                      strokeWidth={2}
                      fill={`url(#g-${s.key})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" minTickGap={40} />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={s.key}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
