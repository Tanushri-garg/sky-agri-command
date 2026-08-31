import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SensorCard } from "@/components/common/SensorCard";
import { Panel, StatusPill } from "@/components/common/StatCard";
import { useSensors } from "@/hooks/useMission";

export const Route = createFileRoute("/sensors")({
  head: () => ({
    meta: [
      { title: "IoT Sensors — AgriDrone GCS" },
      {
        name: "description",
        content:
          "Live status of the drone's IoT sensors: YF-S401 flow meter, float level switch, battery voltage, HC-SR04 ultrasonic, TFmini-S LiDAR, Neo-M8N GPS and telemetry link.",
      },
      { property: "og:title", content: "IoT Sensors — AgriDrone GCS" },
      { property: "og:description", content: "Sensor health and live readings for the spraying drone." },
    ],
  }),
  component: SensorsPage,
});

function SensorsPage() {
  const sensors = useSensors();
  const faults = sensors.filter((s) => s.status !== "ok" || !s.online).length;

  return (
    <AppShell title="Sensors" subtitle="IoT sensor bus — ESP32 node and flight controller peripherals">
      {sensors.length === 0 ? (
        <Panel title="Sensor bus">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" /> Waiting for the first sensor frame…
          </div>
        </Panel>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusPill label={`${sensors.length} sensors`} tone="muted" />
            <StatusPill
              label={faults === 0 ? "All nominal" : `${faults} need attention`}
              tone={faults === 0 ? "ok" : "warn"}
              pulse={faults > 0}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sensors.map((s) => (
              <SensorCard key={s.name} sensor={s} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
