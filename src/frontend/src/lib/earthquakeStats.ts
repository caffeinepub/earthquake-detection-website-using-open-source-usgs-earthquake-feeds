import { UsgsFeature } from './usgsTypes';

export interface EarthquakeStats {
  total: number;
  aboveThreshold: number;
  largestMagnitude: UsgsFeature | null;
}

export function computeStats(
  features: UsgsFeature[],
  threshold: number
): EarthquakeStats {
  const aboveThreshold = features.filter(
    (f) => f.properties.mag !== null && f.properties.mag >= threshold
  ).length;

  const largestMagnitude = features.reduce<UsgsFeature | null>((max, current) => {
    if (current.properties.mag === null) return max;
    if (!max || max.properties.mag === null) return current;
    return current.properties.mag > max.properties.mag ? current : max;
  }, null);

  return {
    total: features.length,
    aboveThreshold,
    largestMagnitude,
  };
}
