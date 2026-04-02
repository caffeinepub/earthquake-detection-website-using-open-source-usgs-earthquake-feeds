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

// ---- Beach ball math helpers ----

const DEG = Math.PI / 180;

/**
 * Lambert equal-area (Schmidt net) lower hemisphere projection.
 * Flips to lower hemisphere if z < 0.
 */
function lambertProject(ix: number, iy: number, iz: number): [number, number] {
  let lx = ix;
  let ly = iy;
  let lz = iz;
  if (lz < 0) {
    lx = -lx;
    ly = -ly;
    lz = -lz;
  }
  const r = Math.sqrt(2 / (1 + lz + 1e-10));
  return [lx * r, ly * r];
}

/**
 * Points along the nodal plane great circle in Lambert equal-area projection.
 * Only lower-hemisphere points are returned.
 */
function nodalPlanePoints(
  strikeDeg: number,
  dipDeg: number,
): Array<[number, number]> {
  const s = strikeDeg * DEG;
  const d = dipDeg * DEG;
  const points: Array<[number, number]> = [];
  // along-strike unit vector (x=East, y=North, z=down)
  const ux = Math.sin(s);
  const uy = Math.cos(s);
  // down-dip unit vector in lower hemisphere (z positive down)
  const wx = Math.cos(d) * Math.cos(s);
  const wy = -Math.cos(d) * Math.sin(s);
  const wz = Math.sin(d);

  for (let t = 0; t <= 360; t += 2) {
    const tr = t * DEG;
    const vx = Math.cos(tr) * ux + Math.sin(tr) * wx;
    const vy = Math.cos(tr) * uy + Math.sin(tr) * wy;
    const vz = Math.sin(tr) * wz; // uz=0
    if (vz >= 0) {
      points.push(lambertProject(vx, vy, vz));
    }
  }
  return points;
}

/** T-axis unit vector for a fault (strike, dip, rake). */
function computeTAxis(
  strikeDeg: number,
  dipDeg: number,
  rakeDeg: number,
): [number, number, number] {
  const s = strikeDeg * DEG;
  const d = dipDeg * DEG;
  const r = rakeDeg * DEG;
  // slip vector
  const slipX =
    Math.cos(r) * Math.sin(s) + Math.sin(r) * (-Math.cos(d) * Math.cos(s));
  const slipY =
    Math.cos(r) * Math.cos(s) + Math.sin(r) * (Math.cos(d) * Math.sin(s));
  const slipZ = Math.sin(r) * Math.sin(d);
  // fault normal (z=up convention)
  const nX = -Math.sin(d) * Math.cos(s);
  const nY = Math.sin(d) * Math.sin(s);
  const nZ = Math.cos(d);
  // T-axis
  const tx = slipX + nX;
  const ty = slipY + nY;
  const tz = slipZ + nZ;
  const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
  return [tx / len, ty / len, tz / len];
}

function pointsToSvgPath(
  pts: Array<[number, number]>,
  cx: number,
  cy: number,
  r: number,
): string {
  if (pts.length < 2) return "";
  return `${pts
    .map((p, i) => {
      const x = cx + p[0] * r;
      const y = cy - p[1] * r;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ")} Z`;
}

