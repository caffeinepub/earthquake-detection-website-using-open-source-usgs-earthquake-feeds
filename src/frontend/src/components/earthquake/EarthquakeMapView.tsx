import { useEffect, useRef, useCallback, useState } from 'react';
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
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
            <strong style="font-size: 14px; display: block; margin-bottom: 4px;">
              M${formatMagnitude(earthquake.properties.mag)}
            </strong>
            <div style="font-size: 12px; color: #666;">
              ${earthquake.properties.place}
            </div>
          </div>
        `;
        marker.bindPopup(popupContent, { autoPan: false });

        // Handle marker click - prevent default navigation behavior
        marker.on('click', (e) => {
          // Stop event propagation and prevent default behavior
          if (e.originalEvent) {
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
          }
          
          // Use Leaflet's DomEvent to stop propagation
          if (window.L && window.L.DomEvent) {
            window.L.DomEvent.stopPropagation(e);
            window.L.DomEvent.preventDefault(e);
          }

          // Call the callback without triggering navigation
          if (onMarkerClick) {
            onMarkerClick(earthquake);
          }
        });

        markersLayer.addLayer(marker);
      }
    });
  }, [onMarkerClick]);

  // Debounced update on map move/zoom
  const handleMapMoveEnd = useCallback(() => {
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = window.setTimeout(() => {
      updateVisibleMarkers();
    }, 150);
  }, [updateVisibleMarkers]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !isLeafletLoaded()) return;

    const L = window.L;
    if (!L) return;

    // Create map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 0.5,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      noWrap: false,
    }).addTo(map);

    // Create markers layer
    const markersLayer = L.layerGroup().addTo(map);

    // Store references
    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    // Listen to map move/zoom events
    map.on('moveend', handleMapMoveEnd);
    map.on('zoomend', handleMapMoveEnd);

    // Create custom fullscreen control
    const FullscreenControl = L.Control.extend({
      options: {
        position: 'topright',
      },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('button', 'leaflet-control-fullscreen', container);
        
        button.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        `;
        button.title = 'Toggle fullscreen';
        button.setAttribute('aria-label', 'Toggle fullscreen');
        button.type = 'button';

        // Prevent default anchor behavior and stop propagation
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.disableScrollPropagation(button);
        
        L.DomEvent.on(button, 'click', function (e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          
          const mapContainer = mapRef.current;
          if (!mapContainer) return;

          const isCurrentlyFullscreen = document.fullscreenElement === mapContainer;

          if (!isCurrentlyFullscreen) {
            // Enter fullscreen
            if (mapContainer.requestFullscreen) {
              mapContainer.requestFullscreen();
            }
          } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
              document.exitFullscreen();
            }
          }
        });

        fullscreenControlRef.current = button;
        return container;
      },
    });

    map.addControl(new FullscreenControl());

    // Handle fullscreen change events
    const handleFullscreenChange = () => {
      const mapContainer = mapRef.current;
      if (!mapContainer) return;

      const isNowFullscreen = document.fullscreenElement === mapContainer;
      setIsFullScreen(isNowFullscreen);

      // Update button icon and aria-label
      if (fullscreenControlRef.current) {
        const button = fullscreenControlRef.current;
        if (isNowFullscreen) {
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          `;
          button.setAttribute('aria-label', 'Exit fullscreen');
        } else {
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          `;
          button.setAttribute('aria-label', 'Toggle fullscreen');
        }
      }

      // Force map to recalculate size after layout settles
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
        // Second pass after a short delay to catch any late layout changes
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Set up ResizeObserver to handle container size changes
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => {
        // Debounce resize invalidation
        requestAnimationFrame(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
      });
      resizeObserverRef.current.observe(mapRef.current);
    }

    // Initial marker update
    updateVisibleMarkers();

    // Cleanup
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('moveend', handleMapMoveEnd);
        mapInstanceRef.current.off('zoomend', handleMapMoveEnd);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersLayerRef.current = null;
    };
  }, [handleMapMoveEnd, updateVisibleMarkers]);

  // Update markers when earthquakes change
  useEffect(() => {
    updateVisibleMarkers();
  }, [earthquakes, updateVisibleMarkers]);

  // Handle fullscreen state changes to ensure proper sizing
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Invalidate size when fullscreen state changes
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isFullScreen]);

  const mapHeight = constrainedHeight || 600;

  return (
    <PanelCard
      title="Earthquake Map"
      subtitle={`${earthquakes.length} ${earthquakes.length === 1 ? 'event' : 'events'}`}
      noPadding
    >
      <div className="border-t border-border/30">
        <div
          ref={mapRef}
          className={`w-full transition-none ${
            isFullScreen ? 'map-fullscreen' : ''
          }`}
          style={{ height: isFullScreen ? '100vh' : `${mapHeight}px` }}
        />
      </div>
    </PanelCard>
  );
}
