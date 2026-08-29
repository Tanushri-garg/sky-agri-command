import type { HardwareAdapter } from "./HardwareAdapter";
import { getSettings } from "@/lib/config";
import type {
  CommandResult,
  FlightMode,
  Mission,
  MissionProgress,
  Sensor,
  SprayStatus,
  Telemetry,
  Waypoint,
} from "@/types";
import { distanceMeters, bearingDegrees, moveTowards } from "@/utils/geo";

const TICK_MS = 1000;

const ok = (message: string): CommandResult => ({ ok: true, message, simulated: true });
const fail = (message: string): CommandResult => ({ ok: false, message, simulated: true });

/**
 * Deterministic-ish simulation of an agricultural spraying quadcopter.
 * Generates realistic telemetry so the whole dashboard is usable with no
 * hardware attached. NEVER emits any real hardware command.
 */
export class MockHardwareAdapter implements HardwareAdapter {
  readonly kind = "mock";
  readonly simulated = true;

  private listeners = new Set<(t: Telemetry) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: Telemetry;
  private mission: Mission | null = null;
  private missionStatus: MissionProgress["status"] = "idle";
  private wpIndex = 0;
  private targetAltitude = 0;
  private landing = false;
  private rtl = false;
  private pumpVoltage = 0;
  private flowFault = false;

  constructor() {
    this.state = this.initialState();
  }

  private initialState(): Telemetry {
    const s = getSettings();
    return {
      drone_id: s.droneId,
      timestamp: new Date().toISOString(),
      connection: "connected",
      armed: false,
      flight_mode: "Loiter",
      latitude: s.homeLat,
      longitude: s.homeLng,
      altitude: 0,
      speed: 0,
      vertical_speed: 0,
      heading: 92,
      battery_voltage: 15.4,
      battery_percentage: 78,
      gps_satellites: 12,
      gps_fix: "3d",
      signal_strength: 92,
      tank_level: s.tankCapacity * 0.72,
      tank_capacity: s.tankCapacity,
      flow_rate: 0,
      total_sprayed: 0,
      pump_on: false,
      spraying: false,
      distance_to_home: 0,
      home: { lat: s.homeLat, lng: s.homeLng },
      obstacle_distance: 12,
      simulation: true,
    };
  }

  async connect(): Promise<CommandResult> {
    this.state = { ...this.state, connection: "connected" };
    this.start();
    return ok("Simulated link established");
  }

  async disconnect(): Promise<CommandResult> {
    this.stop();
    this.state = { ...this.state, connection: "disconnected" };
    this.emit();
    return ok("Simulated link closed");
  }

