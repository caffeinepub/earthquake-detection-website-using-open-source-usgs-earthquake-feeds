import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCircumferencePoint,
  getMmiColor,
  getMmiFromUsgsAlert,
  getMmiLabel,
  getMmiRadiusKm,
  getPWaveRadiusKm,
  getSWaveRadiusKm,
} from "../../lib/eewUtils";
import { isLeafletLoaded } from "../../lib/leafletTypes";
import type { UsgsFeature } from "../../lib/usgsTypes";

interface EewViewProps {
  earthquakes: UsgsFeature[];
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getAlertColor(alert: string | null, mag: number | null): string {
  if (alert === "red" || (mag !== null && mag >= 7)) return "#dc2626";
  if (alert === "orange" || (mag !== null && mag >= 6)) return "#ea580c";
  if (alert === "yellow" || (mag !== null && mag >= 5)) return "#f59e0b";
  if (alert === "green" || (mag !== null && mag >= 4)) return "#22c55e";
  return "#6b7280";
}

const MMI_LEVELS = [8, 7, 6, 5, 4, 3, 2] as const;

const MMI_DESCRIPTIONS: Record<number, string> = {
  8: "Severe — Major damage to structures",
  7: "Very Strong — Widespread damage",
  6: "Strong — Felt by all, damage possible",
  5: "Moderate — Felt widely, minor damage",
  4: "Light — Felt indoors by many",
  3: "Weak — Felt by few near epicenter",
  2: "Not felt — Detected by instruments only",
};

// Type alias: mmiLevel -> city/region name
type MmiCityMap = Record<number, string>;

export function EewView({ earthquakes }: EewViewProps) {
  const alerts = earthquakes
    .filter((eq) => (eq.properties.mag ?? 0) >= 2.5)
    .sort((a, b) => b.properties.time - a.properties.time)
    .slice(0, 20);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [, forceUpdate] = useState(0);
  // cityLabels: eq.id -> { mmiLevel: cityName }
  const [cityLabels, setCityLabels] = useState<Record<string, MmiCityMap>>({});

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const epicenterLayerRef = useRef<any | null>(null);
  const waveLayerRef = useRef<any | null>(null);
  const pWaveCircleRef = useRef<any | null>(null);
  const sWaveCircleRef = useRef<any | null>(null);

  const selectedEq =
    alerts.find((eq) => eq.id === selectedId) ?? alerts[0] ?? null;

  // Auto-select first when list changes
  useEffect(() => {
    if (
      alerts.length > 0 &&
      (!selectedId || !alerts.find((e) => e.id === selectedId))
    ) {
      setSelectedId(alerts[0].id);
    }
  }, [alerts, selectedId]);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      forceUpdate((n) => n + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset elapsed when selected earthquake changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedEq.id is the trigger
  useEffect(() => {
    if (selectedEq) {
      const diffSec = Math.floor(
        (Date.now() - selectedEq.properties.time) / 1000,
      );
      setElapsedSeconds(diffSec);
    }
  }, [selectedEq?.id]);

  // Fetch Nominatim city labels for each MMI ring boundary of an earthquake.
  // We fire one request per MMI level with a 300 ms gap to respect rate limits.
  const fetchCityLabelsForEq = useCallback(
    async (eq: UsgsFeature) => {
      // Skip if already cached
      if (cityLabels[eq.id]) return;

      const [lon, lat, eqDepthRaw] = eq.geometry.coordinates;
      const mag = eq.properties.mag ?? 0;
      const depthKm =
        typeof eqDepthRaw === "number" && eqDepthRaw > 0 ? eqDepthRaw : 10;

      const result: MmiCityMap = {};

      for (const mmiLevel of MMI_LEVELS) {
        const radiusKm = getMmiRadiusKm(mag, mmiLevel, depthKm);
        if (radiusKm <= 0 || radiusKm >= 20000) continue;

        // Point on the East bearing of the ring boundary
        const [ptLat, ptLon] = getCircumferencePoint(lat, lon, radiusKm, 90);

        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${ptLat.toFixed(5)}&lon=${ptLon.toFixed(5)}&zoom=10&addressdetails=1`;
          const res = await fetch(url, {
            headers: {
              "User-Agent":
                "WhoFeelAnEarthquake/1.0 (earthquake-monitoring-app)",
            },
          });
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address ?? {};
            const name =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.county ||
              addr.state ||
              addr.country ||
              null;
            if (name) result[mmiLevel] = name;
          }
        } catch {
          // Network failure — skip this level silently
        }

        // 300 ms gap between requests to respect Nominatim 1 req/sec policy
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (Object.keys(result).length > 0) {
        setCityLabels((prev) => ({ ...prev, [eq.id]: result }));
      } else {
        // Still mark as fetched (empty) so we don't retry
        setCityLabels((prev) => ({ ...prev, [eq.id]: result }));
      }
    },
    // cityLabels as dependency so the cache-check is always fresh
    [cityLabels],
  );

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    function initMap() {
      if (!isLeafletLoaded() || !mapRef.current) return;
      const L = window.L;
      if (!L) return;

      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
        zoomControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "\u00a9 OpenStreetMap contributors, \u00a9 CARTO",
          noWrap: false,
        },
      ).addTo(map);

      epicenterLayerRef.current = L.layerGroup().addTo(map);
      waveLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    if (!isLeafletLoaded()) {
      const timer = setTimeout(initMap, 500);
      return () => clearTimeout(timer);
    }
    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        epicenterLayerRef.current = null;
        waveLayerRef.current = null;
        pWaveCircleRef.current = null;
        sWaveCircleRef.current = null;
      }
    };
  }, []);

  // Draw all MMI rings + city labels + epicenter for the selected earthquake
  const updateMapForEarthquake = useCallback(
    (labelsForEq?: MmiCityMap) => {
      if (!mapInstanceRef.current || !isLeafletLoaded() || !selectedEq) return;
      const L = window.L;
      if (!L) return;

      const [lon, lat, eqDepth] = selectedEq.geometry.coordinates;
      const mag = selectedEq.properties.mag ?? 0;
      const depthKm = typeof eqDepth === "number" && eqDepth > 0 ? eqDepth : 10;

      if (epicenterLayerRef.current) epicenterLayerRef.current.clearLayers();
      if (waveLayerRef.current) waveLayerRef.current.clearLayers();
      pWaveCircleRef.current = null;
      sWaveCircleRef.current = null;

      // MMI concentric filled zones (draw from outer/low to inner/high)
      for (const mmiLevel of [...MMI_LEVELS].reverse()) {
        const radiusKm = getMmiRadiusKm(mag, mmiLevel, depthKm);
        if (radiusKm > 0 && radiusKm < 20000) {
          const color = getMmiColor(mmiLevel);
          const circle = L.circle([lat, lon], {
            radius: radiusKm * 1000,
            color: color,
            fillColor: color,
            fillOpacity: 0.18,
            weight: 1,
            opacity: 0.5,
          });
          if (epicenterLayerRef.current)
            epicenterLayerRef.current.addLayer(circle);
        }
      }

      // MMI dashed boundary rings + city labels
      for (const mmiLevel of MMI_LEVELS) {
        const radiusKm = getMmiRadiusKm(mag, mmiLevel, depthKm);
        if (radiusKm > 0 && radiusKm < 20000) {
          const color = getMmiColor(mmiLevel);

          // Dashed ring
          const ring = L.circle([lat, lon], {
            radius: radiusKm * 1000,
            color: color,
            fill: false,
            weight: 2,
            opacity: 0.9,
            dashArray: "4 4",
          });
          if (epicenterLayerRef.current)
            epicenterLayerRef.current.addLayer(ring);

          // City label at East boundary
          const cityName = labelsForEq?.[mmiLevel];
          if (cityName) {
            const [ptLat, ptLon] = getCircumferencePoint(
              lat,
              lon,
              radiusKm,
              90,
            );
            const labelIcon = L.divIcon({
              className: "",
              html: `<div style="
                background: rgba(0,0,0,0.75);
                border: 1px solid ${color};
                border-radius: 4px;
                padding: 2px 6px;
                color: ${color};
                font-size: 10px;
                font-weight: bold;
                white-space: nowrap;
                pointer-events: none;
                font-family: monospace;
                line-height: 1.4;
                box-shadow: 0 1px 4px rgba(0,0,0,0.6);
              ">MMI ${mmiLevel} · ${cityName}</div>`,
              iconSize: undefined,
              iconAnchor: [0, 10],
            });
            const labelMarker = L.marker([ptLat, ptLon], {
              icon: labelIcon,
              interactive: false,
              keyboard: false,
            });
            if (epicenterLayerRef.current)
              epicenterLayerRef.current.addLayer(labelMarker);
          }
        }
      }

