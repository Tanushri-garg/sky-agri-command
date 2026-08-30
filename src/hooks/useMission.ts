import { useEffect, useMemo, useState } from "react";
import { missionApi, sprayApi, sensorApi } from "@/api";
import type { LatLng, Mission, MissionProgress, Sensor, SprayStatus, Telemetry } from "@/types";
import { useTelemetryHistory } from "./useTelemetry";

const idleProgress: MissionProgress = {
  mission_id: null,
  name: null,
  status: "idle",
  waypoints_completed: 0,
  total_waypoints: 0,
  progress: 0,
  distance: 0,
  remaining_seconds: 0,
};

/** Polls the API layer for derived (non-telemetry) state. */
function usePolled<T>(read: () => T, fallback: T, ms = 1000): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    const tick = () => {
      try {
        setValue(read());
      } catch {
        setValue(fallback);
      }
    };
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
  return value;
}

export function useMissionProgress(): MissionProgress {
  return usePolled(() => missionApi.progress(), idleProgress);
}

export function useSprayStatus(): SprayStatus | null {
  return usePolled<SprayStatus | null>(() => sprayApi.status(), null);
}

export function useSensors(): Sensor[] {
  const empty = useMemo<Sensor[]>(() => [], []);
  return usePolled<Sensor[]>(() => sensorApi.list(), empty, 1500);
}

export function useMissions(): [Mission[], () => void] {
  const [missions, setMissions] = useState<Mission[]>([]);
  const reload = () => {
    void missionApi.list().then(setMissions);
  };
  useEffect(reload, []);
  return [missions, reload];
}

/** Flight trail derived from telemetry history. */
export function useTrail(): LatLng[] {
  const history: Telemetry[] = useTelemetryHistory();
  return useMemo(() => history.map((h) => ({ lat: h.latitude, lng: h.longitude })), [history]);
}
