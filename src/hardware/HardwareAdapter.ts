import type {
  CommandResult,
  Mission,
  MissionProgress,
  Sensor,
  SprayStatus,
  Telemetry,
} from "@/types";

/**
 * Hardware abstraction layer.
 *
 * The UI NEVER talks to hardware. It talks to the service/API layer, which
 * talks to an implementation of this interface:
 *
 *   React UI -> src/api/* -> src/services/* -> HardwareAdapter -> hardware
 *
 * Implementations:
 *   - MockHardwareAdapter  (simulation, ships today)
 *   - PixhawkAdapter       (MAVLink via backend, flight control)
 *   - Esp32Adapter         (Wi-Fi/MQTT/REST, spray + IoT sensors)
 */
export interface HardwareAdapter {
  /** Human readable adapter id, e.g. "mock" | "pixhawk" | "esp32". */
  readonly kind: string;
  /** True when no real hardware command is ever emitted. */
  readonly simulated: boolean;

  connect(): Promise<CommandResult>;
  disconnect(): Promise<CommandResult>;

  getTelemetry(): Telemetry;
  subscribe(listener: (telemetry: Telemetry) => void): () => void;

  arm(): Promise<CommandResult>;
  disarm(): Promise<CommandResult>;
  takeoff(altitude: number): Promise<CommandResult>;
  land(): Promise<CommandResult>;
  returnToHome(): Promise<CommandResult>;
  hold(): Promise<CommandResult>;
  emergencyStop(): Promise<CommandResult>;

  startMission(mission: Mission): Promise<CommandResult>;
  pauseMission(): Promise<CommandResult>;
  resumeMission(): Promise<CommandResult>;
  stopMission(): Promise<CommandResult>;
  getMissionProgress(): MissionProgress;

  startSpray(): Promise<CommandResult>;
  stopSpray(): Promise<CommandResult>;
  getSprayStatus(): SprayStatus;

  getSensors(): Sensor[];
  /** Simulation-only helpers; real adapters may ignore these. */
  refillTank?(): void;
}
