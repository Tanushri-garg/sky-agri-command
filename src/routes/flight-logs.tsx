import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Metric, StatusPill } from "@/components/common/StatCard";
import { logApi } from "@/api";
import type { FlightLog, FlightLogStatus } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/flight-logs")({
  head: () => ({
    meta: [
      { title: "Flight Logs — AgriDrone GCS" },
      {
        name: "description",
        content:
          "Searchable history of drone flights with duration, distance covered, battery consumption and pesticide volume sprayed, exportable as CSV.",
      },
      { property: "og:title", content: "Flight Logs — AgriDrone GCS" },
      { property: "og:description", content: "Flight and spray history for the agricultural drone fleet." },
    ],
  }),
  component: FlightLogs,
});

const STATUSES: (FlightLogStatus | "All")[] = ["All", "Completed", "Aborted", "Failed", "In Progress"];

const tone = (s: FlightLogStatus) =>
  s === "Completed" ? "ok" : s === "In Progress" ? "info" : s === "Aborted" ? "warn" : "danger";

const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, "0")}s`;

function FlightLogs() {
  const [logs, setLogs] = useState<FlightLog[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");

  const reload = () => {
    void logApi.list().then(setLogs);
  };
  useEffect(reload, []);

  const filtered = useMemo(
    () =>
      logs
        .filter((l) => (status === "All" ? true : l.status === status))
        .filter((l) =>
          query.trim()
            ? `${l.mission_name ?? ""} ${l.drone_id} ${l.id}`.toLowerCase().includes(query.trim().toLowerCase())
            : true,
        )
        .sort((a, b) => b.start_time.localeCompare(a.start_time)),
    [logs, status, query],
  );

  const totals = useMemo(
    () => ({
      flights: filtered.length,
      duration: filtered.reduce((s, l) => s + l.duration, 0),
      distance: filtered.reduce((s, l) => s + l.distance, 0),
      spray: filtered.reduce((s, l) => s + l.spray_used, 0),
    }),
    [filtered],
  );

  const exportCsv = () => {
    const header = [
      "id",
      "drone_id",
      "mission_name",
      "start_time",
      "end_time",
      "duration_s",
      "distance_m",
      "battery_start",
      "battery_end",
      "spray_used_l",
      "status",
    ];
    const rows = filtered.map((l) => [
      l.id,
      l.drone_id,
      l.mission_name ?? "",
      l.start_time,
      l.end_time ?? "",
      l.duration,
      Math.round(l.distance),
      l.battery_start,
      l.battery_end,
      l.spray_used,
      l.status,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `agridrone-flight-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} flight logs`);
  };

  return (
    <AppShell title="Flight Logs" subtitle="Flight history, spray usage and mission outcomes">
      <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
        <Metric label="Flights" value={totals.flights} tone="primary" />
        <Metric label="Total air time" value={Math.round(totals.duration / 60)} unit="min" />
        <Metric label="Distance covered" value={(totals.distance / 1000).toFixed(2)} unit="km" />
        <Metric label="Pesticide sprayed" value={totals.spray.toFixed(1)} unit="L" />
      </div>

      <Panel
        title="History"
        bodyClassName="p-0"
        action={
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
          >
            <Download className="size-3.5" /> CSV
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mission, drone or log id"
              className="w-full rounded-md border border-input bg-input/40 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-ring"
            />
          </div>
          <div className="flex gap-1 rounded-md border border-border bg-card p-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors",
                  s === status ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                {["Mission", "Started", "Duration", "Distance", "Battery", "Spray", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    No flight logs match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/25">
                    <td className="px-3 py-2">
                      <p className="font-medium">{l.mission_name ?? "Manual flight"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{l.drone_id}</p>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {new Date(l.start_time).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{fmtDuration(l.duration)}</td>
                    <td className="px-3 py-2 tabular-nums">{(l.distance / 1000).toFixed(2)} km</td>
                    <td className="px-3 py-2 tabular-nums">
                      {l.battery_start}% → {l.battery_end}%
                    </td>
                    <td className="px-3 py-2 tabular-nums">{l.spray_used.toFixed(1)} L</td>
                    <td className="px-3 py-2">
                      <StatusPill label={l.status} tone={tone(l.status)} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={async () => {
                          await logApi.remove(l.id);
                          reload();
                          toast.success("Log deleted");
                        }}
                        aria-label="Delete log"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
