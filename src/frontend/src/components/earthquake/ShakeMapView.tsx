import { Badge } from "@/components/ui/badge";
import { Activity, Clock, ImageOff, MapPin } from "lucide-react";
import { useState } from "react";
import { formatMagnitude, formatTimestamp } from "../../lib/formatters";
import { getMagnitudeColor } from "../../lib/usgsFeeds";
import type { UsgsFeature } from "../../lib/usgsTypes";
import { PanelCard } from "./PanelCard";

interface ShakeMapViewProps {
  earthquakes: UsgsFeature[];
}

type Status = "idle" | "loading" | "found" | "not-found" | "error";

export function ShakeMapView({ earthquakes }: ShakeMapViewProps) {
  const [selected, setSelected] = useState<UsgsFeature | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Earthquakes M4.0+ for shakemap candidates
  const candidates = earthquakes.filter(
    (eq) => (eq.properties.mag ?? 0) >= 4.0,
  );

  const handleSelect = async (eq: UsgsFeature) => {
    setSelected(eq);
    setStatus("loading");
    setImageUrl(null);

    const detailUrl = eq.properties.detail;
    if (!detailUrl) {
      setStatus("not-found");
      return;
    }

    try {
      const res = await fetch(detailUrl);
      const detail = await res.json();
      const shakemap = detail?.properties?.products?.shakemap?.[0];
      if (!shakemap) {
        setStatus("not-found");
        return;
      }
      const url = shakemap.contents?.["intensity.jpg"]?.url;
      if (!url) {
        setStatus("not-found");
        return;
      }
      setImageUrl(url);
      setStatus("found");
    } catch (err) {
      console.error("ShakeMap fetch error:", err);
      setStatus("error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      {/* Sidebar – earthquake list */}
      <PanelCard
        title="ShakeMap Viewer"
        subtitle={`${candidates.length} M4.0+ events`}
      >
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Activity className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No M4.0+ events in current time window.
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
                      <Badge
                        variant="outline"
                        className={`${magColor} font-mono text-xs font-bold`}
                      >
                        M{formatMagnitude(eq.properties.mag)}
                      </Badge>
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

      {/* Main panel – shakemap image */}
      <PanelCard
        title={selected ? selected.properties.place : "ShakeMap"}
        subtitle={
          selected
            ? `M${formatMagnitude(selected.properties.mag)} · ${formatTimestamp(selected.properties.time)}`
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

          {status === "not-found" && (
            <div
              className="flex flex-col items-center gap-4 text-center px-8"
              data-ocid="shakemap.error_state"
            >
              <div className="p-4 rounded-full bg-muted/50">
                <ImageOff className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-semibold text-base">No ShakeMap available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No ShakeMap available for this event
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
        </div>
      </PanelCard>
    </div>
  );
}
