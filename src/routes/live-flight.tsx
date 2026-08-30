import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  PlaneTakeoff,
  PlaneLanding,
  Home,
  Pause,
  Power,
  PowerOff,
  OctagonX,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Metric, StatusPill } from "@/components/common/StatCard";
import { AlertStack } from "@/components/common/AlertStack";
import { DroneMap } from "@/components/map/DroneMap";
import { useSafetyAlerts, useSettings, useTelemetry } from "@/hooks/useTelemetry";
import { useMissions, useTrail } from "@/hooks/useMission";
import { droneApi } from "@/api";
import type { CommandResult } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/live-flight")({
  head: () => ({
    meta: [
      { title: "Live Flight — AgriDrone GCS" },
      {
        name: "description",
        content:
          "Live flight control for the agricultural spraying drone: arm, take off, land, return to home and hold position with live map tracking.",
      },
      { property: "og:title", content: "Live Flight — AgriDrone GCS" },
      { property: "og:description", content: "Real-time UAV flight controls and map tracking." },
    ],
  }),
  component: LiveFlight,
});

function LiveFlight() {
  const t = useTelemetry();
  const settings = useSettings();
  const alerts = useSafetyAlerts(t);
  const trail = useTrail();
  const [missions] = useMissions();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<CommandResult>) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res.ok)
        toast.success(res.message, {
          description: res.simulated ? "SIMULATION — no hardware command was sent." : undefined,
        });
      else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Command failed");
    } finally {
      setBusy(null);
    }
  };

  const controls = [
    { key: "arm", label: "ARM", icon: Power, fn: () => droneApi.arm(), tone: "primary" as const },
    { key: "disarm", label: "DISARM", icon: PowerOff, fn: () => droneApi.disarm(), tone: "muted" as const },
    { key: "takeoff", label: "TAKE OFF", icon: PlaneTakeoff, fn: () => droneApi.takeoff(settings.rtlAltitude), tone: "primary" as const },
    { key: "land", label: "LAND", icon: PlaneLanding, fn: () => droneApi.land(), tone: "muted" as const },
    { key: "rtl", label: "RETURN TO HOME", icon: Home, fn: () => droneApi.rtl(), tone: "info" as const },
    { key: "hold", label: "HOLD POSITION", icon: Pause, fn: () => droneApi.hold(), tone: "muted" as const },
    { key: "estop", label: "EMERGENCY STOP", icon: OctagonX, fn: () => droneApi.emergencyStop(), tone: "danger" as const },
  ];

  const toneClass = {
    primary: "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20",
    muted: "border-border bg-muted/40 text-foreground hover:bg-muted",
    info: "border-info/50 bg-info/10 text-info hover:bg-info/20",
    danger: "border-destructive/60 bg-destructive/15 text-destructive hover:bg-destructive/25",
  };

  return (
    <AppShell title="Live Flight" subtitle="Manual flight commands routed through the hardware abstraction layer">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel title="Live Map" bodyClassName="p-0">
          <div className="h-[420px] w-full xl:h-[620px]">
            <DroneMap telemetry={t} waypoints={missions[0]?.waypoints ?? []} trail={trail} follow />
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Panel title="Flight State">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Latitude" value={<span className="text-sm">{t.latitude.toFixed(6)}</span>} />
              <Metric label="Longitude" value={<span className="text-sm">{t.longitude.toFixed(6)}</span>} />
              <Metric label="Altitude" value={t.altitude.toFixed(1)} unit="m" tone="primary" />
              <Metric label="Speed" value={t.speed.toFixed(1)} unit="m/s" />
              <Metric label="Heading" value={Math.round(t.heading)} unit="°" />
              <Metric label="Satellites" value={t.gps_satellites} />
              <Metric label="Battery" value={t.battery_percentage.toFixed(0)} unit="%" />
              <Metric label="Signal" value={t.signal_strength} unit="%" />
              <div className="col-span-2 flex flex-wrap gap-2">
                <StatusPill label={t.armed ? "Armed" : "Disarmed"} tone={t.armed ? "warn" : "muted"} pulse={t.armed} />
                <StatusPill label={t.flight_mode} tone="info" />
              </div>
            </div>
          </Panel>

          <Panel title="Flight Controls">
            <div className="grid gap-2">
              {controls.map(({ key, label, icon: Icon, fn, tone }) => (
                <button
                  key={key}
                  disabled={busy !== null}
                  onClick={() => run(key, fn)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors disabled:opacity-50",
                    toneClass[tone],
                  )}
                >
                  {busy === key ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
              {settings.simulationMode
                ? "SIMULATION MODE — commands change simulated state only. Connect a backend adapter (Pixhawk/MAVLink) to fly real hardware."
                : "LIVE MODE — commands are forwarded to the backend hardware adapter."}
            </p>
          </Panel>

          <Panel title="Safety">
            <AlertStack alerts={alerts} compact />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
