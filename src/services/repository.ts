import type { FlightLog, Mission, SpraySession, Waypoint } from "@/types";
import { getSettings } from "@/lib/config";
import { pathDistance, polygonAreaHectares } from "@/utils/geo";

/**
 * Persistence layer.
 *
 * Today: localStorage (works fully offline in demo mode).
 * Tomorrow: replace the bodies of these functions with Supabase/PostgreSQL
 * queries or REST calls — the API layer and the UI stay unchanged.
 * Table shapes mirror the SQL schema documented in the README (§10).
 */

const KEYS = {
  missions: "agridrone.missions.v1",
  logs: "agridrone.flight_logs.v1",
  spray: "agridrone.spray_sessions.v1",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function computeMissionStats(waypoints: Waypoint[]) {
  const s = getSettings();
  const pts = waypoints.map((w) => ({ lat: w.latitude, lng: w.longitude }));
  const distance = pathDistance(pts);
  const area = polygonAreaHectares(pts);
  const estimated_time = Math.round(distance / Math.max(1, s.maxSpeed * 0.6));
  const estimated_spray = Number(Math.min(s.tankCapacity, area * 8).toFixed(2));
  return { distance: Number(distance.toFixed(1)), area: Number(area.toFixed(3)), estimated_time, estimated_spray };
}

// ------------------------------------------------------------------ missions
export const missionRepo = {
  list(): Mission[] {
    return read<Mission[]>(KEYS.missions, []);
  },
  get(id: string): Mission | undefined {
    return this.list().find((m) => m.id === id);
  },
  save(mission: Mission): Mission {
    const all = this.list();
    const idx = all.findIndex((m) => m.id === mission.id);
    if (idx >= 0) all[idx] = mission;
    else all.unshift(mission);
    write(KEYS.missions, all);
    return mission;
  },
  remove(id: string) {
    write(
      KEYS.missions,
      this.list().filter((m) => m.id !== id),
    );
  },
};

// --------------------------------------------------------------- flight logs
export const flightLogRepo = {
  list(): FlightLog[] {
    return read<FlightLog[]>(KEYS.logs, []);
  },
  get(id: string) {
    return this.list().find((l) => l.id === id);
  },
  save(log: FlightLog) {
    const all = this.list();
    const idx = all.findIndex((l) => l.id === log.id);
    if (idx >= 0) all[idx] = log;
    else all.unshift(log);
    write(KEYS.logs, all);
    return log;
  },
  remove(id: string) {
    write(
      KEYS.logs,
      this.list().filter((l) => l.id !== id),
    );
  },
  seedIfEmpty(seed: FlightLog[]) {
    if (this.list().length === 0) write(KEYS.logs, seed);
  },
};

// ------------------------------------------------------------ spray sessions
export const spraySessionRepo = {
  list(): SpraySession[] {
    return read<SpraySession[]>(KEYS.spray, []);
  },
  save(session: SpraySession) {
    const all = this.list();
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) all[idx] = session;
    else all.unshift(session);
    write(KEYS.spray, all);
    return session;
  },
};
