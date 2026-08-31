import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLng, Telemetry, Waypoint } from "@/types";

/**
 * Browser-only Leaflet renderer. Never import this module from an SSR path —
 * always through `DroneMap`, which lazy-loads it behind <ClientOnly>.
 * Swapping the map provider only touches this file.
 */

export interface LeafletMapProps {
  telemetry: Telemetry;
  waypoints: Waypoint[];
  trail: LatLng[];
  showSprayArea?: boolean;
  editable?: boolean;
  follow?: boolean;
  obstacles?: LatLng[];
  onMapClick?: (p: LatLng) => void;
  onWaypointMove?: (id: string, p: LatLng) => void;
  onWaypointClick?: (id: string) => void;
}

const droneIcon = (heading: number) =>
  L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg)">
      <div style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:22px solid oklch(0.75 0.19 140);filter:drop-shadow(0 0 6px oklch(0.75 0.19 140))"></div>
    </div>`,
  });

const homeIcon = L.divIcon({
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<div style="width:16px;height:16px;border-radius:4px;border:2px solid oklch(0.72 0.13 220);background:oklch(0.19 0.02 155)"></div>`,
});

const wpIcon = (n: number) =>
  L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:50%;border:1.5px solid oklch(0.79 0.16 78);background:oklch(0.19 0.02 155);color:oklch(0.79 0.16 78);font:600 11px/20px ui-sans-serif;text-align:center">${n}</div>`,
  });

function ClickHandler({ onMapClick }: { onMapClick?: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Leaflet computes tile offsets from the container size at init; the panel
 * grows after mount (lazy load + flex layout), so force a recalculation. */
function ResizeFixer() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const raf = requestAnimationFrame(fix);
    const timer = setTimeout(fix, 300);
    const container = map.getContainer();
    const observer = new ResizeObserver(fix);
    observer.observe(container);
    window.addEventListener("resize", fix);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", fix);
    };
  }, [map]);
  return null;
}

function Follower({ position, follow }: { position: LatLng; follow?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow) map.panTo([position.lat, position.lng], { animate: true, duration: 0.5 });
  }, [follow, position.lat, position.lng, map]);
  return null;
}

export default function LeafletMap({
  telemetry,
  waypoints,
  trail,
  showSprayArea,
  editable,
  follow,
  obstacles = [],
  onMapClick,
  onWaypointMove,
  onWaypointClick,
}: LeafletMapProps) {
  const position: LatLng = { lat: telemetry.latitude, lng: telemetry.longitude };
  const route = useMemo(
    () => waypoints.map((w) => [w.latitude, w.longitude] as [number, number]),
    [waypoints],
  );

  return (
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={17}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      <ResizeFixer />
      <ClickHandler {...(editable && onMapClick ? { onMapClick } : {})} />
      <Follower position={position} {...(follow !== undefined ? { follow } : {})} />

      {showSprayArea && route.length >= 3 && (
        <Polygon
          positions={route}
          pathOptions={{ color: "oklch(0.75 0.19 140)", weight: 1, fillOpacity: 0.12 }}
        />
      )}

      {route.length >= 2 && (
        <Polyline
          positions={route}
          pathOptions={{ color: "oklch(0.79 0.16 78)", weight: 2, dashArray: "6 6" }}
        />
      )}

      {trail.length >= 2 && (
        <Polyline
          positions={trail.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "oklch(0.75 0.19 140)", weight: 3, opacity: 0.85 }}
        />
      )}

      <Marker position={[telemetry.home.lat, telemetry.home.lng]} icon={homeIcon} />

      {waypoints.map((w, i) => (
        <Marker
          key={w.id}
          position={[w.latitude, w.longitude]}
          icon={wpIcon(i + 1)}
          draggable={!!editable}
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              onWaypointMove?.(w.id, { lat: ll.lat, lng: ll.lng });
            },
            click: () => onWaypointClick?.(w.id),
          }}
        />
      ))}

      {obstacles.map((o, i) => (
        <Circle
          key={`obs-${i}`}
          center={[o.lat, o.lng]}
          radius={4}
          pathOptions={{ color: "oklch(0.62 0.22 26)", weight: 1, fillOpacity: 0.25 }}
        />
      ))}

      <Marker position={[position.lat, position.lng]} icon={droneIcon(telemetry.heading)} />
      {telemetry.spraying && (
        <Circle
          center={[position.lat, position.lng]}
          radius={6}
          pathOptions={{ color: "oklch(0.72 0.13 220)", weight: 1, fillOpacity: 0.25 }}
        />
      )}
    </MapContainer>
  );
}