      // P-wave ring
      const pRadius = getPWaveRadiusKm(elapsedSeconds);
      if (pRadius > 0 && elapsedSeconds < 600) {
        const pCircle = L.circle([lat, lon], {
          radius: pRadius * 1000,
          color: "#60a5fa",
          fill: false,
          weight: 3,
          opacity: 0.9,
          dashArray: "8 4",
        });
        if (waveLayerRef.current) waveLayerRef.current.addLayer(pCircle);
        pWaveCircleRef.current = pCircle;
      }

      // S-wave ring
      const sRadius = getSWaveRadiusKm(elapsedSeconds);
      if (sRadius > 0 && elapsedSeconds < 600) {
        const sCircle = L.circle([lat, lon], {
          radius: sRadius * 1000,
          color: "#f97316",
          fill: false,
          weight: 3,
          opacity: 0.9,
          dashArray: "6 3",
        });
        if (waveLayerRef.current) waveLayerRef.current.addLayer(sCircle);
        sWaveCircleRef.current = sCircle;
      }

      // Epicenter pulsing marker
      const epicenterIcon = L.divIcon({
        className: "",
        html: `<div class="eew-epicenter-pulse"></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      const epicenterMarker = L.marker([lat, lon], { icon: epicenterIcon });
      if (epicenterLayerRef.current)
        epicenterLayerRef.current.addLayer(epicenterMarker);

      const zoom = mag >= 6 ? 5 : mag >= 5 ? 6 : 7;
      mapInstanceRef.current.setView([lat, lon], zoom);
    },
    [selectedEq, elapsedSeconds],
  );

  // Update only wave rings on each tick
  const updateWaveRings = useCallback(() => {
    if (!mapInstanceRef.current || !isLeafletLoaded() || !selectedEq) return;
    const L = window.L;
    if (!L || !waveLayerRef.current) return;

    const [lon, lat] = selectedEq.geometry.coordinates;
    waveLayerRef.current.clearLayers();
    pWaveCircleRef.current = null;
    sWaveCircleRef.current = null;

    if (elapsedSeconds >= 600) return;

    const pRadius = getPWaveRadiusKm(elapsedSeconds);
    if (pRadius > 0) {
      const pCircle = L.circle([lat, lon], {
        radius: pRadius * 1000,
        color: "#60a5fa",
        fill: false,
        weight: 3,
        opacity: 0.9,
        dashArray: "8 4",
      });
      waveLayerRef.current.addLayer(pCircle);
      pWaveCircleRef.current = pCircle;
    }

    const sRadius = getSWaveRadiusKm(elapsedSeconds);
    if (sRadius > 0) {
      const sCircle = L.circle([lat, lon], {
        radius: sRadius * 1000,
        color: "#f97316",
        fill: false,
        weight: 3,
        opacity: 0.9,
        dashArray: "6 3",
      });
      waveLayerRef.current.addLayer(sCircle);
      sWaveCircleRef.current = sCircle;
    }
  }, [selectedEq, elapsedSeconds]);

  // Full map update when selected eq changes; also kick off label fetching
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedEq.id triggers full map reset
  useEffect(() => {
    if (!selectedEq) return;
    // Draw map immediately (labels may arrive later)
    updateMapForEarthquake(cityLabels[selectedEq.id]);
    // Start fetching city labels in the background
    fetchCityLabelsForEq(selectedEq);
  }, [selectedEq?.id]);

  // Re-render MMI rings + labels whenever city labels arrive for the current eq
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to label changes for current eq
  useEffect(() => {
    if (!selectedEq || !cityLabels[selectedEq.id]) return;
    updateMapForEarthquake(cityLabels[selectedEq.id]);
  }, [cityLabels]);

  useEffect(() => {
    updateWaveRings();
  }, [updateWaveRings]);

  const elapsed = selectedEq
    ? Math.floor((Date.now() - selectedEq.properties.time) / 1000)
    : 0;

  const mag = selectedEq?.properties.mag ?? 0;
  const depth = selectedEq?.geometry.coordinates[2] ?? 0;
  const alert = selectedEq?.properties.alert ?? null;
  const mmiDisplay = selectedEq?.properties.mmi
    ? selectedEq.properties.mmi
    : getMmiFromUsgsAlert(alert);

  const significantCount = earthquakes.filter(
    (eq) =>
      (eq.properties.mag ?? 0) >= 5 &&
      Date.now() - eq.properties.time < 3600000,
  ).length;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes epicenter-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(2.5); opacity: 0.3; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes epicenter-ring-pulse {
          0% { transform: scale(0.5); opacity: 0.9; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .eew-epicenter-pulse {
          width: 40px;
          height: 40px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .eew-epicenter-pulse::before {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          background: #ef4444;
          border-radius: 50%;
          border: 3px solid #fff;
          z-index: 2;
          box-shadow: 0 0 10px rgba(239,68,68,0.8);
          animation: epicenter-pulse 1.5s ease-in-out infinite;
        }
        .eew-epicenter-pulse::after {
          content: '';
          position: absolute;
          width: 40px;
          height: 40px;
          border: 3px solid #ef4444;
          border-radius: 50%;
          animation: epicenter-ring-pulse 1.5s ease-out infinite;
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Left: Alert List */}
        <div className="flex flex-col gap-3 order-2 lg:order-1">
          <div className="flex items-center gap-2 px-1">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </div>
            <h3 className="text-base font-bold text-foreground tracking-wide uppercase">
              Active EEW Alerts
            </h3>
            {significantCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-auto text-xs animate-pulse"
                data-ocid="eew.alert.badge"
              >
                {significantCount} M5+
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[520px] lg:h-[560px]">
            <div className="space-y-2 pr-2">
              {alerts.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-40 text-muted-foreground"
                  data-ocid="eew.empty_state"
                >
                  <span className="text-3xl mb-2">📡</span>
                  <p className="text-sm">No events above M2.5</p>
                </div>
              ) : (
                alerts.map((eq, idx) => {
                  const eqMag = eq.properties.mag ?? 0;
                  const eqAlert = eq.properties.alert;
                  const eqMmi = eq.properties.mmi
                    ? eq.properties.mmi
                    : getMmiFromUsgsAlert(eqAlert);
                  const borderColor = getAlertColor(eqAlert, eqMag);
                  const isSelected = (selectedId ?? alerts[0]?.id) === eq.id;
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      className={`w-full text-left rounded-lg p-3 transition-all duration-200 cursor-pointer border-l-4 ${
                        isSelected
                          ? "bg-card border-primary ring-1 ring-primary/40 shadow-md"
                          : "bg-card/50 hover:bg-card/80 border-transparent hover:border-primary/40"
                      }`}
                      style={{
                        borderLeftColor: isSelected
                          ? borderColor
                          : `${borderColor}88`,
                      }}
                      onClick={() => setSelectedId(eq.id)}
                      data-ocid={`eew.item.${idx + 1}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: borderColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className="text-xs font-bold px-2"
                              style={{
                                backgroundColor: borderColor,
                                color: eqMag >= 5 ? "#fff" : "#111",
                              }}
                            >
                              M{eqMag.toFixed(1)}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground ml-auto">
                              {formatTimeAgo(eq.properties.time)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/80 mt-1 truncate leading-snug">
                            {eq.properties.place}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${getMmiColor(eqMmi)}33`,
                                color: getMmiColor(eqMmi),
                                border: `1px solid ${getMmiColor(eqMmi)}55`,
                              }}
                            >
                              MMI {Math.round(eqMmi)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {getMmiLabel(eqMmi)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Map + Info */}
        <div className="flex flex-col gap-4 order-1 lg:order-2">
          <div
            className="rounded-xl overflow-hidden border border-border/40 shadow-lg"
            style={{ height: "460px", backgroundColor: "#0a0a1a" }}
          >
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground px-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div
                className="w-8"
                style={{ borderTop: "2px dashed #60a5fa" }}
              />
              <span>P-wave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-8"
                style={{ borderTop: "2px dashed #f97316" }}
              />
              <span>S-wave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span>Epicenter</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span
                className="inline-block w-3 h-3 rounded-sm border border-white/30"
                style={{ background: "rgba(0,0,0,0.75)" }}
              />
              <span>City labels load after selection</span>
            </div>
          </div>

          {selectedEq && (
            <Card
              className="border-border/40 bg-card/80 backdrop-blur-sm"
              data-ocid="eew.info.card"
            >
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Magnitude
                    </p>
                    <p
                      className="text-2xl font-bold mt-0.5"
                      style={{ color: getAlertColor(alert, mag) }}
                    >
                      M{mag.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Depth
                    </p>
                    <p className="text-2xl font-bold mt-0.5">
                      {depth.toFixed(1)} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Max MMI
                    </p>
                    <p
                      className="text-2xl font-bold mt-0.5"
                      style={{ color: getMmiColor(mmiDisplay) }}
                    >
                      {getMmiLabel(mmiDisplay).split(" - ")[0]}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Location
                    </p>
                    <p className="text-sm font-medium mt-0.5 leading-snug">
                      {selectedEq.properties.place}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Event Time
                    </p>
                    <p className="text-xs font-mono mt-0.5">
                      {formatDateTime(selectedEq.properties.time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Elapsed
                    </p>
                    <p className="text-xs font-mono mt-0.5">
                      {Math.floor(elapsed / 3600) > 0 &&
                        `${Math.floor(elapsed / 3600)}h `}
                      {Math.floor((elapsed % 3600) / 60)}m {elapsed % 60}s
                    </p>
                  </div>
                  {alert && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        PAGER Alert
                      </p>
                      <Badge
                        className="mt-1 uppercase font-bold text-xs"
                        style={{
                          backgroundColor: getAlertColor(alert, mag),
                          color: "#fff",
                        }}
                      >
                        {alert}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* MMI Legend + Impact Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/40" data-ocid="eew.mmi.legend.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide">
              MMI Scale Legend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { mmi: 1, label: "I" },
                { mmi: 2.5, label: "II-III" },
                { mmi: 4, label: "IV" },
                { mmi: 5, label: "V" },
                { mmi: 6, label: "VI" },
                { mmi: 7, label: "VII" },
                { mmi: 8, label: "VIII" },
                { mmi: 9, label: "IX" },
                { mmi: 10, label: "X+" },
              ].map(({ mmi, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded border border-white/20 flex-shrink-0"
                    style={{ backgroundColor: getMmiColor(mmi) }}
                  />
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: getMmiColor(mmi) }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40" data-ocid="eew.impact.zones.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide">
              Estimated Impact Zones
              {selectedEq && (
                <span className="ml-2 text-xs text-muted-foreground font-normal normal-case">
                  for M{(selectedEq.properties.mag ?? 0).toFixed(1)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">
                      MMI
                    </th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">
                      Shaking
                    </th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-medium">
                      Est. Radius
                    </th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">
                      Nearest Area
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MMI_LEVELS.map((mmiLevel, i) => {
                    const radiusKm = selectedEq
                      ? getMmiRadiusKm(
                          selectedEq.properties.mag ?? 0,
                          mmiLevel,
                          selectedEq.geometry.coordinates[2] ?? 10,
                        )
                      : null;
                    const cityName =
                      selectedEq && cityLabels[selectedEq.id]
                        ? cityLabels[selectedEq.id][mmiLevel]
                        : undefined;
                    return (
                      <tr
                        key={mmiLevel}
                        className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                        data-ocid={`eew.impact.row.${i + 1}`}
                      >
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: getMmiColor(mmiLevel) }}
                            />
                            <span
                              className="font-bold"
                              style={{ color: getMmiColor(mmiLevel) }}
                            >
                              {mmiLevel}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-1.5 text-muted-foreground">
                          {MMI_DESCRIPTIONS[mmiLevel]}
                        </td>
                        <td className="px-4 py-1.5 text-right font-mono">
                          {radiusKm !== null && radiusKm < 20000
                            ? `~${Math.round(radiusKm)} km`
                            : "—"}
                        </td>
                        <td className="px-4 py-1.5 text-muted-foreground max-w-[120px] truncate">
                          {cityName ? (
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: getMmiColor(mmiLevel) }}
                            >
                              {cityName}
                            </span>
                          ) : radiusKm !== null &&
                            radiusKm < 20000 &&
                            selectedEq ? (
                            <span className="text-[10px] italic text-muted-foreground/50">
                              loading…
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
