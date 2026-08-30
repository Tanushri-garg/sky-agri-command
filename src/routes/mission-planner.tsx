import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Save, Play, Pause, Square, Grid3x3, RotateCcw, FolderOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Metric, StatusPill } from "@/components/common/StatCard";
import { DroneMap } from "@/components/map/DroneMap";
import { useSettings, useTelemetry } from "@/hooks/useTelemetry";
import { useMissionProgress, useMissions, useTrail } from "@/hooks/useMission";
import { missionApi } from "@/api";
import { computeMissionStats, uid } from "@/services/repository";
import { offsetMeters } from "@/utils/geo";
import type { CommandResult, LatLng, Waypoint } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mission-planner")({
  head: () => ({
    meta: [
      { title: "Mission Planner — AgriDrone GCS" },
      {
        name: "description",
        content:
          "Plan agricultural spraying missions: draw waypoints on the field map, generate grid routes and estimate flight time and spray volume.",
      },
      { property: "og:title", content: "Mission Planner — AgriDrone GCS" },
      { property: "og:description", content: "Waypoint and field-grid mission planning for spraying drones." },
    ],
  }),
  component: MissionPlanner;
});

function MissionPlanner() {
  return null;
}
