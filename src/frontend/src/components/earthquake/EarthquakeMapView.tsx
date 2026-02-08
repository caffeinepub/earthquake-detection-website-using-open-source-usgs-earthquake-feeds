import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsgsFeature } from '../../lib/usgsTypes';
import { formatMagnitude } from '../../lib/formatters';
import { isLeafletLoaded, createEarthquakeMarker, LeafletMap, LeafletLayerGroup } from '../../lib/leafletTypes';

interface EarthquakeMapViewProps {
  earthquakes: UsgsFeature[];
  onMarkerClick?: (earthquake: UsgsFeature) => void;
}

export function EarthquakeMapView({ earthquakes, onMarkerClick }: EarthquakeMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null);

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

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when earthquakes change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !isLeafletLoaded()) return;

    const L = window.L;
    const markersLayer = markersLayerRef.current;

    // Clear existing markers
    markersLayer.clearLayers();

    // Add new markers
    earthquakes.forEach((earthquake) => {
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
  }, [earthquakes, onMarkerClick]);

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
          className="w-full h-[600px] rounded-b-lg overflow-hidden relative z-0"
          style={{ minHeight: '400px' }}
        />
      </CardContent>
    </Card>
  );
}