  private start() {
    if (this.timer || typeof window === "undefined") return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getTelemetry(): Telemetry {
    return this.state;
  }

  subscribe(listener: (t: Telemetry) => void) {
    this.listeners.add(listener);
    this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  private emit() {
    this.listeners.forEach((l) => l(this.state));
  }

  // ---------------------------------------------------------------- flight
  async arm(): Promise<CommandResult> {
    if (this.state.battery_percentage < 15) return fail("Battery too low to arm");
    if (this.state.gps_satellites < getSettings().minSatellites) return fail("GPS fix insufficient");
    this.patch({ armed: true, flight_mode: "Guided", home: { lat: this.state.latitude, lng: this.state.longitude } });
    return ok("ARMED (simulated)");
  }

  async disarm(): Promise<CommandResult> {
    if (this.state.altitude > 0.5) return fail("Cannot disarm while airborne");
    this.patch({ armed: false, flight_mode: "Stabilize", speed: 0 });
    return ok("DISARMED (simulated)");
  }

  async takeoff(altitude: number): Promise<CommandResult> {
    if (!this.state.armed) return fail("Drone must be armed before takeoff");
    this.targetAltitude = Math.min(altitude, getSettings().maxAltitude);
    this.landing = false;
    this.rtl = false;
    this.patch({ flight_mode: "Guided" });
    return ok(`Taking off to ${this.targetAltitude} m (simulated)`);
  }

  async land(): Promise<CommandResult> {
    this.landing = true;
    this.rtl = false;
    this.targetAltitude = 0;
    this.missionStatus = this.missionStatus === "running" ? "paused" : this.missionStatus;
    this.patch({ flight_mode: "Land" });
    return ok("Landing (simulated)");
  }

  async returnToHome(): Promise<CommandResult> {
    this.rtl = true;
    this.landing = false;
    this.targetAltitude = getSettings().rtlAltitude;
    this.patch({ flight_mode: "RTL" });
    return ok("Returning to home (simulated)");
  }

  async hold(): Promise<CommandResult> {
    this.rtl = false;
    this.landing = false;
    if (this.missionStatus === "running") this.missionStatus = "paused";
    this.patch({ flight_mode: "Hold", speed: 0 });
    return ok("Holding position (simulated)");
  }

  async emergencyStop(): Promise<CommandResult> {
    this.mission = null;
    this.missionStatus = "aborted";
    this.landing = true;
    this.rtl = false;
    this.targetAltitude = 0;
    this.patch({
      flight_mode: "Land",
      spraying: false,
      pump_on: false,
      flow_rate: 0,
      speed: 0,
    });
    return ok("EMERGENCY STOP — simulated state only, no hardware command sent");
  }

  // --------------------------------------------------------------- mission
  async startMission(mission: Mission): Promise<CommandResult> {
    if (mission.waypoints.length < 2) return fail("Mission needs at least 2 waypoints");
    if (!this.state.armed) return fail("Arm the drone before starting a mission");
    this.mission = mission;
    this.wpIndex = 0;
    this.missionStatus = "running";
    this.targetAltitude = mission.waypoints[0]?.altitude ?? getSettings().rtlAltitude;
    this.patch({ flight_mode: "Auto" });
    return ok(`Mission "${mission.name}" started (simulated)`);
  }

  async pauseMission(): Promise<CommandResult> {
    if (this.missionStatus !== "running") return fail("No running mission");
    this.missionStatus = "paused";
    this.patch({ flight_mode: "Hold", speed: 0 });
    return ok("Mission paused (simulated)");
  }

  async resumeMission(): Promise<CommandResult> {
    if (this.missionStatus !== "paused") return fail("No paused mission");
    this.missionStatus = "running";
    this.patch({ flight_mode: "Auto" });
    return ok("Mission resumed (simulated)");
  }

  async stopMission(): Promise<CommandResult> {
    if (!this.mission) return fail("No active mission");
    this.missionStatus = "aborted";
    this.mission = null;
    this.patch({ flight_mode: "Loiter", spraying: false, pump_on: false, flow_rate: 0 });
    return ok("Mission aborted (simulated)");
  }

  getMissionProgress(): MissionProgress {
    const total = this.mission?.waypoints.length ?? 0;
    const done = Math.min(this.wpIndex, total);
    const speed = Math.max(this.state.speed, 2);
    const remainingWp = this.mission?.waypoints.slice(this.wpIndex) ?? [];
    let remainingDistance = 0;
    let prev = { lat: this.state.latitude, lng: this.state.longitude };
    for (const wp of remainingWp) {
      remainingDistance += distanceMeters(prev, { lat: wp.latitude, lng: wp.longitude });
      prev = { lat: wp.latitude, lng: wp.longitude };
    }
    return {
      mission_id: this.mission?.id ?? null,
      name: this.mission?.name ?? null,
      status: this.mission ? this.missionStatus : this.missionStatus === "completed" ? "completed" : "idle",
      waypoints_completed: done,
      total_waypoints: total,
      progress: total ? Math.round((done / total) * 100) : 0,
      distance: this.mission?.distance ?? 0,
      remaining_seconds: Math.round(remainingDistance / speed),
    };
  }

  // ----------------------------------------------------------------- spray
  async startSpray(): Promise<CommandResult> {
    const s = getSettings();
    if (this.state.tank_level <= 0.01) return fail("Tank empty — spray blocked");
    if (this.state.tank_level / this.state.tank_capacity * 100 < s.minTankLevel)
      return fail("Tank below minimum level — spray blocked");
    this.pumpVoltage = 11.8;
    this.patch({ spraying: true, pump_on: true });
    return ok("Spray started (simulated)");
  }

  async stopSpray(): Promise<CommandResult> {
    this.pumpVoltage = 0;
    this.flowFault = false;
    this.patch({ spraying: false, pump_on: false, flow_rate: 0 });
    return ok("Spray stopped (simulated)");
  }

  getSprayStatus(): SprayStatus {
    const s = getSettings();
    return {
      tank_capacity: this.state.tank_capacity,
      tank_level: this.state.tank_level,
      tank_percentage: (this.state.tank_level / this.state.tank_capacity) * 100,
      pump_on: this.state.pump_on,
      pump_voltage: this.pumpVoltage,
      flow_rate: this.state.flow_rate,
      total_sprayed: this.state.total_sprayed,
      flow_sensor_ok: !this.flowFault,
      nozzle_count: s.nozzleCount,
      spraying: this.state.spraying,
    };
  }

  refillTank() {
    this.patch({ tank_level: this.state.tank_capacity });
  }

  // --------------------------------------------------------------- sensors
  getSensors(): Sensor[] {
    const s = getSettings();
    const t = this.state;
    const now = t.timestamp;
    const tankPct = (t.tank_level / t.tank_capacity) * 100;
    return [
      {
        name: "flow",
        label: "Pesticide Flow",
        hardware: "YF-S401 flow sensor",
        value: t.flow_rate.toFixed(2),
        unit: "L/min",
        online: true,
        status: this.flowFault ? "error" : t.spraying && t.flow_rate < 0.2 ? "warning" : "ok",
        last_update: now,
        description: "Hall-effect flow meter on the pump outlet line.",
      },
      {
        name: "tank-level",
        label: "Tank Level",
        hardware: "Float water/pesticide level switch",
        value: tankPct.toFixed(0),
        unit: "%",
        online: true,
        status: tankPct <= 5 ? "error" : tankPct < s.minTankLevel ? "warning" : "ok",
        last_update: now,
        description: "Float switch + estimated volume from flow integration.",
      },
      {
        name: "battery",
        label: "Battery Voltage",
        hardware: "Voltage divider sensor (4S Li-Po)",
        value: t.battery_voltage.toFixed(2),
        unit: "V",
        online: true,
        status: t.battery_percentage < 15 ? "error" : t.battery_percentage < s.minBattery ? "warning" : "ok",
        last_update: now,
        description: "Pack voltage measured on the ESP32 ADC.",
      },
      {
        name: "ultrasonic",
        label: "Ultrasonic Proximity",
        hardware: "HC-SR04 x2",
        value: Math.max(0.2, t.obstacle_distance + 0.4).toFixed(2),
        unit: "m",
        online: true,
        status: t.obstacle_distance < s.obstacleDistance ? "warning" : "ok",
        last_update: now,
        description: "Short-range obstacle detection, front and rear.",
      },
      {
        name: "lidar",
        label: "LiDAR Altimeter",
        hardware: "Benewake TFmini-S",
        value: t.altitude.toFixed(2),
        unit: "m",
        online: true,
        status: "ok",
        last_update: now,
        description: "Ground-relative altitude for terrain-following spray.",
      },
      {
        name: "gps",
        label: "GNSS Receiver",
        hardware: "u-blox Neo-M8N",
        value: t.gps_satellites,
        unit: "sats",
        online: t.gps_fix !== "no-fix",
        status:
          t.gps_fix === "no-fix" ? "error" : t.gps_satellites < s.minSatellites ? "warning" : "ok",
        last_update: now,
        description: `Fix: ${t.gps_fix.toUpperCase()} — ${t.latitude.toFixed(5)}, ${t.longitude.toFixed(5)}`,
      },
      {
        name: "telemetry",
        label: "Telemetry Link",
        hardware: "915 MHz radio / Wi-Fi bridge",
        value: t.signal_strength.toFixed(0),
        unit: "%",
        online: t.connection === "connected",
        status:
          t.connection !== "connected" ? "error" : t.signal_strength < 40 ? "warning" : "ok",
        last_update: now,
        description: "MAVLink downlink quality between GCS and flight controller.",
      },
    ];
  }

  // ------------------------------------------------------------------ tick
  private patch(patch: Partial<Telemetry>) {
    this.state = { ...this.state, ...patch, timestamp: new Date().toISOString() };
    this.emit();
  }

  private tick() {
    const s = getSettings();
    const t = { ...this.state };
    const dt = TICK_MS / 1000;
    t.timestamp = new Date().toISOString();
    t.simulation = true;
    t.drone_id = s.droneId;
    t.tank_capacity = s.tankCapacity;

    // Altitude control
    if (this.rtl) {
      const d = distanceMeters({ lat: t.latitude, lng: t.longitude }, t.home);
      if (d < 1.5) this.targetAltitude = 0;
    }
    const altErr = this.targetAltitude - t.altitude;
    const climb = Math.max(-2, Math.min(2.5, altErr));
    t.altitude = Math.max(0, t.altitude + climb * dt);
    t.vertical_speed = Number(climb.toFixed(2));
    if (t.altitude < 0.15 && this.targetAltitude === 0) {
      t.altitude = 0;
      t.vertical_speed = 0;
      if (this.landing || this.rtl) {
        this.landing = false;
        this.rtl = false;
        t.armed = false;
        t.flight_mode = "Loiter";
        t.speed = 0;
      }
    }

    // Horizontal navigation
    let target: { lat: number; lng: number } | null = null;
    if (this.rtl) target = t.home;
    else if (this.mission && this.missionStatus === "running") {
      const wp: Waypoint | undefined = this.mission.waypoints[this.wpIndex];
      if (wp) {
        target = { lat: wp.latitude, lng: wp.longitude };
        this.targetAltitude = Math.min(wp.altitude, s.maxAltitude);
      } else {
        this.missionStatus = "completed";
        this.mission = null;
        t.flight_mode = "Loiter";
      }
    }

    if (target && t.altitude > 1) {
      const speed = Math.min(s.maxSpeed, 4.2);
      const next = moveTowards({ lat: t.latitude, lng: t.longitude }, target, speed * dt);
      t.heading = Math.round(bearingDegrees({ lat: t.latitude, lng: t.longitude }, target));
      t.latitude = next.lat;
      t.longitude = next.lng;
      t.speed = Number((speed + (Math.random() - 0.5) * 0.3).toFixed(2));
      if (distanceMeters({ lat: t.latitude, lng: t.longitude }, target) < 2 && this.mission) {
        this.wpIndex += 1;
      }
    } else if (t.armed && t.altitude > 0.5) {
      // Loiter drift
      t.speed = Number(Math.max(0, t.speed * 0.7 + (Math.random() - 0.5) * 0.2).toFixed(2));
      t.heading = (t.heading + (Math.random() - 0.5) * 2 + 360) % 360;
    } else {
      t.speed = 0;
    }

    // Battery drain
    const load = (t.armed ? 0.012 : 0.002) + (t.pump_on ? 0.006 : 0) + t.speed * 0.001;
    t.battery_percentage = Math.max(0, Number((t.battery_percentage - load).toFixed(2)));
    t.battery_voltage = Number((13.2 + (t.battery_percentage / 100) * 3.6 - (t.armed ? 0.15 : 0)).toFixed(2));

    // Spray simulation
    if (t.spraying && t.tank_level > 0) {
      const target_flow = Math.min(s.flowRateLimit, 2.1);
      t.flow_rate = Number((target_flow + (Math.random() - 0.5) * 0.15).toFixed(2));
      const used = (t.flow_rate / 60) * dt;
      t.tank_level = Math.max(0, Number((t.tank_level - used).toFixed(4)));
      t.total_sprayed = Number((t.total_sprayed + used).toFixed(4));
      if (t.tank_level <= 0) {
        t.spraying = false;
        t.pump_on = false;
        t.flow_rate = 0;
        this.pumpVoltage = 0;
      }
    } else if (!t.spraying) {
      t.flow_rate = 0;
    }
    this.flowFault = t.pump_on && t.flow_rate < 0.2 && t.tank_level > 0.1;

    // GPS / link jitter
    t.gps_satellites = Math.max(6, Math.min(18, t.gps_satellites + (Math.random() < 0.05 ? (Math.random() < 0.5 ? -1 : 1) : 0)));
    t.gps_fix = t.gps_satellites >= 6 ? "3d" : "2d";
    t.signal_strength = Math.max(35, Math.min(99, Number((t.signal_strength + (Math.random() - 0.5) * 3).toFixed(0))));
    t.obstacle_distance = Number(Math.max(1.2, Math.min(25, t.obstacle_distance + (Math.random() - 0.5) * 1.6)).toFixed(2));
    t.distance_to_home = Number(distanceMeters({ lat: t.latitude, lng: t.longitude }, t.home).toFixed(1));
    t.flight_mode = (t.flight_mode || "Loiter") as FlightMode;

    this.state = t;
    this.emit();
  }
}
