import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw, Cpu } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatusPill } from "@/components/common/StatCard";
import { useSettings } from "@/hooks/useTelemetry";
import { defaultSettings, settingsStore, type AppSettings } from "@/lib/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AgriDrone GCS" },
      {
        name: "description",
        content:
          "Configure drone limits, spray parameters, safety thresholds and hardware endpoints for the Pixhawk flight controller and ESP32 spray node.",
      },
      { property: "og:title", content: "Settings — AgriDrone GCS" },
      { property: "og:description", content: "Drone, spray, safety and hardware endpoint configuration." },
    ],
  }),
  component: SettingsPage,
});

type Field = { key: keyof AppSettings; label: string; unit?: string; type?: "number" | "text" };

const GROUPS: { title: string; hint: string; fields: Field[] }[] = [
  {
    title: "Drone",
    hint: "Identity and flight envelope enforced by the ground station.",
    fields: [
      { key: "droneId", label: "Drone ID", type: "text" },
      { key: "droneModel", label: "Model / FC", type: "text" },
      { key: "firmwareVersion", label: "Firmware", type: "text" },
      { key: "maxAltitude", label: "Max altitude", unit: "m" },
      { key: "maxSpeed", label: "Max speed", unit: "m/s" },
      { key: "rtlAltitude", label: "RTL / takeoff altitude", unit: "m" },
    ],
  },
  {
    title: "Spray system",
    hint: "Tank and pump parameters for the ESP32 spray node.",
    fields: [
      { key: "tankCapacity", label: "Tank capacity", unit: "L" },
      { key: "minTankLevel", label: "Minimum tank level", unit: "%" },
      { key: "flowRateLimit", label: "Flow rate limit", unit: "L/min" },
      { key: "nozzleCount", label: "Nozzle count" },
    ],
  },
  {
    title: "Safety thresholds",
    hint: "Trigger alerts and block spray/arm commands.",
    fields: [
      { key: "minBattery", label: "Min battery for RTL", unit: "%" },
      { key: "obstacleDistance", label: "Obstacle warning distance", unit: "m" },
      { key: "minSatellites", label: "Min GPS satellites" },
    ],
  },
  {
    title: "Field / home position",
    hint: "Map centre and simulated home point.",
    fields: [
      { key: "homeLat", label: "Home latitude" },
      { key: "homeLng", label: "Home longitude" },
    ],
  },
  {
    title: "Hardware endpoints",
    hint: "Leave blank to stay in simulation. Fill in once the Pixhawk bridge and ESP32 are online.",
    fields: [
      { key: "backendUrl", label: "Backend REST URL", type: "text" },
      { key: "websocketUrl", label: "Telemetry WebSocket URL", type: "text" },
      { key: "esp32Url", label: "ESP32 spray node URL", type: "text" },
    ],
  },
];

function SettingsPage() {
  const saved = useSettings();
  const [draft, setDraft] = useState<AppSettings>(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (key: keyof AppSettings, value: string | number | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    settingsStore.set(draft);
    toast.success("Settings saved", {
      description: draft.simulationMode
        ? "Simulation mode active — the mock hardware adapter drives all data."
        : "Live hardware mode — commands are forwarded to the configured endpoints.",
    });
  };

  const reset = () => {
    setDraft(defaultSettings);
    settingsStore.set(defaultSettings);
    toast.success("Settings restored to defaults");
  };

  return (
    <AppShell title="Settings" subtitle="Ground station configuration and hardware abstraction">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Hardware mode"
          icon={<Cpu className="size-3.5" />}
          className="xl:col-span-2"
          action={
            <StatusPill
              label={draft.simulationMode ? "Simulation" : "Live hardware"}
              tone={draft.simulationMode ? "info" : "warn"}
            />
          }
        >
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={draft.simulationMode}
              onChange={(e) => set("simulationMode", e.target.checked)}
              className="mt-1 size-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm">
              <span className="font-semibold">Run in simulation mode</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                When enabled, the mock hardware adapter generates physics-based flight, GPS, battery and spray
                telemetry so the full system can be demonstrated without a drone. Disable it to route every
                command through the Pixhawk (MAVLink bridge) and ESP32 adapters using the endpoints below —
                the UI code does not change.
              </span>
            </span>
          </label>
        </Panel>

        {GROUPS.map((g) => (
          <Panel key={g.title} title={g.title}>
            <p className="mb-3 text-xs text-muted-foreground">{g.hint}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.fields.map((f) => (
                <label
                  key={String(f.key)}
                  className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {f.label}
                  {f.unit ? <span className="normal-case tracking-normal">({f.unit})</span> : null}
                  <input
                    type={f.type === "text" ? "text" : "number"}
                    value={String(draft[f.key] ?? "")}
                    step="any"
                    onChange={(e) =>
                      set(f.key, f.type === "text" ? e.target.value : Number(e.target.value))
                    }
                    className="rounded-md border border-input bg-input/40 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-ring"
                  />
                </label>
              ))}
            </div>
          </Panel>
        ))}

        <div className="flex flex-wrap gap-2 xl:col-span-2">
          <button
            onClick={save}
            disabled={!dirty}
            className={cn(
              "flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary/20 disabled:opacity-50",
            )}
          >
            <Save className="size-4" /> {dirty ? "Save changes" : "Saved"}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-4" /> Restore defaults
          </button>
        </div>
      </div>
    </AppShell>
  );
}
