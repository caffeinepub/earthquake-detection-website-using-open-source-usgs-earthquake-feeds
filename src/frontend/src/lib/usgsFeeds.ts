import type { TimeWindow } from "./usgsTypes";

const USGS_FEED_BASE_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary";

const USGS_CATALOG_API = "https://earthquake.usgs.gov/fdsnws/event/1/query";

export const TIME_WINDOW_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: "hour", label: "Past Hour" },
  { value: "day", label: "Past Day" },
  { value: "week", label: "Past Week" },
  { value: "month", label: "Past Month" },
  { value: "year", label: "Past Year" },
];

export function getUsgsFeedUrl(timeWindow: TimeWindow): string {
  if (timeWindow === "year") {
    // USGS FDSNWS Catalog API – supports arbitrary date ranges
    // Limit to M2.5+ to keep the payload manageable
    const endTime = new Date();
    const startTime = new Date();
    startTime.setFullYear(startTime.getFullYear() - 1);

    const fmt = (d: Date) => d.toISOString().slice(0, 19);
    return `${USGS_CATALOG_API}?format=geojson&starttime=${fmt(startTime)}&endtime=${fmt(endTime)}&minmagnitude=2.5&orderby=time&limit=20000`;
  }

  // Standard GeoJSON feeds for hour / day / week / month
  return `${USGS_FEED_BASE_URL}/all_${timeWindow}.geojson`;
}

export function getMagnitudeLabel(magnitude: number | null): string {
  if (magnitude === null) return "Unknown";
  if (magnitude < 2.5) return "Minor";
  if (magnitude < 4.5) return "Light";
  if (magnitude < 6.0) return "Moderate";
  if (magnitude < 7.0) return "Strong";
  if (magnitude < 8.0) return "Major";
  return "Great";
}

export function getMagnitudeColor(magnitude: number | null): string {
  if (magnitude === null) return "muted";
  if (magnitude < 2.5) return "success";
  if (magnitude < 4.5) return "secondary";
  if (magnitude < 6.0) return "warning";
  if (magnitude < 7.0) return "destructive";
  return "destructive";
}
