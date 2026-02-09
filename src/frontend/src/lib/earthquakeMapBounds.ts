import { UsgsFeature } from './usgsTypes';
import { LeafletLatLngBounds } from './leafletTypes';

/**
 * Filters earthquakes to only those within the provided map bounds.
 * Optionally applies padding to include earthquakes slightly outside the visible area.
 */
export function filterEarthquakesInBounds(
  earthquakes: UsgsFeature[],
  bounds: LeafletLatLngBounds,
  paddingRatio: number = 0.1
): UsgsFeature[] {
  // Apply padding to bounds
  const paddedBounds = bounds.pad(paddingRatio);
  
  const north = paddedBounds.getNorth();
  const south = paddedBounds.getSouth();
  const east = paddedBounds.getEast();
  const west = paddedBounds.getWest();

  return earthquakes.filter((earthquake) => {
    const [lon, lat] = earthquake.geometry.coordinates;
    
    // Handle longitude wrapping around the date line
    let adjustedLon = lon;
    if (east < west) {
      // Bounds cross the date line
      if (lon < 0) adjustedLon = lon + 360;
    }
    
    const inLatRange = lat >= south && lat <= north;
    const inLonRange = east < west 
      ? (adjustedLon >= west || adjustedLon <= east)
      : (adjustedLon >= west && adjustedLon <= east);
    
    return inLatRange && inLonRange;
  });
}
