/**
 * API LAYER
 * ---------
 * The only module the UI is allowed to call for drone/mission/spray data.
 *
 *   React components -> src/api/* -> services + HardwareAdapter
 *
 * Each function documents the REST endpoint it will proxy to once the backend
 * exists. To go live, replace the body with `http(...)` against
 * `settings.backendUrl` — no component changes required.
 */
import { getAdapter } from "@/hardware";
import { getSettings } from "@/lib/config";
import { computeMissionStats, flightLogRepo, missionRepo, uid } from "@/services/repository";
import { demoDrone, demoFlightLogs, demoMission } from "@/data/demo";
import type {
  CommandResult,
  Drone,
  FlightLog,
  Mission,
  MissionProgress,
  Sensor,
  SprayStatus,
  Telemetry,
  Waypoint,
} from "@/types";

/** Generic fetch helper for when a real backend is configured. */
export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getSettings().backendUrl.replace(/\/$/, "");
  if (!base) throw new Error("No backend URL configured (running in simulation mode)");
  const res = await fetch(`${base}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

// ---------------------------------------------------------------- drones API
export const droneApi = {
  /** GET /api/drones */
  async list(): Promise<Drone[]> {
    const s = getSettings();
    return [{ ...demoDrone, id: s.droneId, model: s.droneModel, firmware_version: s.firmwareVersion }];
  },
  /** GET /api/drones/:id */
  async get(id: string): Promise<Drone> {
    const [d] = await this.list();
    return { ...d!, id };
  },
  /** POST /api/drones/:id/arm */
  arm: (): Promise<CommandResult> => getAdapter().arm(),
  /** POST /api/drones/:id/disarm */
  disarm: (): Promise<CommandResult> => getAdapter().disarm(),
  /** POST /api/drones/:id/takeoff */
  takeoff: (altitude = getSettings().rtlAltitude): Promise<CommandResult> =>
    getAdapter().takeoff(altitude),
  /** POST /api/drones/:id/land */
  land: (): Promise<CommandResult> => getAdapter().land(),
  /** POST /api/drones/:id/rtl */
  rtl: (): Promise<CommandResult> => getAdapter().returnToHome(),
  /** POST /api/drones/:id/hold */
  hold: (): Promise<CommandResult> => getAdapter().hold(),
  /** POST /api/drones/:id/emergency-stop */
  emergencyStop: (): Promise<CommandResult> => getAdapter().emergencyStop(),
};

// -------------------------------------------------------------- missions API
export const missionApi = {
  /** GET /api/missions */
  async list(): Promise<Mission[]> {
    const stored = missionRepo.list();
    return stored.length ? stored : [demoMission];
  },
  /** GET /api/missions/:id */
  async get(id: string): Promise<Mission | undefined> {
    return (await this.list()).find((m) => m.id === id);
  },
  /** POST /api/missions | PUT /api/missions/:id */
  async save(input: { id?: string; name: string; waypoints: Waypoint[] }): Promise<Mission> {
    const id = input.id ?? uid();
    const waypoints = input.waypoints.map((w, i) => ({ ...w, mission_id: id, sequence: i }));
    const stats = computeMissionStats(waypoints);
    const existing = missionRepo.get(id);
    return missionRepo.save({
      id,
      drone_id: getSettings().droneId,
      name: input.name,
      status: existing?.status === "running" ? "running" : "ready",
      created_at: existing?.created_at ?? new Date().toISOString(),
      waypoints,
      ...stats,
    });
  },
  /** DELETE /api/missions/:id */
  async remove(id: string) {
    missionRepo.remove(id);
  },
  /** POST /api/missions/:id/start */
  start: (mission: Mission) => getAdapter().startMission(mission),
  /** POST /api/missions/:id/pause */
  pause: () => getAdapter().pauseMission(),
  /** POST /api/missions/:id/resume */
  resume: () => getAdapter().resumeMission(),
  /** POST /api/missions/:id/abort */
  abort: () => getAdapter().stopMission(),
  progress: (): MissionProgress => getAdapter().getMissionProgress(),
};

// ----------------------------------------------------------------- spray API
export const sprayApi = {
  /** GET /api/spray/status */
  status: (): SprayStatus => getAdapter().getSprayStatus(),
  /** POST /api/spray/start */
  start: () => getAdapter().startSpray(),
  /** POST /api/spray/stop */
  stop: () => getAdapter().stopSpray(),
  refill: () => getAdapter().refillTank?.(),
};

// ------------------------------------------------------------- telemetry API
export const telemetryApi = {
  /** GET /api/telemetry/latest */
  latest: (): Telemetry => getAdapter().getTelemetry(),
};

// --------------------------------------------------------------- sensors API
export const sensorApi = {
  /** GET /api/sensors */
  list: (): Sensor[] => getAdapter().getSensors(),
  /** GET /api/sensors/:name */
  get: (name: string): Sensor | undefined => getAdapter().getSensors().find((s) => s.name === name),
};

// ------------------------------------------------------------------ logs API
export const logApi = {
  /** GET /api/logs */
  async list(): Promise<FlightLog[]> {
    flightLogRepo.seedIfEmpty(demoFlightLogs);
    return flightLogRepo.list();
  },
  /** GET /api/logs/:id */
  async get(id: string) {
    return flightLogRepo.get(id);
  },
  /** DELETE /api/logs/:id */
  async remove(id: string) {
    flightLogRepo.remove(id);
  },
  async save(log: FlightLog) {
    return flightLogRepo.save(log);
  },
};
