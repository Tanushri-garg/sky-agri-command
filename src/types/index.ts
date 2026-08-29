/**
 * Domain types shared by the UI, the service layer and the hardware adapters.
 * These types are transport-agnostic: swapping the mock adapter for a real
 * Pixhawk/ESP32 backend must not require changing them.
 */

export type FlightMode =
  | "Stabilize"
  | "Loiter"
  | "Auto"
  | "Guided"
  | "RTL"
  | "Land"
  | "AltHold"
  | "Hold";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";
export type GpsFix = "no-fix" | "2d" | "3d" | "rtk";

export interface Drone {
  id: string;
  name: string;
  model: string;
  status: "idle" | "in-flight" | "charging" | "maintenance" | "offline";
  battery: number;
  firmware_version: string;
  created_at: string;
}

export interface Telemetry {
  drone_id: string;
  timestamp: string;
  connection: ConnectionStatus;
  armed: boolean;
  flight_mode: FlightMode;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  vertical_speed: number;
  heading: number;
  battery_voltage: number;
  battery_percentage: number;
  gps_satellites: number;
  gps_fix: GpsFix;
  signal_strength: number;
  tank_level: number;
  tank_capacity: number;
  flow_rate: number;
  total_sprayed: number;
  pump_on: boolean;
  spraying: boolean;
  distance_to_home: number;
  home: LatLng;
  obstacle_distance: number;
  simulation: boolean;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type MissionStatus = "draft" | "ready" | "running" | "paused" | "completed" | "aborted";

export interface Waypoint {
  id: string;
  mission_id: string;
  sequence: number;
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface Mission {
  id: string;
  drone_id: string;
  name: string;
  area: number; // hectares
  distance: number; // meters
  estimated_time: number; // seconds
  estimated_spray: number; // litres
  status: MissionStatus;
  created_at: string;
  waypoints: Waypoint[];
}

export interface MissionProgress {
  mission_id: string | null;
  name: string | null;
  status: MissionStatus | "idle";
  waypoints_completed: number;
  total_waypoints: number;
  progress: number; // 0..100
  distance: number;
  remaining_seconds: number;
}

export type SensorStatus = "ok" | "warning" | "error" | "offline";

export interface Sensor {
  name: string;
  label: string;
  hardware: string;
  value: number | string;
  unit: string;
  online: boolean;
  status: SensorStatus;
  last_update: string;
  description: string;
}

export interface SpraySession {
  id: string;
  drone_id: string;
  mission_id: string | null;
  start_time: string;
  end_time: string | null;
  total_sprayed: number;
  average_flow: number;
  status: "active" | "completed" | "aborted";
}

export type FlightLogStatus = "Completed" | "Aborted" | "Failed" | "In Progress";

export interface FlightLog {
  id: string;
  drone_id: string;
  mission_id: string | null;
  mission_name: string | null;
  start_time: string;
  end_time: string | null;
  duration: number; // seconds
  distance: number; // meters
  battery_start: number;
  battery_end: number;
  spray_used: number;
  status: FlightLogStatus;
}

export interface SprayStatus {
  tank_capacity: number;
  tank_level: number;
  tank_percentage: number;
  pump_on: boolean;
  pump_voltage: number;
  flow_rate: number;
  total_sprayed: number;
  flow_sensor_ok: boolean;
  nozzle_count: number;
  spraying: boolean;
}

export type AlertLevel = "info" | "warning" | "critical";

export interface SafetyAlert {
  code: string;
  label: string;
  level: AlertLevel;
  detail: string;
}

export interface CommandResult {
  ok: boolean;
  message: string;
  simulated: boolean;
}
