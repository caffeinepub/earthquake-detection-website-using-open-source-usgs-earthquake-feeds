import { ExternalLink } from 'lucide-react';
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

interface EarthquakeResultsTableProps {
  earthquakes: UsgsFeature[];
  selectedEarthquake?: UsgsFeature | null;
  onEarthquakeSelect?: (earthquake: UsgsFeature) => void;
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

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Earthquake Events ({earthquakes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Magnitude</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Depth</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earthquakes.map((earthquake) => (
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
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
