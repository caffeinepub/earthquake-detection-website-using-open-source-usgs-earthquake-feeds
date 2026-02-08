import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EarthquakeStats } from '../../lib/earthquakeStats';
import { formatMagnitude } from '../../lib/formatters';
import { getMagnitudeColor } from '../../lib/usgsFeeds';

interface DashboardSummaryProps {
  stats: EarthquakeStats;
  threshold: number;
}

export function DashboardSummary({ stats, threshold }: DashboardSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Events */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            Detected earthquakes
          </p>
        </CardContent>
      </Card>

      {/* Above Threshold */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Above {threshold.toFixed(1)} Magnitude
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.aboveThreshold}</div>
          <p className="text-xs text-muted-foreground">
            Significant events
          </p>
        </CardContent>
      </Card>

      {/* Largest Magnitude */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Largest Event</CardTitle>
          <TrendingUp className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          {stats.largestMagnitude ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {formatMagnitude(stats.largestMagnitude.properties.mag)}
                </div>
                <Badge
                  variant={
                    getMagnitudeColor(stats.largestMagnitude.properties.mag) as any
                  }
                  className="magnitude-pulse"
                >
                  M{formatMagnitude(stats.largestMagnitude.properties.mag)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {stats.largestMagnitude.properties.place}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">N/A</div>
              <p className="text-xs text-muted-foreground">No events</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
