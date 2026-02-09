/**
 * Modified Mercalli Intensity (MMI) scale utility
 * Converts numeric MMI values to human-readable format with Roman numerals and descriptive labels
 */

interface MMIBand {
  min: number;
  max: number;
  roman: string;
  label: string;
}

const MMI_BANDS: MMIBand[] = [
  { min: 1, max: 1.99, roman: 'I', label: 'Not felt' },
  { min: 2, max: 2.99, roman: 'II', label: 'Weak' },
  { min: 3, max: 3.99, roman: 'III', label: 'Weak' },
  { min: 4, max: 4.99, roman: 'IV', label: 'Light' },
  { min: 5, max: 5.99, roman: 'V', label: 'Moderate' },
  { min: 6, max: 6.99, roman: 'VI', label: 'Strong' },
  { min: 7, max: 7.99, roman: 'VII', label: 'Very strong' },
  { min: 8, max: 8.99, roman: 'VIII', label: 'Severe' },
  { min: 9, max: 9.99, roman: 'IX', label: 'Violent' },
  { min: 10, max: 10.99, roman: 'X', label: 'Extreme' },
  { min: 11, max: 11.99, roman: 'XI', label: 'Extreme' },
  { min: 12, max: Infinity, roman: 'XII', label: 'Extreme' },
];

/**
 * Formats an MMI value into a display string with intensity and descriptive label
 * @param mmi - The numeric MMI value (can be null/undefined)
 * @returns Formatted string like "6.2 (VI – Strong)" or "Not reported" if missing
 */
export function formatMMI(mmi: number | null | undefined): string {
  if (mmi === null || mmi === undefined) {
    return 'Not reported';
  }

  // Handle out-of-range values
  if (mmi < 1) {
    return 'Unknown';
  }

  // Find the appropriate band
  const band = MMI_BANDS.find((b) => mmi >= b.min && mmi <= b.max);

  if (!band) {
    return 'Unknown';
  }

  // Format with one decimal place
  const intensity = mmi.toFixed(1);
  return `${intensity} (${band.roman} – ${band.label})`;
}

/**
 * Gets just the Roman numeral for an MMI value
 * @param mmi - The numeric MMI value
 * @returns Roman numeral string or null if invalid
 */
export function getMMIRoman(mmi: number | null | undefined): string | null {
  if (mmi === null || mmi === undefined || mmi < 1) {
    return null;
  }

  const band = MMI_BANDS.find((b) => mmi >= b.min && mmi <= b.max);
  return band?.roman || null;
}

/**
 * Gets just the descriptive label for an MMI value
 * @param mmi - The numeric MMI value
 * @returns Label string or null if invalid
 */
export function getMMILabel(mmi: number | null | undefined): string | null {
  if (mmi === null || mmi === undefined || mmi < 1) {
    return null;
  }

  const band = MMI_BANDS.find((b) => mmi >= b.min && mmi <= b.max);
  return band?.label || null;
}
