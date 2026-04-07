import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, ExternalLink } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useVirtualWindow } from "../../hooks/useVirtualWindow";
import { formatMagnitude, formatTimestamp } from "../../lib/formatters";
import { getMagnitudeColor, getMagnitudeLabel } from "../../lib/usgsFeeds";
import type { UsgsFeature } from "../../lib/usgsTypes";
import { PanelCard } from "./PanelCard";

interface EarthquakeResultsTableProps {
  earthquakes: UsgsFeature[];
  selectedEarthquake?: UsgsFeature | null;
  onEarthquakeSelect?: (earthquake: UsgsFeature) => void;
  constrainedHeight?: number;
}

export function EarthquakeResultsTable({
  earthquakes,
  selectedEarthquake,
  onEarthquakeSelect,
  constrainedHeight,
}: EarthquakeResultsTableProps) {
  const { t } = useLanguage();

  const handleRowClick = (earthquake: UsgsFeature) => {
    if (onEarthquakeSelect) {
      onEarthquakeSelect(earthquake);
    }
  };

  const { virtualWindow, onScroll, containerRef } = useVirtualWindow({
    itemCount: earthquakes.length,
    estimatedItemHeight: 52,
    overscan: 10,
  });

  if (earthquakes.length === 0) {
    return (
      <PanelCard title={t.earthquakeEvents} subtitle={t.noResults}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center font-medium">
            {t.noResults}
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {t.noResultsHint}
          </p>
        </div>
      </PanelCard>
    );
  }

  const visibleEarthquakes = earthquakes.slice(
    virtualWindow.startIndex,
    virtualWindow.endIndex + 1,
  );

  const renderRow = (earthquake: UsgsFeature) => {
    const isSelected = selectedEarthquake?.id === earthquake.id;
    const magColor = getMagnitudeColor(earthquake.properties.mag);
    const magLabel = getMagnitudeLabel(earthquake.properties.mag);
    const hasTsunami = earthquake.properties.tsunami === 1;

    return (
      <tr
        key={earthquake.id}
        tabIndex={0}
        aria-selected={isSelected}
        className={`cursor-pointer transition-all duration-200 border-b border-border/20 h-[52px] ${
          isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
        }`}
        onClick={() => handleRowClick(earthquake)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleRowClick(earthquake);
        }}
      >
        <td className="py-2 px-3 align-middle">
          <div className="flex flex-col gap-0.5">
            <Badge
              variant="outline"
              className={`${magColor} font-mono w-fit text-xs px-2 py-0.5 font-semibold shadow-sm`}
            >
              M{formatMagnitude(earthquake.properties.mag)}
            </Badge>
            <span className="text-[10px] text-muted-foreground hidden sm:inline font-medium leading-none">
              {magLabel}
            </span>
          </div>
        </td>
        <td className="py-2 px-3 align-middle min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">
            {earthquake.properties.place}
          </div>
          <div className="text-xs text-muted-foreground sm:hidden mt-0.5 font-medium truncate">
            {formatTimestamp(earthquake.properties.time)}
          </div>
        </td>
        <td className="hidden sm:table-cell py-2 px-3 align-middle text-xs font-medium text-muted-foreground whitespace-nowrap">
          {formatTimestamp(earthquake.properties.time)}
        </td>
        <td className="hidden md:table-cell py-2 px-3 align-middle text-xs font-medium whitespace-nowrap">
          {earthquake.geometry.coordinates[2]?.toFixed(1) ?? "N/A"} km
        </td>
        <td className="hidden lg:table-cell py-2 px-3 align-middle">
          {hasTsunami && (
            <Badge
              variant="destructive"
              className="text-[10px] px-1.5 py-0.5 font-semibold"
            >
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              {t.tsunami}
            </Badge>
          )}
        </td>
        <td className="hidden lg:table-cell py-2 px-3 align-middle text-right">
          <Button
            variant="ghost"
            size="sm"
            asChild
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 p-0 hover:bg-primary/10 transition-colors"
          >
            <a
              href={earthquake.properties.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="sr-only">View on USGS</span>
            </a>
          </Button>
        </td>
      </tr>
    );
  };

  const colGroup = (
    <colgroup>
      <col style={{ width: "100px" }} />
      <col />
      <col className="hidden sm:table-column" style={{ width: "120px" }} />
      <col className="hidden md:table-column" style={{ width: "80px" }} />
      <col className="hidden lg:table-column" style={{ width: "90px" }} />
      <col className="hidden lg:table-column" style={{ width: "50px" }} />
    </colgroup>
  );

  const headerRow = (
    <tr>
      <th className="py-2 px-3 text-left text-xs font-bold text-foreground uppercase tracking-wide">
        {t.mag}
      </th>
      <th className="py-2 px-3 text-left text-xs font-bold text-foreground uppercase tracking-wide">
        {t.location}
      </th>
      <th className="hidden sm:table-cell py-2 px-3 text-left text-xs font-bold text-foreground uppercase tracking-wide">
        {t.time}
      </th>
      <th className="hidden md:table-cell py-2 px-3 text-left text-xs font-bold text-foreground uppercase tracking-wide">
        {t.depth}
      </th>
      <th className="hidden lg:table-cell py-2 px-3 text-left text-xs font-bold text-foreground uppercase tracking-wide">
        {t.tsunami}
      </th>
      <th className="hidden lg:table-cell py-2 px-3 text-right text-xs font-bold text-foreground uppercase tracking-wide">
        &nbsp;
      </th>
    </tr>
  );

  const eventCountLabel = `${earthquakes.length} ${
    earthquakes.length === 1 ? t.event : t.events
  }`;

  // In split view: fixed height card with flex layout
  if (constrainedHeight) {
    return (
      <div
        className="flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card shadow-soft"
        style={{ height: `${constrainedHeight}px` }}
      >
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/95 backdrop-blur-sm flex-shrink-0">
          <span className="text-sm font-bold text-foreground">
            {t.earthquakeEvents}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {eventCountLabel}
          </span>
        </div>

        {/* Sticky table header */}
        <div className="flex-shrink-0 border-b border-border/40 bg-card/95 backdrop-blur-sm">
          <table className="w-full table-fixed">
            {colGroup}
            <thead>{headerRow}</thead>
          </table>
        </div>

        {/* Scrollable body */}
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          <table className="w-full table-fixed">
            {colGroup}
            <tbody>
              {virtualWindow.offsetTop > 0 && (
                <tr>
                  <td colSpan={6} style={{ height: virtualWindow.offsetTop }} />
                </tr>
              )}
              {visibleEarthquakes.map(renderRow)}
              {virtualWindow.offsetBottom > 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ height: virtualWindow.offsetBottom }}
                  />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Normal (non-constrained) table view
  return (
    <PanelCard title={t.earthquakeEvents} subtitle={eventCountLabel} noPadding>
      {/* Sticky table header */}
      <div className="sticky top-0 z-10 border-t border-b border-border/40 bg-card/95 backdrop-blur-sm">
        <table className="w-full table-fixed">
          {colGroup}
          <thead>{headerRow}</thead>
        </table>
      </div>

      {/* Scrollable rows */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="overflow-y-auto overflow-x-hidden"
        style={{ maxHeight: "600px" }}
      >
        <table className="w-full table-fixed">
          {colGroup}
          <tbody>
            {virtualWindow.offsetTop > 0 && (
              <tr>
                <td colSpan={6} style={{ height: virtualWindow.offsetTop }} />
              </tr>
            )}
            {visibleEarthquakes.map(renderRow)}
            {virtualWindow.offsetBottom > 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ height: virtualWindow.offsetBottom }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );
}
