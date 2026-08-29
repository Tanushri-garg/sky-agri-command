import type { SprayStatus, Sensor, CommandResult } from "@/types";
import { getSettings } from "@/lib/config";

/**
 * REAL HARDWARE ADAPTER — ESP32 spray + IoT sensor node.
 *
 *   ESP32 (flow sensor, float switch, MOSFET pump driver, battery ADC,
 *          HC-SR04 / TFmini-S) -> Wi-Fi -> MQTT or REST -> backend -> this class
 *
 * The ESP32 URL is configurable (Settings → Communication). Never hard-code
 * an IP address anywhere else in the app.
 *
 * Expected endpoints on `settings.esp32Url` (or proxied through the backend):
 *   GET  /spray/status
 *   POST /spray/start | /spray/stop
 *   GET  /sensors
 */
export class Esp32Adapter {
  readonly kind = "esp32";
  readonly simulated = false;

  private get base() {
    const s = getSettings();
    return (s.esp32Url || s.backendUrl).replace(/\/$/, "");
  }

  async getSprayStatus(): Promise<SprayStatus> {
    const res = await fetch(`${this.base}/spray/status`);
    if (!res.ok) throw new Error(`ESP32 spray status failed: ${res.status}`);
    return (await res.json()) as SprayStatus;
  }

  async startSpray(): Promise<CommandResult> {
    return this.command("/spray/start");
  }

  async stopSpray(): Promise<CommandResult> {
    return this.command("/spray/stop");
  }

  async getSensors(): Promise<Sensor[]> {
    const res = await fetch(`${this.base}/sensors`);
    if (!res.ok) throw new Error(`ESP32 sensor read failed: ${res.status}`);
    return (await res.json()) as Sensor[];
  }

  private async command(path: string): Promise<CommandResult> {
    try {
      const res = await fetch(`${this.base}${path}`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: res.ok, message: body.message ?? res.statusText, simulated: false };
    } catch (err) {
      return { ok: false, message: `ESP32 unreachable: ${String(err)}`, simulated: false };
    }
  }
}
