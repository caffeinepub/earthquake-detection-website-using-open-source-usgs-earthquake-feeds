import { ExternalLink, MapPin, Clock, Layers, Activity, Info } from 'lucide-react';
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
import { formatMMI } from '../../lib/mmi';
import { useUsgsEventDetail } from '../../hooks/useUsgsEventDetail';
import { UsgsEventDetailProduct } from '../../lib/usgsEventDetailTypes';

interface EarthquakeDetailsDialogProps {
  earthquake: UsgsFeature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Extract moment tensor information from event detail products.
 */
function getMomentTensorInfo(products?: UsgsEventDetailProduct[]) {
  if (!products || products.length === 0) return null;

  // Get the preferred product (highest weight) or first available
  const preferredProduct = products.reduce((prev, current) => {
    const prevWeight = prev.preferredWeight ?? 0;
    const currentWeight = current.preferredWeight ?? 0;
    return currentWeight > prevWeight ? current : prev;
  }, products[0]);

  const props = preferredProduct.properties;

  return {
    source: props.source || props['beachball-source'] || preferredProduct.source,
    magnitude: props['derived-magnitude'] || null,
    magnitudeType: props['derived-magnitude-type'] || null,
    scalarMoment: props['scalar-moment'] || null,
    depth: props['derived-depth'] || null,
    percentDoubleCoup: props['percent-double-couple'] || null,
  };
}

export function EarthquakeDetailsDialog({
  earthquake,
  open,
  onOpenChange,
}: EarthquakeDetailsDialogProps) {
  // Fetch event detail when dialog is open
  const { data: eventDetail, isLoading: isLoadingDetail, isError: isDetailError } = useUsgsEventDetail({
    detailUrl: earthquake?.properties.detail || null,
    enabled: open && !!earthquake,
  });

  if (!earthquake) return null;

  const { properties, geometry } = earthquake;
  const [lon, lat, depth] = geometry.coordinates;

  // Extract moment tensor data if available
  const momentTensorProducts = eventDetail?.properties.products?.['moment-tensor'];
  const momentTensorInfo = momentTensorProducts ? getMomentTensorInfo(momentTensorProducts) : null;
  const showMomentTensor = !isLoadingDetail && !isDetailError && momentTensorInfo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[9999] backdrop-blur-sm" />
        <DialogContent className="max-w-2xl z-[10000] max-h-[90vh] overflow-y-auto shadow-strong border-border/40">
          <DialogHeader className="space-y-3 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`${getMagnitudeColor(properties.mag)} font-mono text-base px-3 py-1.5 font-bold shadow-soft`}
                  >
                    M{formatMagnitude(properties.mag)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {getMagnitudeLabel(properties.mag)}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {properties.place}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Detailed information about this seismic event
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Location & Time Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Info className="h-4 w-4" />
                Event Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Location</span>
                  </div>
                  <p className="text-sm font-medium">{formatCoordinates(lat, lon)}</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Time</span>
                  </div>
                  <p className="text-sm font-medium">{formatFullTimestamp(properties.time)}</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Layers className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Depth</span>
                  </div>
                  <p className="text-sm font-medium">{formatDepth(depth)}</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Type</span>
                  </div>
                  <p className="text-sm font-medium">{properties.type || 'Earthquake'}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-border/40" />

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Additional Details
              </h3>
              <div className="grid gap-3">
                {properties.mmi && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <span className="text-sm font-semibold">Modified Mercalli Intensity</span>
                    <Badge variant="secondary" className="font-mono font-semibold">
                      {formatMMI(properties.mmi)}
                    </Badge>
                  </div>
                )}
                {properties.tsunami === 1 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <span className="text-sm font-semibold">Tsunami Alert</span>
                    <Badge variant="destructive" className="font-semibold">
                      Active
                    </Badge>
                  </div>
                )}
                {properties.felt !== null && properties.felt !== undefined && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <span className="text-sm font-semibold">Felt Reports</span>
                    <Badge variant="secondary" className="font-semibold">
                      {properties.felt.toLocaleString()}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Moment Tensor Section */}
            {showMomentTensor && momentTensorInfo && (
              <>
                <Separator className="bg-border/40" />
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Moment Tensor Analysis
                  </h3>
                  <div className="grid gap-3">
                    {momentTensorInfo.source && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">Source</span>
                        <span className="text-sm font-mono font-medium">{momentTensorInfo.source}</span>
                      </div>
                    )}
                    {momentTensorInfo.magnitude && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">Derived Magnitude</span>
                        <Badge variant="outline" className="font-mono font-semibold">
                          {momentTensorInfo.magnitude}
                          {momentTensorInfo.magnitudeType && ` ${momentTensorInfo.magnitudeType}`}
                        </Badge>
                      </div>
                    )}
                    {momentTensorInfo.scalarMoment && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">Scalar Moment</span>
                        <span className="text-sm font-mono font-medium">{momentTensorInfo.scalarMoment}</span>
                      </div>
                    )}
                    {momentTensorInfo.percentDoubleCoup && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">Double Couple</span>
                        <Badge variant="secondary" className="font-semibold">
                          {momentTensorInfo.percentDoubleCoup}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator className="bg-border/40" />

            {/* Action Button */}
            <Button
              asChild
              className="w-full gap-2 h-12 font-semibold shadow-soft hover:shadow-medium transition-all duration-200"
              size="lg"
            >
              <a
                href={properties.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-5 w-5" />
                View on USGS Website
              </a>
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
