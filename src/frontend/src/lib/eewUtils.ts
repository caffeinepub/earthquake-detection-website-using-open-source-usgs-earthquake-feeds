/**
 * Earthquake Early Warning (EEW) utility functions
 * Inspired by Japan's EEW system
 */

/**
 * Estimate MMI at a given distance from epicenter using Wald et al. attenuation
 * mmi = 2.20 * mag - 1.91 * log10(distKm) - 1.4
 */
export function getMmiFromMagAndDistance(
  mag: number,
  distanceKm: number,
): number {
  const mmi = 2.2 * mag - 1.91 * Math.log10(Math.max(distanceKm, 1)) - 1.4;
  return Math.max(1, Math.min(10, mmi));
}

/**
 * Given a target MMI level and magnitude, compute the radius (km) at which that MMI is reached
 * Inverted from: mmi = 2.20*mag - 1.91*log10(dist) - 1.4
 * → dist = 10^((2.20*mag - 1.4 - mmi) / 1.91)
 */
export function getMmiRadiusKm(mag: number, targetMmi: number): number {
  const exp = (2.2 * mag - 1.4 - targetMmi) / 1.91;
  return 10 ** exp;
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
