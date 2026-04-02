import { Badge } from "@/components/ui/badge";
import { Activity, Clock, ExternalLink, ImageOff, MapPin } from "lucide-react";
import { useState } from "react";
import { formatMagnitude, formatTimestamp } from "../../lib/formatters";
import { getMagnitudeColor } from "../../lib/usgsFeeds";
import type { UsgsFeature } from "../../lib/usgsTypes";
import { PanelCard } from "./PanelCard";

interface ShakeMapViewProps {
  earthquakes: UsgsFeature[];
}

type Status = "idle" | "loading" | "found" | "iframe" | "no-usgs" | "error";

export function ShakeMapView({ earthquakes }: ShakeMapViewProps) {
  const [selected, setSelected] = useState<UsgsFeature | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Earthquakes M3.5+ for shakemap candidates
  const candidates = earthquakes.filter(
    (eq) => (eq.properties.mag ?? 0) >= 3.5,
  );

  const handleSelect = async (eq: UsgsFeature) => {
    setSelected(eq);
    setStatus("loading");
    setImageUrl(null);

    // BMKG/EMSC events won't have a USGS detail URL
    const source = (eq.properties as any).source;
    if (source === "BMKG" || source === "EMSC") {
      setStatus("no-usgs");
      return;
    }

    const detailUrl = eq.properties.detail;
    if (!detailUrl) {
      // Fall back to USGS event page iframe using the event id
      setStatus("iframe");
      return;
    }

    try {
      const res = await fetch(detailUrl);
      const detail = await res.json();
      const shakemap = detail?.properties?.products?.shakemap?.[0];
      if (shakemap) {
        const url = shakemap.contents?.["intensity.jpg"]?.url;
        if (url) {
          setImageUrl(url);
          setStatus("found");
          return;
        }
      }
      // No intensity.jpg — fall back to USGS iframe
      setStatus("iframe");
    } catch (err) {
      console.error("ShakeMap fetch error:", err);
      // Still try iframe fallback on network error
      setStatus("iframe");
    }
  };

  // Extract the USGS event id (e.g. "us6000abcd") from eq.id
  const getUsgsEventId = (eq: UsgsFeature): string => {
    // eq.id may be like "us6000abcd" or "usc000lvb5"
    return String(eq.id).replace(/^https?:\/\/.*\//, "");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      {/* Sidebar – earthquake list */}
      <PanelCard
        title="ShakeMap Viewer"
        subtitle={`${candidates.length} M3.5+ events`}
      >
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Activity className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No M3.5+ events in current time window.
            </p>
          </div>
        ) : (
          <ul
            className="divide-y divide-border/30 max-h-[580px] overflow-y-auto"
            data-ocid="shakemap.list"
          >
            {candidates.map((eq, idx) => {
              const isActive = selected?.id === eq.id;
              const magColor = getMagnitudeColor(eq.properties.mag);
              const source = (eq.properties as any).source as
                | string
                | undefined;
              return (
                <li key={eq.id} data-ocid={`shakemap.item.${idx + 1}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(eq)}
                    className={`w-full text-left px-4 py-3 transition-colors duration-150 hover:bg-accent/40 ${
                      isActive ? "bg-accent/60 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`${magColor} font-mono text-xs font-bold`}
                        >
                          M{formatMagnitude(eq.properties.mag)}
                        </Badge>
                        {source && source !== "USGS" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 font-semibold"
                            style={{
                              color: source === "BMKG" ? "#22c55e" : "#f97316",
                              borderColor:
                                source === "BMKG" ? "#22c55e55" : "#f9731655",
                            }}
                          >
                            {source}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(eq.properties.time)}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-xs leading-snug line-clamp-2">
                        {eq.properties.place}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>

      {/* Main panel – shakemap image or iframe */}
      <PanelCard
        title={selected ? selected.properties.place : "ShakeMap"}
        subtitle={
          selected
            ? `M${formatMagnitude(selected.properties.mag)} \u00b7 ${formatTimestamp(selected.properties.time)}`
            : "Select an earthquake from the list"
        }
      >
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {status === "idle" && (
            <div
              className="flex flex-col items-center gap-4 text-center px-8"
              data-ocid="shakemap.empty_state"
            >
              <div className="p-4 rounded-full bg-primary/10">
                <Activity className="h-10 w-10 text-primary/60" />
              </div>
              <div>
                <p className="font-semibold text-base">
                  No earthquake selected
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select an earthquake to view its ShakeMap
                </p>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div
              className="flex flex-col items-center gap-3"
              data-ocid="shakemap.loading_state"
            >
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">
                Fetching ShakeMap data…
              </p>
            </div>
          )}

          {status === "no-usgs" && (
            <div
              className="flex flex-col items-center gap-4 text-center px-8"
              data-ocid="shakemap.error_state"
            >
              <div className="p-4 rounded-full bg-muted/50">
                <ImageOff className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-semibold text-base">ShakeMap Unavailable</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ShakeMap is only available for USGS events.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div
              className="flex flex-col items-center gap-4 text-center px-8"
              data-ocid="shakemap.error_state"
            >
              <p className="text-sm text-destructive">
                Failed to load ShakeMap data. Please try again.
              </p>
            </div>
          )}

          {status === "found" && imageUrl && (
            <div className="w-full space-y-3" data-ocid="shakemap.panel">
              <div className="rounded-lg overflow-hidden border border-border/40 shadow-soft">
                <img
                  src={imageUrl}
                  alt={`ShakeMap for ${selected?.properties.place}`}
                  className="w-full h-auto object-contain max-h-[500px]"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center px-4 pb-2">
                ShakeMap data provided by USGS. Intensity scale: I (not felt) to
                X+ (extreme).
              </p>
            </div>
          )}

          {status === "iframe" && selected && (
            <div className="w-full space-y-3" data-ocid="shakemap.panel">
              <div
                className="rounded-lg overflow-hidden border border-border/40 shadow-soft"
                style={{ height: "520px" }}
              >
                <iframe
                  src={`https://earthquake.usgs.gov/earthquakes/eventpage/${getUsgsEventId(selected)}/shakemap`}
                  title={`ShakeMap for ${selected.properties.place}`}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
              <div className="flex items-center justify-between px-4 pb-2">
                <p className="text-xs text-muted-foreground">
                  ShakeMap powered by USGS
                </p>
                <a
                  href={`https://earthquake.usgs.gov/earthquakes/eventpage/${getUsgsEventId(selected)}/shakemap`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  Open in USGS <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </PanelCard>
    </div>
  );
}
