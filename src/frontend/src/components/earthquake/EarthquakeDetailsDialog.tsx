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
import { useEffect, useRef } from "react";
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

// ---- Canvas-based Beach Ball (seismologically correct) ----

/**
 * Lambert azimuthal equal-area projection for lower hemisphere.
 * Converts a canvas pixel to a 3D unit vector in (North, East, Up).
 * Returns null if the pixel is outside the circle.
 */
function pixelToLowerHemisphere(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number,
): [number, number, number] | null {
  const xNorm = (px - cx) / r;
  const yNorm = (cy - py) / r; // flip: canvas y down → North up
  const rho2 = xNorm * xNorm + yNorm * yNorm;
  if (rho2 > 1) return null;

  // Lambert equal-area lower hemisphere:
  // z_down = 1 - 2*rho2, guaranteed >= -1
  const zDown = 1 - 2 * rho2;
  const sinTheta = Math.sqrt(Math.max(0, 1 - zDown * zDown));
  const rho = Math.sqrt(rho2);
  const eComp = rho > 1e-10 ? (xNorm / rho) * sinTheta : 0;
  const nComp = rho > 1e-10 ? (yNorm / rho) * sinTheta : 0;
  const uComp = -zDown; // Up = -Down

  return [nComp, eComp, uComp]; // [North, East, Up]
}

/**
 * Determines if a ray direction (North, East, Up) is in the compressional
 * quadrant for the given fault plane (Aki & Richards convention).
 *
 * Compressional if (fault_normal · ray) * (slip · ray) > 0
 */
function isCompressional(
  nRay: number,
  eRay: number,
  uRay: number,
  strikeDeg: number,
  dipDeg: number,
  rakeDeg: number,
): boolean {
  const s = (strikeDeg * Math.PI) / 180;
  const d = (dipDeg * Math.PI) / 180;
  const rk = (rakeDeg * Math.PI) / 180;

  // Fault normal in N-E-U (Aki & Richards): n = (-sin(d)sin(s), sin(d)cos(s), cos(d))
  const fnN = -Math.sin(d) * Math.sin(s);
  const fnE = Math.sin(d) * Math.cos(s);
  const fnU = Math.cos(d);

  // Slip vector (hanging wall motion) in N-E-U:
  // slip_N = cos(rk)*cos(s) + sin(rk)*cos(d)*sin(s)
  // slip_E = cos(rk)*sin(s) - sin(rk)*cos(d)*cos(s)
  // slip_U = -sin(rk)*sin(d)
  const slN =
    Math.cos(rk) * Math.cos(s) + Math.sin(rk) * Math.cos(d) * Math.sin(s);
  const slE =
    Math.cos(rk) * Math.sin(s) - Math.sin(rk) * Math.cos(d) * Math.cos(s);
  const slU = -Math.sin(rk) * Math.sin(d);

  const dot1 = fnN * nRay + fnE * eRay + fnU * uRay;
  const dot2 = slN * nRay + slE * eRay + slU * uRay;

  return dot1 * dot2 > 0;
}

/**
 * Project a 3D unit vector (N, E, U) to canvas pixel using Lambert
 * equal-area lower hemisphere projection.
 */
function projectToCanvas(
  n: number,
  e: number,
  u: number,
  cx: number,
  cy: number,
  r: number,
): [number, number] {
  // Flip to lower hemisphere if pointing up
  let N = n;
  let E = e;
  let U = u;
  if (U > 0) {
    N = -N;
    E = -E;
    U = -U;
  }
  const zDown = -U;
  const rho = Math.sqrt(Math.max(0, (1 - zDown) / 2));
  const sinTheta = Math.sqrt(Math.max(0, 1 - zDown * zDown));
  const scale = sinTheta > 1e-10 ? rho / sinTheta : 0;
  const xNorm = E * scale;
  const yNorm = N * scale;
  return [cx + xNorm * r, cy - yNorm * r];
}

interface BeachBallProps {
  np1Strike: number;
  np1Dip: number;
  np1Rake: number;
  np2Strike: number;
  np2Dip: number;
  np2Rake: number;
  size?: number;
}

