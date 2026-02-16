// TypeScript declarations for Leaflet global object
declare global {
  interface Window {
    L: any;
  }
}

export interface LeafletLatLngBounds {
  getNorth(): number;
  getSouth(): number;
  getEast(): number;
  getWest(): number;
  pad(bufferRatio: number): LeafletLatLngBounds;
}

export interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  remove(): void;
  invalidateSize(): void;
  fitBounds(bounds: any, options?: any): LeafletMap;
  getBounds(): LeafletLatLngBounds;
  on(event: string, handler: () => void): void;
  off(event: string, handler?: () => void): void;
}

export interface LeafletMarker {
  addTo(target: LeafletMap | LeafletLayerGroup): LeafletMarker;
  on(event: string, handler: (e: any) => void): LeafletMarker;
  bindPopup(content: string, options?: any): LeafletMarker;
}

export interface LeafletLayerGroup {
  addTo(map: LeafletMap): LeafletLayerGroup;
  clearLayers(): void;
  addLayer(layer: LeafletMarker): void;
}

// Helper to check if Leaflet is loaded
export function isLeafletLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.L;
}

// Helper to create a marker with custom icon based on magnitude
export function createEarthquakeMarker(
  lat: number,
  lon: number,
  magnitude: number | null
): LeafletMarker | null {
  if (!isLeafletLoaded()) return null;

  const L = window.L;
  
  // Color based on magnitude
  let color = '#64748b'; // default gray
  if (magnitude !== null) {
    if (magnitude >= 7.0) color = '#dc2626'; // red
    else if (magnitude >= 6.0) color = '#ea580c'; // orange
    else if (magnitude >= 5.0) color = '#f59e0b'; // amber
    else if (magnitude >= 4.0) color = '#eab308'; // yellow
    else if (magnitude >= 3.0) color = '#84cc16'; // lime
    else color = '#22c55e'; // green
  }

  // Size based on magnitude
  const radius = magnitude !== null ? Math.max(4, Math.min(magnitude * 2, 20)) : 6;

  const marker = L.circleMarker([lat, lon], {
    radius: radius,
    fillColor: color,
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.7,
  });

  return marker;
}

export {};
