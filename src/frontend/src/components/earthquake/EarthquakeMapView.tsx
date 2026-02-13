import { useEffect, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsgsFeature } from '../../lib/usgsTypes';
import { formatMagnitude } from '../../lib/formatters';
import { isLeafletLoaded, createEarthquakeMarker, LeafletMap, LeafletLayerGroup } from '../../lib/leafletTypes';
import { filterEarthquakesInBounds } from '../../lib/earthquakeMapBounds';

interface EarthquakeMapViewProps {
  earthquakes: UsgsFeature[];
  onMarkerClick?: (earthquake: UsgsFeature) => void;
  constrainedHeight?: number;
}

export function EarthquakeMapView({ earthquakes, onMarkerClick, constrainedHeight }: EarthquakeMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null);
  const allEarthquakesRef = useRef<UsgsFeature[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store all earthquakes for bounds filtering
  allEarthquakesRef.current = earthquakes;

  // Update visible markers based on current map bounds
  const updateVisibleMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !isLeafletLoaded()) return;

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const L = window.L;

    // Get current map bounds
    const bounds = map.getBounds();
    
    // Filter earthquakes to visible bounds (with 10% padding)
    const visibleEarthquakes = filterEarthquakesInBounds(
      allEarthquakesRef.current,
      bounds,
      0.1
    );

    // Clear existing markers
    markersLayer.clearLayers();

    // Add markers only for visible earthquakes
    visibleEarthquakes.forEach((earthquake) => {
      const [lon, lat] = earthquake.geometry.coordinates;
      const marker = createEarthquakeMarker(lat, lon, earthquake.properties.mag);

      if (marker) {
        // Add popup with autoPan disabled to prevent map jumping
        const popupContent = `
          <div style="font-family: system-ui, sans-serif;">
            <strong style="font-size: 14px;">M${formatMagnitude(earthquake.properties.mag)}</strong>
            <br/>
            <span style="font-size: 12px; color: #666;">${earthquake.properties.place}</span>
          </div>
        `;
        marker.bindPopup(popupContent, { autoPan: false });

        // Add click handler
        if (onMarkerClick) {
          marker.on('click', () => {
            onMarkerClick(earthquake);
          });
        }

        marker.addTo(markersLayer);
      }
    });
  }, [onMarkerClick]);

  // Debounced update for map move/zoom events
  const handleMapMove = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      updateVisibleMarkers();
    }, 150);
  }, [updateVisibleMarkers]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !isLeafletLoaded()) return;

    const L = window.L;

    // Create map instance
    const map = L.map(mapRef.current).setView([20, 0], 2);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    // Create markers layer group
    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    // Listen to map move and zoom events
    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);

    // Cleanup on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('moveend', handleMapMove);
        mapInstanceRef.current.off('zoomend', handleMapMove);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [handleMapMove]);

  // Update markers when earthquakes change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !isLeafletLoaded()) return;

    const L = window.L;

    // Fit bounds if there are earthquakes
    if (earthquakes.length > 0) {
      const bounds = L.latLngBounds(
        earthquakes.map((eq) => {
          const [lon, lat] = eq.geometry.coordinates;
          return [lat, lon];
        })
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }

    // Update visible markers (will be called after fitBounds triggers moveend)
    updateVisibleMarkers();
  }, [earthquakes, updateVisibleMarkers]);

  // Calculate map height based on whether we're in constrained mode
  const mapHeight = constrainedHeight ? constrainedHeight - 120 : 600;

  // Empty state
  if (earthquakes.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Map View</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No earthquakes found matching your filters.
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Try adjusting your time window or magnitude threshold.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 relative z-0">
      <CardHeader>
        <CardTitle>Map View ({earthquakes.length} events)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={mapRef} 
          className="w-full rounded-b-lg overflow-hidden relative z-0"
          style={{ height: `${mapHeight}px`, minHeight: '400px' }}
        />
      </CardContent>
    </Card>
  );
}