function BeachBallDiagram({
  np1Strike,
  np1Dip,
  np1Rake,
  size = 160,
}: BeachBallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const S = canvas.width;
    const cx = S / 2;
    const cy = S / 2;
    const r = S / 2 - 2;

    ctx.clearRect(0, 0, S, S);

    // Pixel-by-pixel classification
    const imageData = ctx.createImageData(S, S);

    for (let px = 0; px < S; px++) {
      for (let py = 0; py < S; py++) {
        const vec = pixelToLowerHemisphere(px, py, cx, cy, r);
        if (!vec) continue;
        const [nComp, eComp, uComp] = vec;
        const comp = isCompressional(
          nComp,
          eComp,
          uComp,
          np1Strike,
          np1Dip,
          np1Rake,
        );
        const idx = (py * S + px) * 4;
        const val = comp ? 20 : 248;
        imageData.data[idx] = val;
        imageData.data[idx + 1] = val;
        imageData.data[idx + 2] = val;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Clip to circle
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // Outer border
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Compute P and T axes from NP1
    const s = (np1Strike * Math.PI) / 180;
    const d = (np1Dip * Math.PI) / 180;
    const rk = (np1Rake * Math.PI) / 180;

    const fnN = -Math.sin(d) * Math.sin(s);
    const fnE = Math.sin(d) * Math.cos(s);
    const fnU = Math.cos(d);

    const slN =
      Math.cos(rk) * Math.cos(s) + Math.sin(rk) * Math.cos(d) * Math.sin(s);
    const slE =
      Math.cos(rk) * Math.sin(s) - Math.sin(rk) * Math.cos(d) * Math.cos(s);
    const slU = -Math.sin(rk) * Math.sin(d);

    // P-axis: normalize(n - slip)
    const pRawN = fnN - slN;
    const pRawE = fnE - slE;
    const pRawU = fnU - slU;
    const pLen = Math.sqrt(pRawN * pRawN + pRawE * pRawE + pRawU * pRawU) || 1;
    const pN = pRawN / pLen;
    const pE = pRawE / pLen;
    const pU = pRawU / pLen;

    // T-axis: normalize(n + slip)
    const tRawN = fnN + slN;
    const tRawE = fnE + slE;
    const tRawU = fnU + slU;
    const tLen = Math.sqrt(tRawN * tRawN + tRawE * tRawE + tRawU * tRawU) || 1;
    const tN = tRawN / tLen;
    const tE = tRawE / tLen;
    const tU = tRawU / tLen;

    const [pCx, pCy] = projectToCanvas(pN, pE, pU, cx, cy, r);
    const [tCx, tCy] = projectToCanvas(tN, tE, tU, cx, cy, r);

    // P marker (blue)
    if (!Number.isNaN(pCx) && !Number.isNaN(pCy)) {
      ctx.beginPath();
      ctx.arc(pCx, pCy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#3b82f6";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("P", pCx + 7, pCy + 4);
    }

    // T marker (amber)
    if (!Number.isNaN(tCx) && !Number.isNaN(tCy)) {
      ctx.beginPath();
      ctx.arc(tCx, tCy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("T", tCx + 7, tCy + 4);
    }

    // Cardinal labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", cx, 10);
    ctx.fillText("S", cx, S - 2);
    ctx.textAlign = "left";
    ctx.fillText("E", S - 10, cy + 4);
    ctx.textAlign = "right";
    ctx.fillText("W", 10, cy + 4);
  }, [np1Strike, np1Dip, np1Rake]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: "50%" }}
      role="img"
      aria-label="Focal mechanism beach ball diagram"
    />
  );
}

export function EarthquakeDetailsDialog({
  earthquake,
  open,
  onOpenChange,
}: EarthquakeDetailsDialogProps) {
  const {
    data: eventDetail,
    isLoading: isLoadingDetail,
    isError: isDetailError,
  } = useUsgsEventDetail({
    detailUrl: earthquake?.properties.detail || null,
    enabled: open && !!earthquake,
  });

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
  const showFocalMechanism =
    !isDetailError && (isLoadingDetail || focalMechanismInfo !== null);

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
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Location
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
                      Time
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
                      Depth
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
                Additional Details
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
                        <span className="text-sm font-mono font-medium">
                          {momentTensorInfo.source}
                        </span>
                      </div>
                    )}
                    {momentTensorInfo.magnitude && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">
                          Derived Magnitude
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
                          Scalar Moment
                        </span>
                        <span className="text-sm font-mono font-medium">
                          {momentTensorInfo.scalarMoment}
                        </span>
                      </div>
                    )}
                    {momentTensorInfo.percentDoubleCoup && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold">
                          Double Couple
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
                    Focal Mechanism
                  </h3>

                  {isLoadingDetail ? (
                    <div className="flex flex-col items-center gap-4">
                      <Skeleton className="w-40 h-40 rounded-full" />
                      <div className="grid gap-3 w-full sm:grid-cols-2">
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                      </div>
                    </div>
                  ) : focalMechanismInfo ? (
                    <>
                      {/* Beach ball diagram */}
                      <div className="flex justify-center py-2">
                        <div className="relative">
                          <BeachBallDiagram
                            np1Strike={focalMechanismInfo.np1Strike}
                            np1Dip={focalMechanismInfo.np1Dip}
                            np1Rake={focalMechanismInfo.np1Rake}
                            np2Strike={focalMechanismInfo.np2Strike}
                            np2Dip={focalMechanismInfo.np2Dip}
                            np2Rake={focalMechanismInfo.np2Rake}
                            size={160}
                          />
                          <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-4">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                              P (compressional)
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                              T (tensional)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Nodal plane data */}
                      <div className="grid gap-3 sm:grid-cols-2 mt-8">
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Nodal Plane 1
                          </p>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                Strike
                              </p>
                              <p className="text-sm font-mono font-semibold">
                                {focalMechanismInfo.np1Strike}°
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                Dip
                              </p>
                              <p className="text-sm font-mono font-semibold">
                                {focalMechanismInfo.np1Dip}°
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                Rake
                              </p>
                              <p className="text-sm font-mono font-semibold">
                                {focalMechanismInfo.np1Rake}°
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Nodal Plane 2
                          </p>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                Strike
                              </p>
                              <p className="text-sm font-mono font-semibold">
                                {focalMechanismInfo.np2Strike}°
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                Dip
                              </p>
                              <p className="text-sm font-mono font-semibold">
                                {focalMechanismInfo.np2Dip}°
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                Rake
                              </p>
                              <p className="text-sm font-mono font-semibold">
                                {focalMechanismInfo.np2Rake}°
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Extra metadata */}
                      {(focalMechanismInfo.stationCount ||
                        focalMechanismInfo.azimuthalGap ||
                        focalMechanismInfo.magnitudeType) && (
                        <div className="grid gap-3">
                          {focalMechanismInfo.stationCount && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                              <span className="text-sm font-semibold">
                                Station Count
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
                                Azimuthal Gap
                              </span>
                              <Badge
                                variant="secondary"
                                className="font-mono font-semibold"
                              >
                                {focalMechanismInfo.azimuthalGap}°
                              </Badge>
                            </div>
                          )}
                          {focalMechanismInfo.magnitudeType && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                              <span className="text-sm font-semibold">
                                Magnitude Type
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
                View on USGS Website
              </a>
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
