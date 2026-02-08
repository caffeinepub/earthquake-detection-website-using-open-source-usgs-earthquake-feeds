import { UsgsFeature } from './usgsTypes';

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

export function applyFilters(
  features: UsgsFeature[],
  minMagnitude: number,
  searchQuery: string
): UsgsFeature[] {
  let filtered = features;
  filtered = filterByMagnitude(filtered, minMagnitude);
  filtered = filterByPlace(filtered, searchQuery);
  return filtered;
}
