import type { LatLng } from "@/types";

const R = 6371000; // earth radius, metres
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Move `meters` from `from` towards `to`, clamped at the destination. */
export function moveTowards(from: LatLng, to: LatLng, meters: number): LatLng {
  const d = distanceMeters(from, to);
  if (d <= meters || d === 0) return { ...to };
  const f = meters / d;
  return { lat: from.lat + (to.lat - from.lat) * f, lng: from.lng + (to.lng - from.lng) * f };
}

/** Total path length in metres. */
export function pathDistance(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceMeters(points[i - 1]!, points[i]!);
  return total;
}

/** Approximate polygon area (hectares) using the shoelace formula on a local plane. */
export function polygonAreaHectares(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const lat0 = toRad(points[0]!.lat);
  const xy = points.map((p) => ({
    x: toRad(p.lng) * R * Math.cos(lat0),
    y: toRad(p.lat) * R,
  }));
  let sum = 0;
  for (let i = 0; i < xy.length; i++) {
    const a = xy[i]!;
    const b = xy[(i + 1) % xy.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2) / 10000;
}

/** Offset a point by metres north/east. */
export function offsetMeters(p: LatLng, north: number, east: number): LatLng {
  return {
    lat: p.lat + toDeg(north / R),
    lng: p.lng + toDeg(east / (R * Math.cos(toRad(p.lat)))),
  };
}

export function formatCoord(v: number): string {
  return v.toFixed(6);
}
