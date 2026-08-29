import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { LeafletMapProps } from "./LeafletMap";

const LeafletMap = lazy(() => import("./LeafletMap"));

function MapSkeleton() {
  return (
    <div className="grid-bg flex h-full w-full items-center justify-center rounded-lg bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
      Loading map…
    </div>
  );
}

/** SSR-safe map wrapper. Leaflet only ever loads in the browser. */
export function DroneMap(props: LeafletMapProps) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <LeafletMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
