import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Save, Play, Pause, Square, Grid3x3, RotateCcw, FolderOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Metric, StatusPill } from "@/components/common/StatCard";
import { DroneMap } from "@/components/map/DroneMap";
import { useSettings, useTelemetry } from "@/hooks/useTelemetry";
import { useMissionProgress, useMissions, useTrail } from "@/hooks/useMission";
import { missionApi } from "@/api";
import { computeMissionStats, uid } from "@/services/repository";
import { offsetMeters } from "@/utils/geo";
import type { CommandResult, LatLng, Waypoint } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mission-planner")({
  head: () => ({
    meta: [
      { title: "Mission Planner — AgriDrone GCS" },
      {
        name: "description",
        content:
          "Plan agricultural spraying missions: draw waypoints on the field map, generate grid routes and estimate flight time and spray volume.",
      },
      { property: "og:title", content: "Mission Planner — AgriDrone GCS" },
      {
        property: "og:description",
        content: "Waypoint and field-grid mission planning for spraying drones.",
      },
    ],
  }),
  component: MissionPlanner,
});

const btn =
  "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors disabled:opacity-50";

function MissionPlanner() {
  const t = useTelemetry();
  const settings = useSettings();
  const trail = useTrail();
  const progress = useMissionProgress();
  const [missions, reload] = useMissions();

  const [missionId, setMissionId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("New Field Mission");
  const [altitude, setAltitude] = useState(12);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [gridWidth, setGridWidth] = useState(120);
  const [gridHeight, setGridHeight] = useState(80);
  const [gridSpacing, setGridSpacing] = useState(8);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => computeMissionStats(waypoints), [waypoints]);

  const addWaypoint = (p: LatLng) => {
    setWaypoints((prev) => [
      ...prev,
      {
        id: uid(),
        mission_id: missionId ?? "draft",
        sequence: prev.length,
        latitude: Number(p.lat.toFixed(6)),
        longitude: Number(p.lng.toFixed(6)),
        altitude,
      },
    ]);
  };

  const moveWaypoint = (id: string, p: LatLng) =>
    setWaypoints((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, latitude: Number(p.lat.toFixed(6)), longitude: Number(p.lng.toFixed(6)) } : w,
      ),
    );

  const deleteWaypoint = (id: string) =>
    setWaypoints((prev) => prev.filter((w) => w.id !== id).map((w, i) => ({ ...w, sequence: i })));

  const generateGrid = () => {
    const origin: LatLng = { lat: t.latitude, lng: t.longitude };
    const rows = Math.max(2, Math.floor(gridHeight / gridSpacing));
    const pts: LatLng[] = [];
    for (let r = 0; r <= rows; r++) {
      const north = r * gridSpacing;
      const leftToRight = r % 2 === 0;
      pts.push(offsetMeters(origin, north, leftToRight ? 0 : gridWidth));
      pts.push(offsetMeters(origin, north, leftToRight ? gridWidth : 0));
    }
    setWaypoints(
      pts.map((p, i) => ({
        id: uid(),
        mission_id: missionId ?? "draft",
        sequence: i,
        latitude: Number(p.lat.toFixed(6)),
        longitude: Number(p.lng.toFixed(6)),
        altitude,
      })),
    );
    toast.success(`Generated ${pts.length} waypoints for a ${gridWidth}×${gridHeight} m field`);
  };

  const save = async () => {
    if (waypoints.length < 2) {
      toast.error("Add at least 2 waypoints before saving");
      return;
    }
    setBusy(true);
    try {
      const saved = await missionApi.save({ ...(missionId ? { id: missionId } : {}), name, waypoints });
      setMissionId(saved.id);
      reload();
      toast.success(`Mission "${saved.name}" saved`);
    } finally {
      setBusy(false);
    }
  };

  const load = (id: string) => {
    const m = missions.find((x) => x.id === id);
    if (!m) return;
    setMissionId(m.id);
    setName(m.name);
    setWaypoints(m.waypoints);
    toast.success(`Loaded "${m.name}"`);
  };

  const command = async (label: string, fn: () => Promise<CommandResult>) => {
    const res = await fn();
    toast[res.ok ? "success" : "error"](res.message, {
      description: res.simulated ? `${label} executed in SIMULATION MODE only.` : undefined,
    });
    reload();
  };

  const start = async () => {
    if (waypoints.length < 2) {
      toast.error("Plan a route first");
      return;
    }
    const saved = await missionApi.save({ ...(missionId ? { id: missionId } : {}), name, waypoints });
    setMissionId(saved.id);
    await command("Mission start", () => missionApi.start(saved));
  };

  return (
    <AppShell title="Mission Planner" subtitle="Design and execute field spraying routes">
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel
          title="Plan Route — click the map to add waypoints, drag to adjust"
          bodyClassName="p-0"
          action={<StatusPill label={`${waypoints.length} WP`} tone="muted" />}
        >
          <div className="h-[420px] w-full xl:h-[640px]">
            <DroneMap
              telemetry={t}
              waypoints={waypoints}
              trail={trail}
              editable
              showSprayArea
              onMapClick={addWaypoint}
              onWaypointMove={moveWaypoint}
            />
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Panel title="Mission">
            <div className="grid gap-3">
              <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-input bg-input/40 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-ring"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Waypoint altitude (m)
                <input
                  type="number"
                  value={altitude}
                  min={2}
                  max={settings.maxAltitude}
                  onChange={(e) => setAltitude(Number(e.target.value))}
                  className="rounded-md border border-input bg-input/40 px-2 py-1.5 text-sm font-normal tracking-normal text-foreground outline-none focus:border-ring"
                />
              </label>
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                <Metric label="Waypoints" value={waypoints.length} />
                <Metric label="Distance" value={stats.distance.toFixed(0)} unit="m" />
                <Metric label="Area" value={stats.area.toFixed(2)} unit="ha" />
                <Metric label="Est. time" value={Math.round(stats.estimated_time / 60)} unit="min" />
                <Metric label="Est. spray" value={stats.estimated_spray.toFixed(1)} unit="L" tone="primary" />
                <Metric label="Status" value={<span className="text-base capitalize">{progress.status}</span>} tone="muted" />
              </div>
            </div>
          </Panel>

          <Panel title="Field Grid Route" icon={<Grid3x3 className="size-3.5" />}>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Width m", value: gridWidth, set: setGridWidth },
                { label: "Height m", value: gridHeight, set: setGridHeight },
                { label: "Spacing m", value: gridSpacing, set: setGridSpacing },
              ].map((f) => (
                <label key={f.label} className="grid gap-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {f.label}
                  <input
                    type="number"
                    value={f.value}
                    min={1}
                    onChange={(e) => f.set(Number(e.target.value))}
                    className="rounded-md border border-input bg-input/40 px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={generateGrid}
              className={cn(btn, "mt-3 w-full border-primary/50 bg-primary/10 text-primary hover:bg-primary/20")}
            >
              <Grid3x3 className="size-4" /> Generate spray grid
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Grid is generated from the drone's current position; field size is fully configurable.
            </p>
          </Panel>

          <Panel title="Waypoints" bodyClassName="p-0">
            <div className="max-h-56 overflow-y-auto">
              {waypoints.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">
                  No waypoints yet — click the map or generate a grid route.
                </p>
              ) : (
                waypoints.map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs last:border-0"
                  >
                    <span className="font-mono text-muted-foreground">#{i + 1}</span>
                    <span className="font-mono tabular-nums">
                      {w.latitude.toFixed(5)}, {w.longitude.toFixed(5)}
                    </span>
                    <span className="font-mono text-muted-foreground">{w.altitude}m</span>
                    <button onClick={() => deleteWaypoint(w.id)} aria-label="Delete waypoint">
                      <Trash2 className="size-3.5 text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Actions">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={save} disabled={busy} className={cn(btn, "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20")}>
                <Save className="size-4" /> Save
              </button>
              <button onClick={() => setWaypoints([])} className={cn(btn, "border-border bg-muted/40 hover:bg-muted")}>
                <RotateCcw className="size-4" /> Clear all
              </button>
              <button onClick={start} className={cn(btn, "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20")}>
                <Play className="size-4" /> Start
              </button>
              <button onClick={() => command("Pause", () => missionApi.pause())} className={cn(btn, "border-border bg-muted/40 hover:bg-muted")}>
                <Pause className="size-4" /> Pause
              </button>
              <button onClick={() => command("Resume", () => missionApi.resume())} className={cn(btn, "border-info/50 bg-info/10 text-info hover:bg-info/20")}>
                <Play className="size-4" /> Resume
              </button>
              <button onClick={() => command("Abort", () => missionApi.abort())} className={cn(btn, "border-destructive/60 bg-destructive/15 text-destructive hover:bg-destructive/25")}>
                <Square className="size-4" /> Abort
              </button>
            </div>
          </Panel>

          <Panel title="Saved Missions" icon={<FolderOpen className="size-3.5" />} bodyClassName="p-0">
            {missions.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">No saved missions.</p>
            ) : (
              missions.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.waypoints.length} WP · {m.distance.toFixed(0)} m · {m.area.toFixed(2)} ha
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => load(m.id)} className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Load
                    </button>
                    <button
                      onClick={async () => {
                        await missionApi.remove(m.id);
                        reload();
                        toast.success("Mission deleted");
                      }}
                      aria-label="Delete mission"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
