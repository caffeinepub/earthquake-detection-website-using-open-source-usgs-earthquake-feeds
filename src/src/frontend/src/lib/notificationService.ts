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

// Track IDs that have already been checked (not just notified)
// Use a Map to remember distance so we don't re-check
const checkedIds = new Set<string>();

type NearbyQuakeTranslator = {
  nearbyQuake: (mag: string) => string;
  nearbyQuakeBody: (place: string, dist: string) => string;
};

export async function notifyNearbyEarthquakes(
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
  translator?: NearbyQuakeTranslator,
): Promise<void> {
  if (!("Notification" in window)) return;

  // Request permission if not yet granted
  if (Notification.permission !== "granted") {
    const granted = await requestNotificationPermission();
    if (!granted) return;
  }

  const now = Date.now();
  // Only notify about earthquakes that occurred in the past 60 minutes
  const recent = earthquakes.filter((eq) => now - eq.time < 3600000);

  for (const eq of recent) {
    // Skip already-checked IDs (prevents duplicate notifications)
    if (checkedIds.has(eq.id)) continue;
    checkedIds.add(eq.id);

    const dist = distanceKm(userLat, userLng, eq.lat, eq.lng);
    // Only notify if within the configured radius
    if (dist > maxDistanceKm) continue;

    const mag = eq.mag !== null ? eq.mag.toFixed(1) : "?";
    const distStr = Math.round(dist).toLocaleString();

    const title = translator
      ? translator.nearbyQuake(mag)
      : `Nearby Earthquake: M${mag}`;
    const body = translator
      ? translator.nearbyQuakeBody(eq.place, distStr)
      : `${eq.place}\n${distStr} km from your location`;

    try {
      new Notification(title, {
        body,
        icon: "/assets/generated/eq-logo.dim_512x512.png",
        tag: eq.id,
      });
    } catch (err) {
      console.warn("Notification failed:", err);
    }
  }
}

/**
 * Reset the checked IDs cache — call this when user location changes
 * so previous earthquakes can be re-evaluated against the new location.
 */
export function resetNotificationCache(): void {
  checkedIds.clear();
}
