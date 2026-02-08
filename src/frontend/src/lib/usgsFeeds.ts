import { TimeWindow } from './usgsTypes';

const USGS_BASE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';

export const TIME_WINDOW_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: 'hour', label: 'Past Hour' },
  { value: 'day', label: 'Past Day' },
  { value: 'week', label: 'Past Week' },
  { value: 'month', label: 'Past Month' },
];

export function getUsgsFeedUrl(timeWindow: TimeWindow): string {
  // USGS provides feeds for all earthquakes in different time windows
  return `${USGS_BASE_URL}/all_${timeWindow}.geojson`;
}

export function getMagnitudeLabel(magnitude: number | null): string {
  if (magnitude === null) return 'Unknown';
  if (magnitude < 2.5) return 'Minor';
  if (magnitude < 4.5) return 'Light';
  if (magnitude < 6.0) return 'Moderate';
  if (magnitude < 7.0) return 'Strong';
  if (magnitude < 8.0) return 'Major';
  return 'Great';
}

export function getMagnitudeColor(magnitude: number | null): string {
  if (magnitude === null) return 'muted';
  if (magnitude < 2.5) return 'success';
  if (magnitude < 4.5) return 'secondary';
  if (magnitude < 6.0) return 'warning';
  if (magnitude < 7.0) return 'destructive';
  return 'destructive';
}
