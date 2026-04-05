import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Clock,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUsgsEventDetail } from "../../hooks/useUsgsEventDetail";
import {
  formatCoordinates,
  formatDepth,
  formatFullTimestamp,
  formatMagnitude,
} from "../../lib/formatters";
import { formatMMI } from "../../lib/mmi";
import type { UsgsEventDetailProduct } from "../../lib/usgsEventDetailTypes";
import { getMagnitudeColor, getMagnitudeLabel } from "../../lib/usgsFeeds";
import type { UsgsFeature } from "../../lib/usgsTypes";

interface EarthquakeDetailsDialogProps {
  earthquake: UsgsFeature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getMomentTensorInfo(products?: UsgsEventDetailProduct[]) {
  if (!products || products.length === 0) return null;
  const preferredProduct = products.reduce((prev, current) => {
    const prevWeight = prev.preferredWeight ?? 0;
    const currentWeight = current.preferredWeight ?? 0;
    return currentWeight > prevWeight ? current : prev;
  }, products[0]);
  const props = preferredProduct.properties;
  return {
    source:
      props.source || props["beachball-source"] || preferredProduct.source,
    magnitude: props["derived-magnitude"] || null,
    magnitudeType: props["derived-magnitude-type"] || null,
    scalarMoment: props["scalar-moment"] || null,
    depth: props["derived-depth"] || null,
    percentDoubleCoup: props["percent-double-couple"] || null,
  };
}

interface FocalMechanismInfo {
  np1Strike: number;
  np1Dip: number;
  np1Rake: number;
  np2Strike: number;
  np2Dip: number;
  np2Rake: number;
  azimuthalGap: string | null;
  stationCount: string | null;
  magnitudeType: string | null;
}

function getFocalMechanismInfo(
  products?: UsgsEventDetailProduct[],
): FocalMechanismInfo | null {
  if (!products || products.length === 0) return null;
  const preferredProduct = products.reduce((prev, current) => {
    const prevWeight = prev.preferredWeight ?? 0;
    const currentWeight = current.preferredWeight ?? 0;
    return currentWeight > prevWeight ? current : prev;
  }, products[0]);
  const p = preferredProduct.properties;

  const np1Strike = Number.parseFloat(
    p["nodal-plane-1-strike"] ?? p["np1-strike"] ?? "",
  );
  const np1Dip = Number.parseFloat(
    p["nodal-plane-1-dip"] ?? p["np1-dip"] ?? "",
  );
  const np1Rake = Number.parseFloat(
    p["nodal-plane-1-rake"] ?? p["np1-slip"] ?? p["np1-rake"] ?? "",
  );
  const np2Strike = Number.parseFloat(
    p["nodal-plane-2-strike"] ?? p["np2-strike"] ?? "",
  );
  const np2Dip = Number.parseFloat(
    p["nodal-plane-2-dip"] ?? p["np2-dip"] ?? "",
  );
  const np2Rake = Number.parseFloat(
    p["nodal-plane-2-rake"] ?? p["np2-slip"] ?? p["np2-rake"] ?? "",
  );

  if (
    Number.isNaN(np1Strike) ||
    Number.isNaN(np1Dip) ||
    Number.isNaN(np1Rake) ||
    Number.isNaN(np2Strike) ||
    Number.isNaN(np2Dip) ||
    Number.isNaN(np2Rake)
  ) {
    return null;
  }

  return {
    np1Strike,
    np1Dip,
    np1Rake,
    np2Strike,
    np2Dip,
    np2Rake,
    azimuthalGap: p["azimuthal-gap"] ?? null,
    stationCount: p["station-count"] ?? null,
    magnitudeType: p["magnitude-type"] ?? null,
  };
}

/**
 * Extract the beach ball PNG image URL from a USGS product's contents.
 * Tries known standard keys first, then falls back to any .png file in contents.
 */
function getBeachBallImageUrl(
  products?: UsgsEventDetailProduct[],
): string | null {
  if (!products || products.length === 0) return null;

  const preferredProduct = products.reduce((prev, current) => {
    const prevWeight = prev.preferredWeight ?? 0;
    const currentWeight = current.preferredWeight ?? 0;
    return currentWeight > prevWeight ? current : prev;
  }, products[0]);

  const contents = preferredProduct.contents ?? {};

  // Try known standard keys first (prioritize colored versions)
  const knownKeys = [
    "download/moment_tensor.png",
    "download/focal_mechanism.png",
    "download/beachball.png",
    "download/mt.png",
    "download/moment-tensor.png",
    "moment_tensor.png",
    "focal_mechanism.png",
  ];

  for (const key of knownKeys) {
    if (contents[key]?.url) return contents[key].url;
  }

  // Fallback: find any .png in contents that looks like a beach ball
  for (const [key, val] of Object.entries(contents)) {
    if (
      key.endsWith(".png") &&
      val?.url &&
      (key.includes("moment") ||
        key.includes("focal") ||
        key.includes("beach") ||
        key.includes("tensor"))
    ) {
      return val.url;
    }
  }

  // Last resort: any .png in contents
  for (const [key, val] of Object.entries(contents)) {
    if (key.endsWith(".png") && val?.url) return val.url;
  }

  return null;
}

/**
 * Build a direct USGS beach ball image URL from event ID and product source/code.
 * USGS hosts beachball images at predictable URLs.
 */
function buildUsgsBeachBallUrl(
  products?: UsgsEventDetailProduct[],
): string | null {
  if (!products || products.length === 0) return null;

  const preferredProduct = products.reduce((prev, current) => {
    const prevWeight = prev.preferredWeight ?? 0;
    const currentWeight = current.preferredWeight ?? 0;
    return currentWeight > prevWeight ? current : prev;
  }, products[0]);

  // Try to find the base URL from any content entry
  const contents = preferredProduct.contents ?? {};
  const anyContent = Object.values(contents)[0];
  if (!anyContent?.url) return null;

  // Extract base path up to the product directory
  // Example URL: https://earthquake.usgs.gov/product/moment-tensor/us7000nxxx/us/1234567/download/moment_tensor.png
  const urlParts = anyContent.url.split("/download/");
  if (urlParts.length < 2) return null;

  const basePath = urlParts[0];
  // Try colored versions first
  const candidates = [
    `${basePath}/download/moment_tensor.png`,
    `${basePath}/download/focal_mechanism.png`,
    `${basePath}/download/beachball.png`,
  ];

  return candidates[0]; // Return first candidate; will fall back via onError
}

/**
 * Component that tries to load a USGS beach ball image, with fallback chain:
 * 1. Image from product contents (getBeachBallImageUrl)
 * 2. Built URL from product base path
 * 3. No image (shows nothing, allowing canvas fallback)
 */
function UsgsBeachBallImage({
  imageUrl,
  fallbackUrl,
  size = 160,
  onLoadFail,
}: {
  imageUrl: string | null;
  fallbackUrl: string | null;
  size?: number;
  onLoadFail: () => void;
}) {
  const [currentUrl, setCurrentUrl] = useState(imageUrl ?? fallbackUrl);
  const [triedFallback, setTriedFallback] = useState(false);

  const handleError = () => {
    if (!triedFallback && fallbackUrl && currentUrl !== fallbackUrl) {
      setTriedFallback(true);
      setCurrentUrl(fallbackUrl);
    } else {
      onLoadFail();
    }
  };

  if (!currentUrl) {
    onLoadFail();
    return null;
  }

  return (
    <img
      src={currentUrl}
      alt="Focal mechanism beach ball from USGS"
      width={size}
      height={size}
      className="rounded-full border border-border/40 shadow-md"
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={handleError}
    />
  );
}

export function EarthquakeDetailsDialog({
  earthquake,
  open,
  onOpenChange,
}: EarthquakeDetailsDialogProps) {
  const { t } = useLanguage();
  const [beachBallFailed, setBeachBallFailed] = useState(false);

  const {
    data: eventDetail,
    isLoading: isLoadingDetail,
    isError: isDetailError,
  } = useUsgsEventDetail({
    detailUrl: earthquake?.properties.detail || null,
    enabled: open && !!earthquake,
  });

  // Reset beach ball failure state when earthquake changes
  const [lastEqId, setLastEqId] = useState<string | null>(null);
  if (earthquake?.id !== lastEqId) {
    setLastEqId(earthquake?.id ?? null);
    if (beachBallFailed) setBeachBallFailed(false);
  }

  if (!earthquake) return null;

  const { properties, geometry } = earthquake;
  const [lon, lat, depth] = geometry.coordinates;

  const momentTensorProducts =
    eventDetail?.properties.products?.["moment-tensor"];
  const momentTensorInfo = momentTensorProducts
    ? getMomentTensorInfo(momentTensorProducts)
    : null;
  const showMomentTensor =
    !isLoadingDetail && !isDetailError && momentTensorInfo;

  const focalMechProducts =
    eventDetail?.properties.products?.["focal-mechanism"];
  const focalMechanismInfo =
    (focalMechProducts ? getFocalMechanismInfo(focalMechProducts) : null) ??
    (momentTensorProducts ? getFocalMechanismInfo(momentTensorProducts) : null);

  // Primary: Try to get beach ball image URL from product contents
  const primaryBeachBallUrl =
    getBeachBallImageUrl(eventDetail?.properties.products?.["moment-tensor"]) ??
    getBeachBallImageUrl(eventDetail?.properties.products?.["focal-mechanism"]);

  // Fallback: try to build direct URL from product base path
  const fallbackBeachBallUrl =
    buildUsgsBeachBallUrl(
      eventDetail?.properties.products?.["moment-tensor"],
    ) ??
    buildUsgsBeachBallUrl(
      eventDetail?.properties.products?.["focal-mechanism"],
    );

  const hasUsgsImage = !!(primaryBeachBallUrl || fallbackBeachBallUrl);

  // Show focal mechanism section if loading, or if we have image OR nodal planes
  const showFocalMechanism =
    !isDetailError &&
    (isLoadingDetail || focalMechanismInfo !== null || hasUsgsImage);

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
                  {t.detailedInfo}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Location & Time Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t.eventInformation}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t.location}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {formatCoordinates(lat, lon)}
                  </p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t.time}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {formatFullTimestamp(properties.time)}
                  </p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Layers className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t.depth}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{formatDepth(depth)}</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Type
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {properties.type || "Earthquake"}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-border/40" />

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {t.additionalDetails}
              </h3>
              <div className="grid gap-3">
                {properties.mmi && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <span className="text-sm font-semibold">
                      Modified Mercalli Intensity
                    </span>
                    <Badge
                      variant="secondary"
                      className="font-mono font-semibold"
                    >
                      {formatMMI(properties.mmi)}
                    </Badge>
                  </div>
                )}
                {properties.tsunami === 1 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <span className="text-sm font-semibold">
                      {t.tsunamiAlert}
                    </span>
                    <Badge variant="destructive" className="font-semibold">
                      {t.active}
                    </Badge>
                  </div>
                )}
                {properties.felt !== null && properties.felt !== undefined && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <span className="text-sm font-semibold">
                      {t.feltReports}
                    </span>
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
                    {t.momentTensorAnalysis}
                  </h3>
                  <div className="grid gap-3">
                    {momentTensorInfo.source && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">
                          {t.source}
                        </span>
                        <span className="text-sm font-mono font-medium">
                          {momentTensorInfo.source}
                        </span>
                      </div>
                    )}
                    {momentTensorInfo.magnitude && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">
                          {t.derivedMagnitude}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono font-semibold"
                        >
                          {momentTensorInfo.magnitude}
                          {momentTensorInfo.magnitudeType &&
                            ` ${momentTensorInfo.magnitudeType}`}
                        </Badge>
                      </div>
                    )}
                    {momentTensorInfo.scalarMoment && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">
                          {t.scalarMoment}
                        </span>
                        <span className="text-sm font-mono font-medium">
                          {momentTensorInfo.scalarMoment}
                        </span>
                      </div>
                    )}
                    {momentTensorInfo.percentDoubleCoup && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">
                          {t.doubleCouple}
                        </span>
                        <Badge variant="secondary" className="font-semibold">
                          {momentTensorInfo.percentDoubleCoup}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Focal Mechanism Section */}
            {showFocalMechanism && (
              <>
                <Separator className="bg-border/40" />
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {t.focalMechanism}
                  </h3>

                  {isLoadingDetail ? (
                    <div className="flex flex-col items-center gap-4">
                      <Skeleton className="w-40 h-40 rounded-full" />
                      <div className="grid gap-3 w-full sm:grid-cols-2">
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                      </div>
                    </div>
                  ) : (hasUsgsImage && !beachBallFailed) ||
                    focalMechanismInfo ? (
                    <>
                      {/* Beach ball diagram */}
                      <div className="flex justify-center py-2">
                        <div className="relative">
                          {hasUsgsImage && !beachBallFailed ? (
                            <UsgsBeachBallImage
                              imageUrl={primaryBeachBallUrl}
                              fallbackUrl={fallbackBeachBallUrl}
                              size={160}
                              onLoadFail={() => setBeachBallFailed(true)}
                            />
                          ) : null}
                          <div className="absolute -bottom-6 left-0 right-0 text-center">
                            <span className="text-[10px] text-muted-foreground/60">
                              {hasUsgsImage && !beachBallFailed
                                ? t.sourceUSGS
                                : t.computedFromNodalPlanes}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Nodal plane data */}
                      {focalMechanismInfo && (
                        <div className="grid gap-3 sm:grid-cols-2 mt-8">
                          <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                              {t.nodalPlane1}
                            </p>
                            <div className="grid grid-cols-3 gap-1">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  {t.strike}
                                </p>
                                <p className="text-sm font-mono font-semibold">
                                  {focalMechanismInfo.np1Strike}&deg;
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  {t.dip}
                                </p>
                                <p className="text-sm font-mono font-semibold">
                                  {focalMechanismInfo.np1Dip}&deg;
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  {t.rake}
                                </p>
                                <p className="text-sm font-mono font-semibold">
                                  {focalMechanismInfo.np1Rake}&deg;
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                              {t.nodalPlane2}
                            </p>
                            <div className="grid grid-cols-3 gap-1">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  {t.strike}
                                </p>
                                <p className="text-sm font-mono font-semibold">
                                  {focalMechanismInfo.np2Strike}&deg;
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  {t.dip}
                                </p>
                                <p className="text-sm font-mono font-semibold">
                                  {focalMechanismInfo.np2Dip}&deg;
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  {t.rake}
                                </p>
                                <p className="text-sm font-mono font-semibold">
                                  {focalMechanismInfo.np2Rake}&deg;
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Extra metadata */}
                      {focalMechanismInfo &&
                        (focalMechanismInfo.stationCount ||
                          focalMechanismInfo.azimuthalGap ||
                          focalMechanismInfo.magnitudeType) && (
                          <div className="grid gap-3">
                            {focalMechanismInfo.stationCount && (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                                <span className="text-sm font-semibold">
                                  {t.stationCount}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="font-mono font-semibold"
                                >
                                  {focalMechanismInfo.stationCount}
                                </Badge>
                              </div>
                            )}
                            {focalMechanismInfo.azimuthalGap && (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                                <span className="text-sm font-semibold">
                                  {t.azimuthalGap}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="font-mono font-semibold"
                                >
                                  {focalMechanismInfo.azimuthalGap}&deg;
                                </Badge>
                              </div>
                            )}
                            {focalMechanismInfo.magnitudeType && (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                                <span className="text-sm font-semibold">
                                  {t.magnitudeType}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="font-mono font-semibold"
                                >
                                  {focalMechanismInfo.magnitudeType}
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}
                    </>
                  ) : null}
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
                {t.viewOnUSGS}
              </a>
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
