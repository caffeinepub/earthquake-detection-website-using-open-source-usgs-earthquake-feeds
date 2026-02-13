import { useEffect, useRef, useCallback, useState } from 'react';
import { MapPin } from 'lucide-react';
import { PanelCard } from './PanelCard';
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
  const updateTimeoutRef = useRef<number | null>(null);
  const fullscreenControlRef = useRef<HTMLButtonElement | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Store all earthquakes for bounds filtering
  allEarthquakesRef.current = earthquakes;

  // Update visible markers based on current map bounds
  const updateVisibleMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !isLeafletLoaded()) return;

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

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
    updateTimeoutRef.current = window.setTimeout(() => {
      updateVisibleMarkers();
    }, 150);
  }, [updateVisibleMarkers]);

  // Toggle full-screen mode
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => {
      const newState = !prev;
      
      // Toggle body scroll
      if (newState) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      
      // Update control button attributes
      if (fullscreenControlRef.current) {
        const label = newState ? 'Exit full screen' : 'Enter full screen';
        fullscreenControlRef.current.setAttribute('aria-label', label);
        fullscreenControlRef.current.setAttribute('title', label);
        fullscreenControlRef.current.setAttribute('data-fullscreen', newState ? 'true' : 'false');
      }
      
      // Invalidate map size after state change and after layout settles
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      
      // Additional invalidation after animation completes
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 350);
      
      return newState;
    });
  }, []);

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

    // Create custom full-screen control
    const FullScreenControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-fullscreen');
        const button = L.DomUtil.create('button', 'leaflet-control-fullscreen-button', container);
        button.type = 'button';
        button.title = 'Enter full screen';
        button.setAttribute('role', 'button');
        button.setAttribute('aria-label', 'Enter full screen');
        button.setAttribute('data-fullscreen', 'false');
        
        // Store reference for state updates
        fullscreenControlRef.current = button;
        
        // Prevent default behavior and stop propagation
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.disableScrollPropagation(button);
        
        L.DomEvent.on(button, 'click', function(e: Event) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          toggleFullScreen();
        });
        
        // Keyboard support
        L.DomEvent.on(button, 'keydown', function(e: KeyboardEvent) {
          if (e.key === 'Enter' || e.key === ' ') {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            toggleFullScreen();
          }
        });
        
        return container;
      }
    });

    // Add the full-screen control (it will naturally appear below zoom controls)
    map.addControl(new FullScreenControl());

    // Prevent map interactions from bubbling
    const mapContainer = mapRef.current;
    if (mapContainer) {
      L.DomEvent.disableClickPropagation(mapContainer);
      L.DomEvent.disableScrollPropagation(mapContainer);
    }

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
      // Restore body scroll on unmount
      document.body.style.overflow = '';
      fullscreenControlRef.current = null;
    };
  }, [handleMapMove, toggleFullScreen]);

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

  // Calculate map height
  const mapHeight = constrainedHeight 
    ? Math.min(constrainedHeight - 100, 520) 
    : 600;
  
  const minHeight = constrainedHeight ? 300 : 400;

  // Empty state
  if (earthquakes.length === 0) {
    return (
      <PanelCard title="Map View" subtitle="No results">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center font-medium">
            No earthquakes found matching your filters.
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Try adjusting your time window or magnitude threshold.
          </p>
        </div>
      </PanelCard>
    );
  }

  return (
    <div className={isFullScreen ? 'map-fullscreen' : ''}>
      <PanelCard
        title="Map View"
        subtitle={`${earthquakes.length} ${earthquakes.length === 1 ? 'event' : 'events'}`}
        noPadding
      >
        <div 
          ref={mapRef} 
          className="w-full border-t border-border/30 relative z-0 rounded-b-lg overflow-hidden"
          style={{ height: `${mapHeight}px`, minHeight: `${minHeight}px` }}
        />
      </PanelCard>
    </div>
  );
}
