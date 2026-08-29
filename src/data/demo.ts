import type { Drone, FlightLog, Mission } from "@/types";
import { defaultSettings } from "@/lib/config";
import { offsetMeters } from "@/utils/geo";

/** Realistic demo data used while the app runs in simulation mode. */

export const demoDrone: Drone = {
  id: defaultSettings.droneId,
  name: "AgriDrone Alpha",
  model: defaultSettings.droneModel,
  status: "idle",
  battery: 78,
  firmware_version: defaultSettings.firmwareVersion,
  created_at: "2026-01-12T06:30:00.000Z",
};

const home = { lat: defaultSettings.homeLat, lng: defaultSettings.homeLng };

/** A 3-pass boustrophedon route across a small demo field. */
export const demoMission: Mission = (() => {
  const legs = [
    offsetMeters(home, 20, 0),
    offsetMeters(home, 20, 120),
    offsetMeters(home, 55, 120),
    offsetMeters(home, 55, 0),
    offsetMeters(home, 90, 0),
    offsetMeters(home, 90, 120),
  ];
  return {
    id: "demo-mission",
    drone_id: demoDrone.id,
    name: "Nashik Block A — Cotton",
    area: 1.08,
    distance: 610,
    estimated_time: 260,
    estimated_spray: 6.4,
    status: "ready",
    created_at: "2026-02-02T04:10:00.000Z",
    waypoints: legs.map((p, i) => ({
      id: `demo-wp-${i}`,
      mission_id: "demo-mission",
      sequence: i,
      latitude: Number(p.lat.toFixed(6)),
      longitude: Number(p.lng.toFixed(6)),
      altitude: 12,
    })),
  };
})();

export const demoFlightLogs: FlightLog[] = [
  {
    id: "log-1042",
    drone_id: demoDrone.id,
    mission_id: "demo-mission",
    mission_name: "Nashik Block A — Cotton",
    start_time: "2026-08-26T03:12:00.000Z",
    end_time: "2026-08-26T03:31:00.000Z",
    duration: 1140,
    distance: 2410,
    battery_start: 98,
    battery_end: 46,
    spray_used: 7.8,
    status: "Completed",
  },
  {
    id: "log-1041",
    drone_id: demoDrone.id,
    mission_id: "demo-mission",
    mission_name: "Nashik Block B — Grapes",
    start_time: "2026-08-24T04:02:00.000Z",
    end_time: "2026-08-24T04:11:00.000Z",
    duration: 540,
    distance: 980,
    battery_start: 96,
    battery_end: 71,
    spray_used: 3.2,
    status: "Aborted",
  },
  {
    id: "log-1040",
    drone_id: demoDrone.id,
    mission_id: null,
    mission_name: "Manual proximity test",
    start_time: "2026-08-21T05:40:00.000Z",
    end_time: "2026-08-21T05:46:00.000Z",
    duration: 360,
    distance: 310,
    battery_start: 88,
    battery_end: 74,
    spray_used: 0,
    status: "Failed",
  },
];
