import { UsgsFeature, TimeWindow } from './usgsTypes';

/**
 * Filter features by time window - only include events within the specified time range
 */
export function filterByTimeWindow(
  features: UsgsFeature[],
  timeWindow: TimeWindow
): UsgsFeature[] {
  const now = Date.now();
  const timeWindowMs: Record<TimeWindow, number> = {
    hour: 60 * 60 * 1000,        // 1 hour
    day: 24 * 60 * 60 * 1000,    // 24 hours
    week: 7 * 24 * 60 * 60 * 1000,   // 7 days
    month: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  
  const cutoffTime = now - timeWindowMs[timeWindow];
  
  return features.filter(
    (feature) => feature.properties.time >= cutoffTime
  );
}

export function filterByMagnitude(
  features: UsgsFeature[],
  minMagnitude: number
): UsgsFeature[] {
  return features.filter(
    (feature) => feature.properties.mag !== null && feature.properties.mag >= minMagnitude
  );
}

export function filterByPlace(
  features: UsgsFeature[],
  searchQuery: string
): UsgsFeature[] {
  // Normalize whitespace: trim and treat whitespace-only as empty
  const normalizedQuery = searchQuery.trim();
  if (!normalizedQuery) return features;
  
  const query = normalizedQuery.toLowerCase();
  return features.filter((feature) =>
    feature.properties.place.toLowerCase().includes(query)
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
  searchQuery: string
): UsgsFeature[] {
  let filtered = features;
  // Apply time window restriction first
  filtered = filterByTimeWindow(filtered, timeWindow);
  // Apply magnitude filter
  filtered = filterByMagnitude(filtered, minMagnitude);
  // Apply place search filter
  filtered = filterByPlace(filtered, searchQuery);
  // Sort by time descending (most recent first)
  filtered = sortByTimeDescending(filtered);
  return filtered;
}
