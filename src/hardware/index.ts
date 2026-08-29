import type { HardwareAdapter } from "./HardwareAdapter";
import { MockHardwareAdapter } from "./MockHardwareAdapter";
import { PixhawkAdapter } from "./PixhawkAdapter";
import { getSettings } from "@/lib/config";

export type { HardwareAdapter } from "./HardwareAdapter";
export { MockHardwareAdapter } from "./MockHardwareAdapter";
export { PixhawkAdapter } from "./PixhawkAdapter";
export { Esp32Adapter } from "./Esp32Adapter";

let current: HardwareAdapter | null = null;
let currentKind: string | null = null;

/**
 * Adapter factory. Simulation mode -> MockHardwareAdapter, otherwise the
 * backend-backed PixhawkAdapter. The UI only ever sees the interface, so
 * switching implementations requires no frontend change.
 */
export function getAdapter(): HardwareAdapter {
  const s = getSettings();
  const kind = s.simulationMode || !s.backendUrl ? "mock" : "pixhawk";
  if (!current || currentKind !== kind) {
    void current?.disconnect();
    current = kind === "mock" ? new MockHardwareAdapter() : new PixhawkAdapter();
    currentKind = kind;
    void current.connect();
  }
  return current;
}
