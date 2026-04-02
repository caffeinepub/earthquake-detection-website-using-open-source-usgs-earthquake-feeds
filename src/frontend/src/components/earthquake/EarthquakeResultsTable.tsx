import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, AlertTriangle, ExternalLink } from "lucide-react";
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
  const handleRowClick = (earthquake: UsgsFeature) => {
    if (onEarthquakeSelect) {
      onEarthquakeSelect(earthquake);
    }
  };

  const { virtualWindow, onScroll, containerRef } = useVirtualWindow({
    itemCount: earthquakes.length,
    estimatedItemHeight: 57,
    overscan: 10,
  });

  if (earthquakes.length === 0) {
    return (
      <PanelCard title="Earthquake Events" subtitle="No results">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Activity className="h-8 w-8 text-muted-foreground" />
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

  const visibleEarthquakes = earthquakes.slice(
    virtualWindow.startIndex,
    virtualWindow.endIndex + 1,
  );

  const scrollHeight = constrainedHeight
    ? Math.min(constrainedHeight - 100, 520)
    : 600;

  return (
    <PanelCard
      title="Earthquake Events"
      subtitle={`${earthquakes.length} ${earthquakes.length === 1 ? "event" : "events"}`}
      noPadding
    >
      <div className="border-t border-border/30">
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: `${scrollHeight}px` }}
        >
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-border/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[110px] font-bold text-foreground">
                  Magnitude
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  Location
                </TableHead>
                <TableHead className="hidden sm:table-cell w-[90px] font-bold text-foreground">
                  Time
                </TableHead>
                <TableHead className="hidden md:table-cell w-[80px] font-bold text-foreground">
                  Depth
                </TableHead>
                <TableHead className="hidden lg:table-cell w-[80px] font-bold text-foreground">
                  Tsunami
                </TableHead>
                <TableHead className="hidden lg:table-cell w-[60px] text-right font-bold text-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {virtualWindow.offsetTop > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    style={{ height: virtualWindow.offsetTop }}
                  />
                </TableRow>
              )}

              {visibleEarthquakes.map((earthquake) => {
                const isSelected = selectedEarthquake?.id === earthquake.id;
                const magColor = getMagnitudeColor(earthquake.properties.mag);
                const magLabel = getMagnitudeLabel(earthquake.properties.mag);
                const hasTsunami = earthquake.properties.tsunami === 1;

                return (
                  <TableRow
                    key={earthquake.id}
                    className={`cursor-pointer transition-all duration-200 border-b border-border/20 ${
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/15 shadow-soft"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleRowClick(earthquake)}
                  >
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={`${magColor} font-mono w-fit text-xs px-2 py-0.5 font-semibold shadow-sm`}
                        >
                          M{formatMagnitude(earthquake.properties.mag)}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
                          {magLabel}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="truncate text-sm font-semibold">
                        {earthquake.properties.place}
                      </div>
                      <div className="text-xs text-muted-foreground sm:hidden mt-0.5 font-medium">
                        {formatTimestamp(earthquake.properties.time)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm py-3 font-medium">
                      {formatTimestamp(earthquake.properties.time)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm py-3 font-medium">
                      {earthquake.geometry.coordinates[2]?.toFixed(1) ?? "N/A"}{" "}
                      km
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-3">
                      {hasTsunami && (
                        <Badge
                          variant="destructive"
                          className="text-xs px-2 py-0.5 font-semibold shadow-sm"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Tsunami
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
                      >
                        <a
                          href={earthquake.properties.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">View on USGS</span>
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {virtualWindow.offsetBottom > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    style={{ height: virtualWindow.offsetBottom }}
                  />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PanelCard>
  );
}
