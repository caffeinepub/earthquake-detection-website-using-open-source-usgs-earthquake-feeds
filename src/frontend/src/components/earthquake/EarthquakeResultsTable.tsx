import { ExternalLink, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsgsFeature } from '../../lib/usgsTypes';
import { formatMagnitude, formatTimestamp } from '../../lib/formatters';
import { getMagnitudeColor, getMagnitudeLabel } from '../../lib/usgsFeeds';
import { useVirtualWindow } from '../../hooks/useVirtualWindow';

interface EarthquakeResultsTableProps {
  earthquakes: UsgsFeature[];
  selectedEarthquake?: UsgsFeature | null;
  onEarthquakeSelect?: (earthquake: UsgsFeature) => void;
  constrainedHeight?: number;
}

/**
 * Check if an earthquake has moment tensor data available.
 * Parses the comma-separated types string and looks for "moment-tensor" (case-insensitive).
 */
function hasMomentTensor(types: string): boolean {
  if (!types) return false;
  const typesList = types.split(',').map(t => t.trim().toLowerCase());
  return typesList.includes('moment-tensor');
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

  // Virtualization for large datasets
  const { virtualWindow, onScroll, containerRef } = useVirtualWindow({
    itemCount: earthquakes.length,
    estimatedItemHeight: 57, // Approximate row height in pixels
    overscan: 10,
  });

  if (earthquakes.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">
            No earthquakes found matching your filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get visible slice of earthquakes
  const visibleEarthquakes = earthquakes.slice(
    virtualWindow.startIndex,
    virtualWindow.endIndex + 1
  );

  // Calculate scroll container height based on whether we're in constrained mode
  const scrollHeight = constrainedHeight ? constrainedHeight - 120 : 600;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Earthquake Events ({earthquakes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border/50">
          <div
            ref={containerRef}
            onScroll={onScroll}
            className="overflow-auto"
            style={{ maxHeight: `${scrollHeight}px` }}
          >
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Magnitude</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Depth</TableHead>
                  <TableHead>Tsunami</TableHead>
                  <TableHead>Moment Tensor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Top spacer for virtualization */}
                {virtualWindow.offsetTop > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} style={{ height: virtualWindow.offsetTop }} />
                  </TableRow>
                )}

                {/* Visible rows */}
                {visibleEarthquakes.map((earthquake) => {
                  const isSelected = selectedEarthquake?.id === earthquake.id;
                  const magColor = getMagnitudeColor(earthquake.properties.mag);
                  const magLabel = getMagnitudeLabel(earthquake.properties.mag);
                  const hasTsunami = earthquake.properties.tsunami === 1;
                  const hasMT = hasMomentTensor(earthquake.properties.types || '');

                  return (
                    <TableRow
                      key={earthquake.id}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-accent' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleRowClick(earthquake)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`${magColor} font-mono`}
                          >
                            M{formatMagnitude(earthquake.properties.mag)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {magLabel}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {earthquake.properties.place}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTimestamp(earthquake.properties.time)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {earthquake.geometry.coordinates[2]?.toFixed(1) ?? 'N/A'} km
                      </TableCell>
                      <TableCell>
                        {hasTsunami && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Alert
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasMT && (
                          <Badge variant="secondary" className="text-xs">
                            Available
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={earthquake.properties.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Bottom spacer for virtualization */}
                {virtualWindow.offsetBottom > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} style={{ height: virtualWindow.offsetBottom }} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
