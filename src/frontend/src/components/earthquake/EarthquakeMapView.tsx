import { useCallback, useEffect, useRef, useState } from "react";
import { useMapTerrainMode } from "../../hooks/useMapTerrainMode";
import { filterEarthquakesInBounds } from "../../lib/earthquakeMapBounds";
import { formatMagnitude } from "../../lib/formatters";
import {
  type LeafletLayerGroup,
  type LeafletMap,
  type LeafletTileLayer,
  createEarthquakeMarker,
  isLeafletLoaded,
} from "../../lib/leafletTypes";
import type { UsgsFeature } from "../../lib/usgsTypes";
import { PanelCard } from "./PanelCard";

interface EarthquakeMapViewProps {
  earthquakes: UsgsFeature[];
  onMarkerClick?: (earthquake: UsgsFeature) => void;
  constrainedHeight?: number;
  autoFitBounds?: boolean;
  selectedEarthquake?: UsgsFeature | null;
}

export function EarthquakeMapView({
  earthquakes,
  onMarkerClick,
  constrainedHeight,
  autoFitBounds = false,
  selectedEarthquake,
}: EarthquakeMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null);
  const tectonicLayerRef = useRef<LeafletLayerGroup | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const allEarthquakesRef = useRef<UsgsFeature[]>([]);
  const updateTimeoutRef = useRef<number | null>(null);
  const fullscreenControlRef = useRef<HTMLButtonElement | null>(null);
  const tectonicToggleRef = useRef<HTMLButtonElement | null>(null);
  const terrainToggleRef = useRef<HTMLButtonElement | null>(null);
  const shakemapToggleRef = useRef<HTMLButtonElement | null>(null);
  const toggleShakemapRef = useRef<() => void>(() => {});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const shakemapLayerRef = useRef<any | null>(null);
  const shakemapDataRef = useRef<{
    url: string;
    bounds: [[number, number], [number, number]];
  } | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showShakemap, setShowShakemap] = useState(false);
  const [shakemapAvailable, setShakemapAvailable] = useState(false);
  const [showTectonics, setShowTectonics] = useState(false);
  const [tectonicDataLoaded, setTectonicDataLoaded] = useState(false);
  const hasAutoFittedRef = useRef(false);
  const { terrainMode, toggleTerrainMode } = useMapTerrainMode();

  // Store all earthquakes for bounds filtering
  allEarthquakesRef.current = earthquakes;

  // Update visible markers based on current map bounds
  const updateVisibleMarkers = useCallback(() => {
    if (
      !mapInstanceRef.current ||
      !markersLayerRef.current ||
      !isLeafletLoaded()
    )
      return;

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    // Get current map bounds
    const bounds = map.getBounds();

    // Filter earthquakes to visible bounds (with 10% padding)
    const visibleEarthquakes = filterEarthquakesInBounds(
      allEarthquakesRef.current,
      bounds,
      0.1,
    );

    // Clear existing markers
    markersLayer.clearLayers();

    // Add markers only for visible earthquakes
    for (const earthquake of visibleEarthquakes) {
      const [lon, lat] = earthquake.geometry.coordinates;
      const isTsunami = earthquake.properties.tsunami === 1;
      const marker = createEarthquakeMarker(
        lat,
        lon,
        earthquake.properties.mag,
        isTsunami,
      );

      if (marker) {
        // Add popup with autoPan disabled to prevent map jumping
        const tsunamiLabel = isTsunami
          ? `<div style="margin-top:6px;padding:3px 8px;background:#dc2626;color:#fff;border-radius:4px;font-size:11px;font-weight:bold;display:inline-flex;align-items:center;gap:4px;">⚠ TSUNAMI WARNING</div>`
          : "";
        const popupContent = `
          <div style="font-family: system-ui, sans-serif;">
            <strong style="font-size: 14px; display: block; margin-bottom: 4px;">
              M${formatMagnitude(earthquake.properties.mag)}
            </strong>
            <div style="font-size: 12px; color: #666;">
              ${earthquake.properties.place}
            </div>
            ${tsunamiLabel}
          </div>
        `;
        marker.bindPopup(popupContent, { autoPan: false });

        // Handle marker click - prevent default navigation behavior
        marker.on("click", (e) => {
          // Stop event propagation and prevent default behavior
          if (e.originalEvent) {
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
          }

          // Use Leaflet's DomEvent to stop propagation
          window.L?.DomEvent?.stopPropagation(e);
          window.L?.DomEvent?.preventDefault(e);

          // Call the callback without triggering navigation
          if (onMarkerClick) {
            onMarkerClick(earthquake);
          }
        });

        markersLayer.addLayer(marker);
      }
    }
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

  // Load tectonic boundaries GeoJSON
  const loadTectonicBoundaries = useCallback(async () => {
    if (
      !mapInstanceRef.current ||
      !tectonicLayerRef.current ||
      !isLeafletLoaded() ||
      tectonicDataLoaded
    )
      return;

    const L = window.L;
    if (!L) return;

    try {
      // Fetch tectonic boundaries from GitHub
      const response = await fetch(
        "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json",
      );
      const geojsonData = await response.json();

      // Add GeoJSON layer with custom styling
      L.geoJSON(geojsonData, {
        style: {
          color: "#ff6b35",
          weight: 2,
          opacity: 0.7,
        },
      }).addTo(tectonicLayerRef.current!);

      setTectonicDataLoaded(true);
    } catch (error) {
      console.error("Failed to load tectonic boundaries:", error);
    }
  }, [tectonicDataLoaded]);

  // Toggle tectonic boundaries visibility
  const toggleTectonicBoundaries = useCallback(() => {
    if (!mapInstanceRef.current || !tectonicLayerRef.current) return;

    const newShowState = !showTectonics;
    setShowTectonics(newShowState);

    if (newShowState) {
      // Show layer and load data if not already loaded
      mapInstanceRef.current.addLayer(tectonicLayerRef.current);
      if (!tectonicDataLoaded) {
        loadTectonicBoundaries();
      }
    } else {
      // Hide layer
      mapInstanceRef.current.removeLayer(tectonicLayerRef.current);
    }
  }, [showTectonics, tectonicDataLoaded, loadTectonicBoundaries]);

  // Toggle shakemap visibility
  const toggleShakemap = useCallback(() => {
    setShowShakemap((prev) => {
      const next = !prev;
      if (next) {
        if (shakemapDataRef.current) {
          // apply in next tick so state is set
          setTimeout(() => {
            if (
              !shakemapDataRef.current ||
              !mapInstanceRef.current ||
              !isLeafletLoaded()
            )
              return;
            const L = window.L;
            if (!L) return;
            if (shakemapLayerRef.current) {
              try {
                mapInstanceRef.current.removeLayer(shakemapLayerRef.current);
              } catch (_e) {
                /* ignore */
              }
              shakemapLayerRef.current = null;
            }
            const { url, bounds } = shakemapDataRef.current;
            const overlay = L.imageOverlay(url, bounds, {
              opacity: 0.7,
              zIndex: 500,
              attribution: "\u00a9 USGS ShakeMap",
            });
            overlay.addTo(mapInstanceRef.current);
            shakemapLayerRef.current = overlay;
            mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
          }, 0);
        } else {
          console.warn("No ShakeMap data available for this earthquake.");
        }
      } else {
        if (shakemapLayerRef.current && mapInstanceRef.current) {
          try {
            mapInstanceRef.current.removeLayer(shakemapLayerRef.current);
          } catch (_e) {
            /* ignore */
          }
          shakemapLayerRef.current = null;
        }
      }
      return next;
    });
  }, []);
  toggleShakemapRef.current = toggleShakemap;

  // Fetch ShakeMap data when selectedEarthquake changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedEarthquake is the trigger
  useEffect(() => {
    if (!selectedEarthquake) {
      shakemapDataRef.current = null;
      setShakemapAvailable(false);
      if (shakemapLayerRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(shakemapLayerRef.current);
        } catch (_e) {
          /* ignore */
        }
        shakemapLayerRef.current = null;
      }
      setShowShakemap(false);
      return;
    }

    const detailUrl = selectedEarthquake.properties.detail;
    if (!detailUrl) {
      shakemapDataRef.current = null;
      setShakemapAvailable(false);
      return;
    }

    let cancelled = false;

    fetch(detailUrl)
      .then((res) => res.json())
      .then((eventDetail) => {
        if (cancelled) return;
        const shakemapProduct =
          eventDetail?.properties?.products?.shakemap?.[0];
        if (!shakemapProduct) {
          shakemapDataRef.current = null;
          setShakemapAvailable(false);
          if (shakemapLayerRef.current && mapInstanceRef.current) {
            try {
              mapInstanceRef.current.removeLayer(shakemapLayerRef.current);
            } catch (_e) {
              /* ignore */
            }
            shakemapLayerRef.current = null;
          }
          setShowShakemap(false);
          return;
        }

        const imageUrl = shakemapProduct.contents?.["intensity.jpg"]?.url;
        const props = shakemapProduct.properties || {};
        const minLat = Number.parseFloat(props["minimum-latitude"]);
        const maxLat = Number.parseFloat(props["maximum-latitude"]);
        const minLon = Number.parseFloat(props["minimum-longitude"]);
        const maxLon = Number.parseFloat(props["maximum-longitude"]);

        if (
          !imageUrl ||
          Number.isNaN(minLat) ||
          Number.isNaN(maxLat) ||
          Number.isNaN(minLon) ||
          Number.isNaN(maxLon)
        ) {
          shakemapDataRef.current = null;
          setShakemapAvailable(false);
          if (shakemapLayerRef.current && mapInstanceRef.current) {
            try {
              mapInstanceRef.current.removeLayer(shakemapLayerRef.current);
            } catch (_e) {
              /* ignore */
            }
            shakemapLayerRef.current = null;
          }
          setShowShakemap(false);
          return;
        }

        shakemapDataRef.current = {
          url: imageUrl,
          bounds: [
            [minLat, minLon],
            [maxLat, maxLon],
          ],
        };
        setShakemapAvailable(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("Failed to fetch ShakeMap data:", err);
          shakemapDataRef.current = null;
          setShakemapAvailable(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEarthquake]);

  // Update shakemap toggle button appearance
  useEffect(() => {
    if (!shakemapToggleRef.current) return;
    const button = shakemapToggleRef.current;
    if (!shakemapAvailable) {
      button.style.opacity = "0.4";
      button.style.cursor = "not-allowed";
      button.title = "No ShakeMap available for this event";
    } else {
      button.style.opacity = "1";
      button.style.cursor = "pointer";
      button.title = "Toggle USGS ShakeMap overlay";
    }
    if (showShakemap && shakemapAvailable) {
      button.classList.add("active");
      button.style.backgroundColor = "#f59e0b";
      button.style.color = "#fff";
    } else {
      button.classList.remove("active");
      if (shakemapAvailable) {
        button.style.backgroundColor = "";
        button.style.color = "";
      }
    }
  }, [showShakemap, shakemapAvailable]);

  // Switch tile layer based on terrain mode
  const switchTileLayer = useCallback((mode: "light" | "dark") => {
    if (!mapInstanceRef.current || !isLeafletLoaded()) return;

    const L = window.L;
    if (!L) return;

    const map = mapInstanceRef.current;

    // Remove existing tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // Create new tile layer based on mode
    let newTileLayer: LeafletTileLayer;
    if (mode === "dark") {
      newTileLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "\u00a9 OpenStreetMap contributors, \u00a9 CARTO",
          noWrap: false,
          className: "dark-terrain-tiles",
        },
      );
    } else {
      newTileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "\u00a9 OpenStreetMap contributors",
          noWrap: false,
          className: "light-terrain-tiles",
        },
      );
    }

    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, []);

  // Handle terrain toggle
  const handleTerrainToggle = useCallback(() => {
    toggleTerrainMode();
  }, [toggleTerrainMode]);

  // Auto-fit bounds when earthquakes change and autoFitBounds is true
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !isLeafletLoaded() ||
      !autoFitBounds ||
      earthquakes.length === 0
    )
      return;

    const L = window.L;
    if (!L) return;

    if (hasAutoFittedRef.current) return;

    const bounds = L.latLngBounds(
      earthquakes.map((eq) => {
        const [lon, lat] = eq.geometry.coordinates;
        return L.latLng(lat, lon);
      }),
    );

    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 8,
      });
      hasAutoFittedRef.current = true;
    }
  }, [earthquakes, autoFitBounds]);

  // Reset auto-fit flag when autoFitBounds changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally react on autoFitBounds
  useEffect(() => {
    hasAutoFittedRef.current = false;
  }, [autoFitBounds]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !isLeafletLoaded()) return;

    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 0.5,
    });

    let initialTileLayer: LeafletTileLayer;
    if (terrainMode === "dark") {
      initialTileLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "\u00a9 OpenStreetMap contributors, \u00a9 CARTO",
          noWrap: false,
          className: "dark-terrain-tiles",
        },
      );
    } else {
      initialTileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "\u00a9 OpenStreetMap contributors",
          noWrap: false,
          className: "light-terrain-tiles",
        },
      );
    }
    initialTileLayer.addTo(map);
    tileLayerRef.current = initialTileLayer;

    const tectonicLayer = L.layerGroup();
    tectonicLayerRef.current = tectonicLayer;

    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    map.on("moveend", handleMapMoveEnd);
    map.on("zoomend", handleMapMoveEnd);

    // Terrain toggle control
    const TerrainToggleControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: () => {
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control",
        );
        const button = L.DomUtil.create(
          "button",
          "leaflet-control-terrain-toggle",
          container,
        );
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
        button.title = "Toggle map terrain style";
        button.setAttribute("aria-label", "Toggle map terrain style");
        button.type = "button";
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.disableScrollPropagation(button);
        L.DomEvent.on(button, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          handleTerrainToggle();
        });
        terrainToggleRef.current = button;
        return container;
      },
    });
    map.addControl(new TerrainToggleControl());

    // Tectonic toggle control
    const TectonicToggleControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: () => {
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control",
        );
        const button = L.DomUtil.create(
          "button",
          "leaflet-control-tectonic-toggle",
          container,
        );
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
        button.title = "Toggle tectonic boundaries";
        button.setAttribute("aria-label", "Toggle tectonic boundaries");
        button.type = "button";
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.disableScrollPropagation(button);
        L.DomEvent.on(button, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          toggleTectonicBoundaries();
        });
        tectonicToggleRef.current = button;
        return container;
      },
    });
    map.addControl(new TectonicToggleControl());

    // ShakeMap toggle control
    const ShakemapToggleControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: () => {
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control",
        );
        const button = L.DomUtil.create(
          "button",
          "leaflet-control-shakemap-toggle",
          container,
        );
        button.innerHTML = `<span style="font-size:11px;font-weight:bold;letter-spacing:-0.5px;">SM</span>`;
        button.title = "Toggle USGS ShakeMap overlay";
        button.setAttribute("aria-label", "Toggle ShakeMap overlay");
        button.type = "button";
        button.style.minWidth = "30px";
        button.style.minHeight = "30px";
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.disableScrollPropagation(button);
        L.DomEvent.on(button, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          toggleShakemapRef.current();
        });
        shakemapToggleRef.current = button;
        return container;
      },
    });
    map.addControl(new ShakemapToggleControl());

    // Fullscreen control
    const FullscreenControl = L.Control.extend({
      options: { position: "topright" },
      onAdd: () => {
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control",
        );
        const button = L.DomUtil.create(
          "button",
          "leaflet-control-fullscreen",
          container,
        );
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
        button.title = "Toggle fullscreen";
        button.setAttribute("aria-label", "Toggle fullscreen");
        button.type = "button";
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.disableScrollPropagation(button);
        L.DomEvent.on(button, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          const mapContainer = mapRef.current;
          if (!mapContainer) return;
          const isCurrentlyFullscreen =
            document.fullscreenElement === mapContainer;
          if (!isCurrentlyFullscreen) {
            if (mapContainer.requestFullscreen)
              mapContainer.requestFullscreen();
          } else {
            if (document.exitFullscreen) document.exitFullscreen();
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
      if (fullscreenControlRef.current) {
        const button = fullscreenControlRef.current;
        if (isNowFullscreen) {
          button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
          button.setAttribute("aria-label", "Exit fullscreen");
        } else {
          button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
          button.setAttribute("aria-label", "Toggle fullscreen");
        }
      }
      for (const delay of [50, 100, 200, 300, 500]) {
        setTimeout(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, delay);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        });
      });
      resizeObserverRef.current.observe(mapRef.current);
    }

    updateVisibleMarkers();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off("moveend", handleMapMoveEnd);
        mapInstanceRef.current.off("zoomend", handleMapMoveEnd);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersLayerRef.current = null;
      tectonicLayerRef.current = null;
      tileLayerRef.current = null;
      shakemapLayerRef.current = null;
    };
  }, [
    handleMapMoveEnd,
    updateVisibleMarkers,
    toggleTectonicBoundaries,
    handleTerrainToggle,
    terrainMode,
  ]);

  // Update markers when earthquakes change
  // biome-ignore lint/correctness/useExhaustiveDependencies: earthquakes triggers updateVisibleMarkers
  useEffect(() => {
    updateVisibleMarkers();
  }, [earthquakes, updateVisibleMarkers]);

  // Handle fullscreen state changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: isFullScreen is the trigger dependency
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 50);
    return () => clearTimeout(timer);
  }, [isFullScreen]);

  // Update tectonic toggle button appearance
  useEffect(() => {
    if (!tectonicToggleRef.current) return;
    const button = tectonicToggleRef.current;
    if (showTectonics) {
      button.classList.add("active");
      button.style.backgroundColor = "oklch(var(--primary))";
      button.style.color = "oklch(var(--primary-foreground))";
    } else {
      button.classList.remove("active");
      button.style.backgroundColor = "";
      button.style.color = "";
    }
  }, [showTectonics]);

  // Update terrain toggle button appearance
  useEffect(() => {
    if (!terrainToggleRef.current) return;
    const button = terrainToggleRef.current;
    if (terrainMode === "dark") {
      button.classList.add("active");
      button.style.backgroundColor = "oklch(var(--accent))";
      button.style.color = "oklch(var(--accent-foreground))";
    } else {
      button.classList.remove("active");
      button.style.backgroundColor = "";
      button.style.color = "";
    }
  }, [terrainMode]);

  // Switch tile layer when terrain mode changes
  useEffect(() => {
    switchTileLayer(terrainMode);
  }, [terrainMode, switchTileLayer]);

  const mapHeight = constrainedHeight || 600;

  return (
    <PanelCard
      title="Earthquake Map"
      subtitle={`${earthquakes.length} ${earthquakes.length === 1 ? "event" : "events"}`}
      noPadding
    >
      <div className="border-t border-border/30">
        <div
          ref={mapRef}
          className={`w-full transition-none ${
            isFullScreen ? "map-fullscreen" : ""
          }`}
          id="leaflet-map"
          style={{
            height: isFullScreen ? "100vh" : `${mapHeight}px`,
            backgroundColor: "#1a1a2e",
          }}
        />
      </div>
    </PanelCard>
  );
}
