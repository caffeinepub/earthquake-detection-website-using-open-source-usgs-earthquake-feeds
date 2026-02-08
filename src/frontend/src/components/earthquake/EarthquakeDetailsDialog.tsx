import { ExternalLink, MapPin, Clock, Layers, Activity } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UsgsFeature } from '../../lib/usgsTypes';
import {
  formatMagnitude,
  formatFullTimestamp,
  formatDepth,
  formatCoordinates,
} from '../../lib/formatters';
import { getMagnitudeColor, getMagnitudeLabel } from '../../lib/usgsFeeds';

interface EarthquakeDetailsDialogProps {
  earthquake: UsgsFeature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EarthquakeDetailsDialog({
  earthquake,
  open,
  onOpenChange,
}: EarthquakeDetailsDialogProps) {
  if (!earthquake) return null;

  const { properties, geometry } = earthquake;
  const [lon, lat, depth] = geometry.coordinates;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[9999]" />
        <DialogContent className="max-w-2xl z-[10000]">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl">{properties.title}</DialogTitle>
                <DialogDescription className="mt-2">
                  {properties.place}
                </DialogDescription>
              </div>
              <Badge
                variant={getMagnitudeColor(properties.mag) as any}
                className="text-lg px-3 py-1"
              >
                M{formatMagnitude(properties.mag)}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Magnitude Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Magnitude Type</span>
                </div>
                <p className="text-sm font-medium">
                  {properties.magType || 'Unknown'}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Classification</span>
                </div>
                <p className="text-sm font-medium">
                  {getMagnitudeLabel(properties.mag)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Location Details */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Coordinates</span>
                </div>
                <p className="text-sm font-medium font-mono">
                  {formatCoordinates(lon, lat)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span>Depth</span>
                </div>
                <p className="text-sm font-medium">{formatDepth(depth)}</p>
              </div>
            </div>

            <Separator />

            {/* Time Details */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Event Time</span>
                </div>
                <p className="text-sm font-medium">
                  {formatFullTimestamp(properties.time)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last Updated</span>
                </div>
                <p className="text-sm font-medium">
                  {formatFullTimestamp(properties.updated)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline">{properties.status}</Badge>
              </div>
              {properties.tsunami === 1 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Alert</p>
                  <Badge variant="destructive">Tsunami Warning</Badge>
                </div>
              )}
            </div>

            {/* External Link */}
            <Button
              className="w-full"
              onClick={() => window.open(properties.url, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on USGS Website
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
