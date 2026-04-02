/**
 * Earthquake Early Warning (EEW) utility functions
 * Inspired by Japan's EEW system
 */

/**
 * Estimate MMI at a given hypocentral distance using Wald et al. (1999) IPE:
 * MMI = 2.20 * Mw - 1.91 * log10(R_hypo) - 1.4
 * where R_hypo is the hypocentral distance in km.
 */
export function getMmiFromMagAndDistance(
  mag: number,
  distanceKm: number,
): number {
  const mmi = 2.2 * mag - 1.91 * Math.log10(Math.max(distanceKm, 1)) - 1.4;
  return Math.max(1, Math.min(10, mmi));
}

/**
 * Given a target MMI level, magnitude, and focal depth, compute the
 * SURFACE (epicentral) radius in km at which that MMI level is reached.
 *
 * Step 1 — solve for hypocentral distance where MMI equals targetMmi:
 *   mmi = 2.20*mag - 1.91*log10(R_hypo) - 1.4
 *   R_hypo = 10^((2.20*mag - 1.4 - mmi) / 1.91)
 *
 * Step 2 — convert hypocentral distance to surface epicentral radius:
 *   R_surface = sqrt(max(0, R_hypo² - depth²))
 *
 * This ensures that a deep earthquake produces much smaller felt circles
 * than a shallow one of the same magnitude.
 */
export function getMmiRadiusKm(
  mag: number,
  targetMmi: number,
  depthKm = 10,
): number {
  const depth = Math.max(0, depthKm);
  const exp = (2.2 * mag - 1.4 - targetMmi) / 1.91;
  const rHypo = 10 ** exp; // hypocentral distance (km)
  // Surface epicentral radius – can only be real if rHypo > depth
  const rSurface = Math.sqrt(Math.max(0, rHypo * rHypo - depth * depth));
  return rSurface;
}

/**
 * P-wave radius at elapsed seconds (P-wave speed ~6 km/s)
 */
export function getPWaveRadiusKm(elapsedSeconds: number): number {
  return elapsedSeconds * 6;
}

/**
 * S-wave radius at elapsed seconds (S-wave speed ~3.5 km/s)
 */
export function getSWaveRadiusKm(elapsedSeconds: number): number {
  return elapsedSeconds * 3.5;
}

/**
 * Returns hex color for a given MMI level
 */
export function getMmiColor(mmi: number): string {
  if (mmi < 2) return "#ffffff";
  if (mmi < 4) return "#a0e0a0";
  if (mmi < 5) return "#b0e0ff";
  if (mmi < 6) return "#ffe0a0";
  if (mmi < 7) return "#ffb347";
  if (mmi < 8) return "#ff6600";
  if (mmi < 9) return "#ff2200";
  if (mmi < 10) return "#cc0000";
  return "#800000";
}

/**
 * Returns a human-readable label for a given MMI level
 */
export function getMmiLabel(mmi: number): string {
  if (mmi < 2) return "I - Not felt";
  if (mmi < 4) return "II-III - Weak";
  if (mmi < 5) return "IV - Light";
  if (mmi < 6) return "V - Moderate";
  if (mmi < 7) return "VI - Strong";
  if (mmi < 8) return "VII - Very Strong";
  if (mmi < 9) return "VIII - Severe";
  if (mmi < 10) return "IX - Violent";
  return "X+ - Extreme";
}

/**
 * Estimate MMI from USGS PAGER alert level
 */
export function getMmiFromUsgsAlert(alert: string | null): number {
  switch (alert) {
    case "green":
      return 2;
    case "yellow":
      return 5;
    case "orange":
      return 7;
    case "red":
      return 9;
    default:
      return 1;
  }
}
