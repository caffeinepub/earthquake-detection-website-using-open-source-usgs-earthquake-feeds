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
            style={{ maxHeight: '600px' }}
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
                  <TableRow style={{ height: `${virtualWindow.offsetTop}px` }}>
                    <TableCell colSpan={7} />
                  </TableRow>
                )}
                
                {/* Visible rows */}
                {visibleEarthquakes.map((earthquake) => (
                  <TableRow
                    key={earthquake.id}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedEarthquake?.id === earthquake.id ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => handleRowClick(earthquake)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            getMagnitudeColor(earthquake.properties.mag) as any
                          }
                        >
                          M{formatMagnitude(earthquake.properties.mag)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getMagnitudeLabel(earthquake.properties.mag)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {earthquake.properties.place}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimestamp(earthquake.properties.time)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {earthquake.geometry.coordinates[2]?.toFixed(1) ?? 'N/A'} km
                    </TableCell>
                    <TableCell>
                      {earthquake.properties.tsunami === 1 ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          Warning
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasMomentTensor(earthquake.properties.types) ? (
                        <Badge variant="secondary" className="w-fit">
                          Available
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(earthquake.properties.url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Bottom spacer for virtualization */}
                {virtualWindow.offsetBottom > 0 && (
                  <TableRow style={{ height: `${virtualWindow.offsetBottom}px` }}>
                    <TableCell colSpan={7} />
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
