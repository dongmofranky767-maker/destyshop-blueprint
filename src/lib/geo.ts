import { useSyncExternalStore } from "react";

/** Distance à vol d'oiseau (km), formule de haversine. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

// Position choisie par le client, conservée sur l'appareil uniquement (pas envoyée sans action de sa part).
export type GeoPosition = { lat: number; lng: number; label: string };
const KEY = "destyshop.position.v1";
const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: GeoPosition | null = null;

function read(): GeoPosition | null {
  const raw = localStorage.getItem(KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try { cache = raw ? (JSON.parse(raw) as GeoPosition) : null; } catch { cache = null; }
  }
  return cache;
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}
export function setPosition(p: GeoPosition | null) {
  if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}
export function usePosition() {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function requestBrowserPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) { reject(new Error("La géolocalisation n'est pas disponible sur cet appareil.")); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, label: "Ma position" }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? "Accès à la position refusé. Choisissez une ville." : "Position introuvable. Choisissez une ville.")),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}
