import type { HardwareAdapter } from "./HardwareAdapter";
import type {
  CommandResult,
  Mission,
  MissionProgress,
  Sensor,
  SprayStatus,
  Telemetry,
} from "@/types";
import { getSettings } from "@/lib/config";

/**
 * REAL HARDWARE ADAPTER — Pixhawk 2.4.8 (MAVLink).
 *
 * The browser CANNOT talk MAVLink to a flight controller. This adapter is a
 * thin REST/WebSocket client for a backend service that owns the serial /
 * telemetry-radio link:
 *
 *   Pixhawk -> MAVLink -> backend hardware adapter -> REST/WebSocket -> this class
 *
 * Endpoints expected on `settings.backendUrl` (see README §11):
 *   GET  /api/telemetry/latest
 *   POST /api/drones/:id/{arm,disarm,takeoff,land,rtl,hold,emergency-stop}
 *   POST /api/missions/:id/{start,pause,resume,abort}
 *
 * Implement/extend this class when the backend is available; no UI file needs
 * to change.
 */
export class PixhawkAdapter implements HardwareAdapter {
  readonly kind = "pixhawk";
  readonly simulated = false;

  private listeners = new Set<(t: Telemetry) => void>();
  private poll: ReturnType<typeof setInterval> | null = null;
  private socket: WebSocket | null = null;
  private last: Telemetry | null = null;

  private get base() {
    return getSettings().backendUrl.replace(/\/$/, "");
  }

  private get droneId() {
    return getSettings().droneId;
  }

  private async post(path: string): Promise<CommandResult> {
    try {
      const res = await fetch(`${this.base}${path}`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: res.ok, message: body.message ?? res.statusText, simulated: false };
    } catch (err) {
      return { ok: false, message: `Backend unreachable: ${String(err)}`, simulated: false };
    }
  }

  async connect(): Promise<CommandResult> {
    const { websocketUrl } = getSettings();
    if (websocketUrl && typeof WebSocket !== "undefined") {
      this.socket = new WebSocket(websocketUrl);
      this.socket.onmessage = (ev) => {
        try {
          this.last = JSON.parse(ev.data as string) as Telemetry;
          this.listeners.forEach((l) => l(this.last!));
        } catch {
          /* ignore malformed frame */
        }
      };
      return { ok: true, message: "WebSocket telemetry stream opened", simulated: false };
    }
    // Fallback: REST polling
    this.poll ??= setInterval(async () => {
      try {
        const res = await fetch(`${this.base}/api/telemetry/latest`);
        this.last = (await res.json()) as Telemetry;
        this.listeners.forEach((l) => l(this.last!));
      } catch {
        /* connection-lost handling lives in the service layer */
      }
    }, 1000);
    return { ok: true, message: "Polling backend telemetry", simulated: false };
  }

  async disconnect(): Promise<CommandResult> {
    if (this.poll) clearInterval(this.poll);
    this.poll = null;
    this.socket?.close();
    this.socket = null;
    return { ok: true, message: "Disconnected", simulated: false };
  }

  getTelemetry(): Telemetry {
    if (!this.last) throw new Error("No telemetry received from backend yet");
    return this.last;
  }

  subscribe(listener: (t: Telemetry) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  arm = () => this.post(`/api/drones/${this.droneId}/arm`);
  disarm = () => this.post(`/api/drones/${this.droneId}/disarm`);
  takeoff = (_altitude: number) => this.post(`/api/drones/${this.droneId}/takeoff`);
  land = () => this.post(`/api/drones/${this.droneId}/land`);
  returnToHome = () => this.post(`/api/drones/${this.droneId}/rtl`);
  hold = () => this.post(`/api/drones/${this.droneId}/hold`);
  emergencyStop = () => this.post(`/api/drones/${this.droneId}/emergency-stop`);

  startMission = (mission: Mission) => this.post(`/api/missions/${mission.id}/start`);
  pauseMission = () => this.post(`/api/missions/current/pause`);
  resumeMission = () => this.post(`/api/missions/current/resume`);
  stopMission = () => this.post(`/api/missions/current/abort`);

  getMissionProgress(): MissionProgress {
    throw new Error("Mission progress must be provided by the backend telemetry stream");
  }

  startSpray = () => this.post(`/api/spray/start`);
  stopSpray = () => this.post(`/api/spray/stop`);

  getSprayStatus(): SprayStatus {
    throw new Error("Spray status is served by the ESP32 adapter / backend");
  }

  getSensors(): Sensor[] {
    throw new Error("Sensor snapshots are served by GET /api/sensors");
  }
}
