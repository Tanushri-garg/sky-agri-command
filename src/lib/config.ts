/**
 * Central configuration.
 *
 * Everything hardware- or deployment-specific lives here and is sourced from
 * environment variables first, then from user-editable settings persisted in
 * localStorage (Settings page). Components must never hard-code these values.
 *
 * Supported env vars (define them in `.env`):
 *   VITE_BACKEND_URL, VITE_WEBSOCKET_URL, VITE_ESP32_URL,
 *   VITE_DRONE_ID, VITE_SIMULATION_MODE, VITE_HOME_LAT, VITE_HOME_LNG
 */

export interface AppSettings {
  // Drone
  droneId: string;
  droneModel: string;
  firmwareVersion: string;
  maxAltitude: number;
  maxSpeed: number;
  rtlAltitude: number;
  // Spray
  tankCapacity: number;
  minTankLevel: number;
  flowRateLimit: number;
  nozzleCount: number;
  // Safety
  minBattery: number;
  obstacleDistance: number;
  minSatellites: number;
  // Communication
  backendUrl: string;
  websocketUrl: string;
  esp32Url: string;
  simulationMode: boolean;
  // Map
  homeLat: number;
  homeLng: number;
}

const env = import.meta.env as Record<string, string | undefined>;

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : fallback;
};

export const defaultSettings: AppSettings = {
  droneId: env["VITE_DRONE_ID"] ?? "AGRI-DRONE-01",
  droneModel: "AgriQuad X4 / Pixhawk 2.4.8",
  firmwareVersion: "ArduCopter 4.4.4",
  maxAltitude: 30,
  maxSpeed: 8,
  rtlAltitude: 20,
  tankCapacity: 10,
  minTankLevel: 10,
  flowRateLimit: 3.5,
  nozzleCount: 4,
  minBattery: 25,
  obstacleDistance: 3,
  minSatellites: 8,
  backendUrl: env["VITE_BACKEND_URL"] ?? "",
  websocketUrl: env["VITE_WEBSOCKET_URL"] ?? "",
  esp32Url: env["VITE_ESP32_URL"] ?? "",
  simulationMode: env["VITE_SIMULATION_MODE"] !== "false",
  // Demo field: Nashik region, Maharashtra (configurable).
  homeLat: num(env["VITE_HOME_LAT"], 19.9975),
  homeLng: num(env["VITE_HOME_LNG"], 73.7898),
};

const STORAGE_KEY = "agridrone.settings.v1";

type Listener = () => void;

class SettingsStore {
  private settings: AppSettings = { ...defaultSettings };
  private listeners = new Set<Listener>();
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.settings = { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) };
        this.emit();
      }
    } catch {
      /* ignore corrupted settings */
    }
  }

  get(): AppSettings {
    return this.settings;
  }

  update(patch: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...patch };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        /* storage may be unavailable */
      }
    }
    this.emit();
  }

  reset() {
    this.settings = { ...defaultSettings };
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    this.emit();
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const settingsStore = new SettingsStore();
export const getSettings = () => settingsStore.get();
