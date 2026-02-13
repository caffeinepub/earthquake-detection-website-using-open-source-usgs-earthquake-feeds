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
    <div className="grid gap-6 md:grid-cols-3">
      {/* Total Events */}
      <Card className="border-border/40 shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Total Events</CardTitle>
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-4xl font-bold tracking-tight mb-1">{stats.total}</div>
          <p className="text-sm text-muted-foreground font-medium">
            Detected earthquakes
          </p>
        </CardContent>
      </Card>

      {/* Above Threshold */}
      <Card className="border-border/40 shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Above {threshold.toFixed(1)} Magnitude
          </CardTitle>
          <div className="p-2 rounded-lg bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-4xl font-bold tracking-tight mb-1">{stats.aboveThreshold}</div>
          <p className="text-sm text-muted-foreground font-medium">
            Significant events
          </p>
        </CardContent>
      </Card>

      {/* Largest Magnitude */}
      <Card className="border-border/40 shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Largest Event</CardTitle>
          <div className="p-2 rounded-lg bg-destructive/10">
            <TrendingUp className="h-5 w-5 text-destructive" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          {stats.largestMagnitude ? (
            <>
              <div className="flex items-center gap-3 mb-1">
                <div className="text-4xl font-bold tracking-tight">
                  {formatMagnitude(stats.largestMagnitude.properties.mag)}
                </div>
                <Badge
                  variant={
                    getMagnitudeColor(stats.largestMagnitude.properties.mag) as any
                  }
                  className="magnitude-pulse font-mono font-semibold"
                >
                  M{formatMagnitude(stats.largestMagnitude.properties.mag)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate font-medium">
                {stats.largestMagnitude.properties.place}
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl font-bold tracking-tight mb-1">N/A</div>
              <p className="text-sm text-muted-foreground font-medium">No events</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