function isPointInPolygon(
  px: number,
  py: number,
  polygon: Array<[number, number]>,
): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function buildBeachBallPaths(
  np1Strike: number,
  np1Dip: number,
  np1Rake: number,
  np2Strike: number,
  np2Dip: number,
): { dark: string; np1Line: string; np2Line: string } {
  const CX = 90;
  const CY = 90;
  const R = 78;

  const arc1 = nodalPlanePoints(np1Strike, np1Dip);
  const arc2 = nodalPlanePoints(np2Strike, np2Dip);

  const tAxis = computeTAxis(np1Strike, np1Dip, np1Rake);
  const tProj = lambertProject(tAxis[0], tAxis[1], Math.abs(tAxis[2]));
  const tSvgX = CX + tProj[0] * R;
  const tSvgY = CY - tProj[1] * R;

  const combinedFwd: Array<[number, number]> = [
    ...arc1,
    ...arc2.slice().reverse(),
  ];
  const combinedRev: Array<[number, number]> = [
    ...arc2,
    ...arc1.slice().reverse(),
  ];

  const isInsideFwd = isPointInPolygon(
    tSvgX,
    tSvgY,
    combinedFwd.map(([px, py]) => [CX + px * R, CY - py * R]),
  );

  const darkPath = isInsideFwd
    ? pointsToSvgPath(combinedFwd, CX, CY, R)
    : pointsToSvgPath(combinedRev, CX, CY, R);

  const np1Line = arc1
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${(CX + p[0] * R).toFixed(2)},${(CY - p[1] * R).toFixed(2)}`,
    )
    .join(" ");

  const np2Line = arc2
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${(CX + p[0] * R).toFixed(2)},${(CY - p[1] * R).toFixed(2)}`,
    )
    .join(" ");

  return { dark: darkPath, np1Line, np2Line };
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
  np2Strike,
  np2Dip,
  size = 160,
}: BeachBallProps) {
  const CX = 90;
  const CY = 90;
  const R = 78;

  const {
    dark: darkFill,
    np1Line,
    np2Line,
  } = buildBeachBallPaths(np1Strike, np1Dip, np1Rake, np2Strike, np2Dip);

  const tAxis = computeTAxis(np1Strike, np1Dip, np1Rake);
  const tProj = lambertProject(tAxis[0], tAxis[1], Math.abs(tAxis[2]));
  const tSvgX = CX + tProj[0] * R;
  const tSvgY = CY - tProj[1] * R;

  const pAxis = computeTAxis(
    (np1Strike + 180) % 360,
    90 - np1Dip,
    180 - np1Rake,
  );
  const pProj = lambertProject(pAxis[0], pAxis[1], Math.abs(pAxis[2]));
  const pSvgX = CX + pProj[0] * R;
  const pSvgY = CY - pProj[1] * R;

  const clipId = `bb-clip-${np1Strike}-${np1Dip}`;
  const nodalLines = `${np1Line} ${np2Line}`;

  return (
    <svg
      viewBox="0 0 180 180"
      width={size}
      height={size}
      role="img"
      aria-label="Focal mechanism beach ball diagram"
      className="drop-shadow-md"
    >
      <title>Focal mechanism beach ball diagram</title>
      <defs>
        <clipPath id={clipId}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      {/* Background — dilatational (light) quadrant */}
      <circle cx={CX} cy={CY} r={R} fill="#f1f5f9" />

      {/* Compressional (dark) quadrant fill */}
      {darkFill && (
        <path
          d={darkFill}
          fill="#334155"
          clipPath={`url(#${clipId})`}
          opacity={0.92}
        />
      )}

      {/* Nodal plane lines */}
      <path
        d={nodalLines}
        stroke="#475569"
        strokeWidth="2"
        fill="none"
        clipPath={`url(#${clipId})`}
      />

      {/* Outer border */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="#64748b"
        strokeWidth="2"
      />

      {/* Center cross-hair */}
      <line
        x1={CX - 6}
        y1={CY}
        x2={CX + 6}
        y2={CY}
        stroke="#94a3b8"
        strokeWidth="1"
        opacity={0.5}
      />
      <line
        x1={CX}
        y1={CY - 6}
        x2={CX}
        y2={CY + 6}
        stroke="#94a3b8"
        strokeWidth="1"
        opacity={0.5}
      />

      {/* T-axis marker */}
      {!Number.isNaN(tSvgX) && !Number.isNaN(tSvgY) && (
        <>
          <circle cx={tSvgX} cy={tSvgY} r={5} fill="#f59e0b" opacity={0.9} />
          <text
            x={tSvgX + 7}
            y={tSvgY + 4}
            fontSize="9"
            fill="#f59e0b"
            fontWeight="bold"
          >
            T
          </text>
        </>
      )}

      {/* P-axis marker */}
      {!Number.isNaN(pSvgX) && !Number.isNaN(pSvgY) && (
        <>
          <circle cx={pSvgX} cy={pSvgY} r={5} fill="#60a5fa" opacity={0.9} />
          <text
            x={pSvgX + 7}
            y={pSvgY + 4}
            fontSize="9"
            fill="#60a5fa"
            fontWeight="bold"
          >
            P
          </text>
        </>
      )}

      {/* Cardinal labels */}
      <text x={CX} y={10} textAnchor="middle" fontSize="9" fill="#94a3b8">
        N
      </text>
      <text x={172} y={CY + 3} textAnchor="middle" fontSize="9" fill="#94a3b8">
        E
      </text>
      <text x={CX} y={178} textAnchor="middle" fontSize="9" fill="#94a3b8">
        S
      </text>
      <text x={8} y={CY + 3} textAnchor="middle" fontSize="9" fill="#94a3b8">
        W
      </text>
    </svg>
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
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#60a5fa]" />
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
