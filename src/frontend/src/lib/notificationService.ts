// Haversine distance in km
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

const notifiedIds = new Set<string>();

export function notifyNearbyEarthquakes(
  earthquakes: {
    id: string;
    lat: number;
    lng: number;
    mag: number | null;
    place: string;
    time: number;
  }[],
  userLat: number,
  userLng: number,
  maxDistanceKm = 1000,
): void {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;

  const now = Date.now();
  // Only notify about earthquakes that occurred in the past 60 minutes
  const recent = earthquakes.filter((eq) => now - eq.time < 3600000);

  for (const eq of recent) {
    if (notifiedIds.has(eq.id)) continue;
    notifiedIds.add(eq.id);

    const dist = distanceKm(userLat, userLng, eq.lat, eq.lng);
    if (dist > maxDistanceKm) continue;

    const mag = eq.mag !== null ? eq.mag.toFixed(1) : "?";
    const distStr = Math.round(dist).toLocaleString();

    new Notification(`Gempa Terdekat: M${mag}`, {
      body: `${eq.place}\n${distStr} km dari lokasi Anda`,
      icon: "/assets/generated/eq-logo.dim_512x512.png",
      tag: eq.id,
    });
  }
}
