import type { TimeWindow, UsgsFeature } from "./usgsTypes";

/**
 * Filter features by time window - only include events within the specified time range
 */
export function filterByTimeWindow(
  features: UsgsFeature[],
  timeWindow: TimeWindow,
): UsgsFeature[] {
  const now = Date.now();
  const timeWindowMs: Record<TimeWindow, number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };

  const cutoffTime = now - timeWindowMs[timeWindow];

  return features.filter((feature) => feature.properties.time >= cutoffTime);
}

export function filterByMagnitude(
  features: UsgsFeature[],
  minMagnitude: number,
): UsgsFeature[] {
  return features.filter(
    (feature) =>
      feature.properties.mag !== null && feature.properties.mag >= minMagnitude,
  );
}

export function filterByPlace(
  features: UsgsFeature[],
  searchQuery: string,
): UsgsFeature[] {
  const normalizedQuery = searchQuery.trim();
  if (!normalizedQuery) return features;

  const query = normalizedQuery.toLowerCase();
  return features.filter((feature) =>
    feature.properties.place.toLowerCase().includes(query),
  );
}

/**
 * Sort features by time descending (most recent first)
 */
export function sortByTimeDescending(features: UsgsFeature[]): UsgsFeature[] {
  return [...features].sort((a, b) => b.properties.time - a.properties.time);
}

export function applyFilters(
  features: UsgsFeature[],
  timeWindow: TimeWindow,
  minMagnitude: number,
  searchQuery: string,
): UsgsFeature[] {
  let filtered = features;
  filtered = filterByTimeWindow(filtered, timeWindow);
  filtered = filterByMagnitude(filtered, minMagnitude);
  filtered = filterByPlace(filtered, searchQuery);
  filtered = sortByTimeDescending(filtered);
  return filtered;
}
