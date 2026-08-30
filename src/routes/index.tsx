import { createFileRoute } from "@tanstack/react-router";
import {
  Plane,
  BatteryMedium,
  Satellite,
  Gauge,
  SprayCan,
  Route as RouteIcon,
  MapIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Metric, StatusPill, Bar } from "@/components/common/StatCard";
import { AlertStack } from "@/components/common/AlertStack";
import { DroneMap } from "@/components/map/DroneMap";
import { useSafetyAlerts, useSettings, useTelemetry } from "@/hooks/useTelemetry";
import { useMissionProgress, useMissions, useTrail } from "@/hooks/useMission";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriDrone GCS — Spraying Drone Dashboard" },
      {
        name: "description",
        content:
          "Ground control dashboard for an IoT agricultural pesticide spraying drone: live telemetry, mission progress, spray tank status and field map.",
      },
      { property: "og:title", content: "AgriDrone GCS — Spraying Drone Dashboard" },
      {
        property: "og:description",
        content: "Live telemetry, mission progress and spray control for an agriculture UAV.",
      },
    ],
  }),
  component: Dashboard,
});

function fmtTime(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Dashboard() {
  const t = useTelemetry();
  const settings = useSettings();
  const alerts = useSafetyAlerts(t);
  const progress = useMissionProgress();
  const trail = useTrail();
  const [missions] = useMissions();
  const activeMission = missions.find((m) => m.id === progress.mission_id) ?? missions[0];
  const tankPct = (t.tank_level / t.tank_capacity) * 100;

  return (
    <AppShell title="Mission Dashboard" subtitle="Live overview of the spraying UAV and active field mission">
      <div className="grid gap-4">
        <AlertStack alerts={alerts} />

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Drone" icon={<Plane className="size-3.5" />}>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Drone ID" value={<span className="text-sm">{settings.droneId}</span>} />
              <Metric
                label="Flight mode"
                value={<span className="text-sm">{t.flight_mode}</span>}
                tone="primary"
              />
              <div className="col-span-2 flex flex-wrap gap-2">
                <StatusPill
                  label={t.connection}
                  tone={t.connection === "connected" ? "ok" : "danger"}
                  pulse={t.connection !== "connected"}
                />
                <StatusPill label={t.armed ? "Armed" : "Disarmed"} tone={t.armed ? "warn" : "muted"} pulse={t.armed} />
                <StatusPill label={settings.simulationMode ? "Simulated" : "Live hardware"} tone={settings.simulationMode ? "info" : "ok"} />
              </div>
            </div>
          </Panel>

          <Panel title="Battery" icon={<BatteryMedium className="size-3.5" />}>
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="Charge"
                value={t.battery_percentage.toFixed(0)}
                unit="%"
                tone={t.battery_percentage < settings.minBattery ? "danger" : "primary"}
              />
              <Metric label="Voltage" value={t.battery_voltage.toFixed(2)} unit="V" />
              <div className="col-span-2">
                <Bar
                  value={t.battery_percentage}
                  tone={t.battery_percentage < 15 ? "danger" : t.battery_percentage < settings.minBattery ? "warning" : "primary"}
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t.battery_percentage < settings.minBattery
                    ? "Below safety minimum — plan return to home."
                    : `Safety minimum ${settings.minBattery}%`}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="GPS" icon={<Satellite className="size-3.5" />}>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Latitude" value={<span className="text-base">{t.latitude.toFixed(6)}</span>} />
              <Metric label="Longitude" value={<span className="text-base">{t.longitude.toFixed(6)}</span>} />
              <Metric label="Satellites" value={t.gps_satellites} />
              <Metric label="Fix" value={<span className="text-base">{t.gps_fix.toUpperCase()}</span>} tone="primary" />
            </div>
          </Panel>

          <Panel title="Flight" icon={<Gauge className="size-3.5" />}>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Altitude" value={t.altitude.toFixed(1)} unit="m" tone="primary" />
              <Metric label="Ground speed" value={t.speed.toFixed(1)} unit="m/s" />
              <Metric label="Vertical speed" value={t.vertical_speed.toFixed(1)} unit="m/s" />
              <Metric label="Heading" value={Math.round(t.heading)} unit="°" />
            </div>
          </Panel>

          <Panel title="Spray" icon={<SprayCan className="size-3.5" />}>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Tank" value={tankPct.toFixed(0)} unit="%" tone={tankPct < settings.minTankLevel ? "warning" : "primary"} />
              <Metric label="Flow rate" value={t.flow_rate.toFixed(2)} unit="L/min" />
              <Metric label="Pump" value={<span className="text-base">{t.pump_on ? "ON" : "OFF"}</span>} tone={t.pump_on ? "primary" : "muted"} />
              <Metric label="Spraying" value={<span className="text-base">{t.spraying ? "ACTIVE" : "IDLE"}</span>} tone={t.spraying ? "primary" : "muted"} />
              <div className="col-span-2">
                <Bar value={tankPct} tone={tankPct < settings.minTankLevel ? "warning" : "info"} />
              </div>
            </div>
          </Panel>

          <Panel title="Mission" icon={<RouteIcon className="size-3.5" />}>
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="Mission"
                value={<span className="text-sm">{progress.name ?? activeMission?.name ?? "No mission"}</span>}
              />
              <Metric label="Progress" value={progress.progress} unit="%" tone="primary" />
              <Metric
                label="Waypoints"
                value={`${progress.waypoints_completed}/${progress.total_waypoints || activeMission?.waypoints.length || 0}`}
              />
              <Metric label="Distance" value={(progress.distance || activeMission?.distance || 0).toFixed(0)} unit="m" />
              <Metric label="Remaining" value={<span className="text-base">{fmtTime(progress.remaining_seconds)}</span>} />
              <Metric label="Status" value={<span className="text-base capitalize">{progress.status}</span>} tone="muted" />
              <div className="col-span-2">
                <Bar value={progress.progress} />
              </div>
            </div>
          </Panel>
        </div>

        <Panel
          title="Field Map"
          icon={<MapIcon className="size-3.5" />}
          bodyClassName="p-0"
          action={<StatusPill label={`${trail.length} trail points`} tone="muted" />}
        >
          <div className="h-[420px] w-full lg:h-[540px]">
            <DroneMap
              telemetry={t}
              waypoints={activeMission?.waypoints ?? []}
              trail={trail}
              showSprayArea
              follow
            />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
