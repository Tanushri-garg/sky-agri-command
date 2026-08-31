import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { SprayCan, Droplets, Gauge, RefreshCw, Play, Square } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Metric, StatusPill, Bar } from "@/components/common/StatCard";
import { AlertStack } from "@/components/common/AlertStack";
import { useSafetyAlerts, useSettings, useTelemetry } from "@/hooks/useTelemetry";
import { useSprayStatus } from "@/hooks/useMission";
import { sprayApi } from "@/api";
import type { CommandResult } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/spray-control")({
  head: () => ({
    meta: [
      { title: "Spray Control — AgriDrone GCS" },
      {
        name: "description",
        content:
          "Control the pesticide spray system: tank level, pump state, flow rate and nozzle status with built-in safety interlocks.",
      },
      { property: "og:title", content: "Spray Control — AgriDrone GCS" },
      { property: "og:description", content: "Pump, tank and flow control for the spraying drone." },
    ],
  }),
  component: SprayControl,
});

const btn =
  "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors disabled:opacity-50";

function SprayControl() {
  const t = useTelemetry();
  const settings = useSettings();
  const alerts = useSafetyAlerts(t);
  const spray = useSprayStatus();

  const tankPct = spray?.tank_percentage ?? 0;
  const blockedReason = !spray
    ? "Spray subsystem offline"
    : tankPct <= 2
      ? "Tank empty"
      : tankPct < settings.minTankLevel
        ? `Tank below minimum (${settings.minTankLevel}%)`
        : !settings.simulationMode && !t.armed
          ? "Drone must be armed in live hardware mode"
          : t.battery_percentage < 15
            ? "Battery critically low"
            : null;

  const run = async (fn: () => Promise<CommandResult>) => {
    const res = await fn();
    toast[res.ok ? "success" : "error"](res.message, {
      description: res.simulated ? "SIMULATION — pump state changed in software only." : undefined,
    });
  };

  return (
    <AppShell title="Spray Control" subtitle="Pesticide delivery system — pump, tank, flow and nozzles">
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Tank" icon={<Droplets className="size-3.5" />}>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Capacity" value={(spray?.tank_capacity ?? settings.tankCapacity).toFixed(1)} unit="L" />
            <Metric label="Current level" value={(spray?.tank_level ?? 0).toFixed(2)} unit="L" tone="primary" />
            <div className="col-span-2">
              <Metric
                label="Tank percentage"
                value={tankPct.toFixed(0)}
                unit="%"
                tone={tankPct < settings.minTankLevel ? "warning" : "primary"}
              />
              <div className="mt-2">
                <Bar value={tankPct} tone={tankPct < settings.minTankLevel ? "warning" : "info"} />
              </div>
              {tankPct < settings.minTankLevel && (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-warning">
                  Low level warning
                </p>
              )}
            </div>
            <button
              onClick={() => {
                sprayApi.refill();
                toast.success("Tank refilled (simulation)");
              }}
              className={cn(btn, "col-span-2 border-border bg-muted/40 hover:bg-muted")}
            >
              <RefreshCw className="size-4" /> Refill tank (sim)
            </button>
          </div>
        </Panel>

        <Panel title="Pump" icon={<SprayCan className="size-3.5" />}>
          <div className="grid grid-cols-2 gap-4">
            <Metric
              label="Pump state"
              value={<span className="text-base">{spray?.pump_on ? "RUNNING" : "STOPPED"}</span>}
              tone={spray?.pump_on ? "primary" : "muted"}
            />
            <Metric label="Pump voltage" value={(spray?.pump_voltage ?? 0).toFixed(1)} unit="V" />
            <Metric label="Nozzles" value={spray?.nozzle_count ?? settings.nozzleCount} />
            <Metric
              label="Spray status"
              value={<span className="text-base">{spray?.spraying ? "SPRAYING" : "IDLE"}</span>}
              tone={spray?.spraying ? "primary" : "muted"}
            />
            <div className="col-span-2 flex flex-wrap gap-2">
              <StatusPill label={t.armed ? "Armed" : "Disarmed"} tone={t.armed ? "warn" : "muted"} />
              <StatusPill
                label={spray?.flow_sensor_ok ? "Flow sensor OK" : "Flow fault"}
                tone={spray?.flow_sensor_ok ? "ok" : "danger"}
                pulse={!spray?.flow_sensor_ok}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Flow" icon={<Gauge className="size-3.5" />}>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Flow rate" value={(spray?.flow_rate ?? 0).toFixed(2)} unit="L/min" tone="primary" />
            <Metric label="Limit" value={settings.flowRateLimit.toFixed(1)} unit="L/min" />
            <Metric label="Total sprayed" value={(spray?.total_sprayed ?? 0).toFixed(2)} unit="L" />
            <Metric
              label="Sensor"
              value={<span className="text-base">YF-S401</span>}
              tone={spray?.flow_sensor_ok ? "muted" : "danger"}
            />
            <div className="col-span-2">
              <Bar
                value={((spray?.flow_rate ?? 0) / Math.max(0.1, settings.flowRateLimit)) * 100}
                tone={(spray?.flow_rate ?? 0) > settings.flowRateLimit ? "danger" : "primary"}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Spray Commands" className="xl:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              disabled={!!blockedReason || spray?.spraying}
              onClick={() => run(() => sprayApi.start())}
              className={cn(btn, "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20")}
            >
              <Play className="size-4" /> Start spray
            </button>
            <button
              disabled={!spray?.spraying}
              onClick={() => run(() => sprayApi.stop())}
              className={cn(btn, "border-destructive/60 bg-destructive/15 text-destructive hover:bg-destructive/25")}
            >
              <Square className="size-4" /> Stop spray
            </button>
          </div>
          {blockedReason && (
            <p className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-destructive">
              Spray blocked — {blockedReason}
            </p>
          )}
          <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
            {settings.simulationMode
              ? "SIMULATION MODE — the pump MOSFET is not driven. Safety interlocks (arm state, tank level, flow feedback, battery) are still enforced so they can be demonstrated safely."
              : "LIVE MODE — commands are forwarded to the ESP32 spray node through the backend adapter."}
          </p>
        </Panel>

        <Panel title="Safety Interlocks">
          <AlertStack alerts={alerts} compact />
        </Panel>
      </div>
    </AppShell>
  );
}
