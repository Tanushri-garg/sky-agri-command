import { useSyncExternalStore } from "react";
import {
  getHistorySnapshot,
  getServerHistory,
  getTelemetrySnapshot,
  serverTelemetry,
  subscribeHistory,
  subscribeTelemetry,
  computeAlerts,
} from "@/services/telemetryService";
import { settingsStore, type AppSettings } from "@/lib/config";
import type { SafetyAlert, Telemetry } from "@/types";

export function useTelemetry(): Telemetry {
  return useSyncExternalStore(subscribeTelemetry, getTelemetrySnapshot, () => serverTelemetry);
}

export function useTelemetryHistory(): Telemetry[] {
  return useSyncExternalStore(subscribeHistory, getHistorySnapshot, getServerHistory);
}

export function useSafetyAlerts(telemetry: Telemetry): SafetyAlert[] {
  return computeAlerts(telemetry);
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(
    (l) => settingsStore.subscribe(l),
    () => settingsStore.get(),
    () => settingsStore.get(),
  );
}
