import { getAdapter } from "@/hardware";
import { getSettings } from "@/lib/config";
import type { SafetyAlert, Telemetry } from "@/types";

/**
 * Service layer between React and the hardware adapter.
 * Also keeps a rolling telemetry history for the charts.
 */

const HISTORY_LIMIT = 120;

let history: Telemetry[] = [];
let lastReceived = 0;
const historyListeners = new Set<() => void>();

export const serverTelemetry: Telemetry = {
  drone_id: "AGRI-DRONE-01",
  timestamp: "1970-01-01T00:00:00.000Z",
  connection: "connecting",
  armed: false,
  flight_mode: "Loiter",
  latitude: 19.9975,
  longitude: 73.7898,
  altitude: 0,
  speed: 0,
  vertical_speed: 0,
  heading: 92,
  battery_voltage: 15.4,
  battery_percentage: 78,
  gps_satellites: 12,
  gps_fix: "3d",
  signal_strength: 92,
  tank_level: 7.2,
  tank_capacity: 10,
  flow_rate: 0,
  total_sprayed: 0,
  pump_on: false,
  spraying: false,
  distance_to_home: 0,
  home: { lat: 19.9975, lng: 73.7898 },
  obstacle_distance: 12,
  simulation: true,
};

export function subscribeTelemetry(listener: () => void) {
  const unsubscribe = getAdapter().subscribe((t) => {
    lastReceived = Date.now();
    history = [...history, t].slice(-HISTORY_LIMIT);
    historyListeners.forEach((l) => l());
    listener();
  });
  return () => unsubscribe();
}

export function getTelemetrySnapshot(): Telemetry {
  try {
    return getAdapter().getTelemetry();
  } catch {
    return serverTelemetry;
  }
}

export function subscribeHistory(listener: () => void) {
  historyListeners.add(listener);
  return () => historyListeners.delete(listener);
}

export function getHistorySnapshot(): Telemetry[] {
  return history;
}

const emptyHistory: Telemetry[] = [];
export const getServerHistory = () => emptyHistory;

export function isLinkStale(): boolean {
  return lastReceived > 0 && Date.now() - lastReceived > 5000;
}

/** Derives all dashboard safety warnings from a telemetry frame. */
export function computeAlerts(t: Telemetry): SafetyAlert[] {
  const s = getSettings();
  const alerts: SafetyAlert[] = [];
  const tankPct = (t.tank_level / t.tank_capacity) * 100;

  if (t.battery_percentage < 15)
    alerts.push({
      code: "BATTERY_CRITICAL",
      label: "CRITICAL BATTERY",
      level: "critical",
      detail: `${t.battery_percentage.toFixed(0)}% remaining — land immediately.`,
    });
  else if (t.battery_percentage < s.minBattery)
    alerts.push({
      code: "LOW_BATTERY",
      label: "LOW BATTERY",
      level: "warning",
      detail: `${t.battery_percentage.toFixed(0)}% is below the ${s.minBattery}% safety limit.`,
    });

  if (tankPct <= 2)
    alerts.push({
      code: "TANK_EMPTY",
      label: "TANK EMPTY",
      level: "critical",
      detail: "Spray disabled until the tank is refilled.",
    });
  else if (tankPct < s.minTankLevel)
    alerts.push({
      code: "LOW_TANK",
      label: "LOW TANK",
      level: "warning",
      detail: `Tank at ${tankPct.toFixed(0)}% (minimum ${s.minTankLevel}%).`,
    });

  if (t.gps_fix === "no-fix" || t.gps_satellites < s.minSatellites)
    alerts.push({
      code: "GPS_LOST",
      label: "GPS DEGRADED",
      level: t.gps_fix === "no-fix" ? "critical" : "warning",
      detail: `${t.gps_satellites} satellites, fix ${t.gps_fix.toUpperCase()}.`,
    });

  if (t.connection !== "connected" || t.signal_strength < 40)
    alerts.push({
      code: "TELEMETRY_LOST",
      label: "TELEMETRY WEAK",
      level: t.connection !== "connected" ? "critical" : "warning",
      detail: `Link ${t.connection}, signal ${t.signal_strength}%.`,
    });

  if (t.obstacle_distance < s.obstacleDistance)
    alerts.push({
      code: "OBSTACLE",
      label: "OBSTACLE DETECTED",
      level: "warning",
      detail: `Object at ${t.obstacle_distance.toFixed(1)} m (limit ${s.obstacleDistance} m).`,
    });

  if (t.pump_on && t.flow_rate < 0.2 && t.tank_level > 0.1)
    alerts.push({
      code: "FLOW_ERROR",
      label: "FLOW SENSOR ERROR",
      level: "warning",
      detail: "Pump active but YF-S401 reports no flow.",
    });

  if (t.altitude > s.maxAltitude)
    alerts.push({
      code: "ALT_LIMIT",
      label: "ALTITUDE LIMIT",
      level: "warning",
      detail: `Altitude ${t.altitude.toFixed(1)} m exceeds ${s.maxAltitude} m.`,
    });

  return alerts;
}
