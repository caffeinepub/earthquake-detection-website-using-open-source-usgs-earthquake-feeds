# WhoFeelAnEarthquake - EEW (Earthquake Early Warning) Tab

## Current State
The app has 4 view tabs: Table, Map, Split, Tsunami. It fetches USGS earthquake data and displays it in a Leaflet map with markers, table, and tsunami warnings. The USGS data includes `mmi`, `cdi`, `alert`, magnitude, coordinates, and time fields.

## Requested Changes (Diff)

### Add
- New `EEW` tab (Earthquake Early Warning) in the view mode toggle
- New `EewView.tsx` component with:
  - Left panel: list of recent significant earthquakes as "EEW Alerts" (sorted by time, newest first, preferably past hour/day)
  - Right panel: Leaflet map showing the selected alert's epicenter with:
    - Animated expanding P-wave ring (faster, blue)
    - Animated expanding S-wave ring (slower, red/orange)
    - MMI intensity contour rings (color-coded concentric circles: I–X+)
    - Epicenter crosshair marker
  - MMI scale legend panel
  - Alert info card: magnitude, depth, location, time since event, PAGER alert level
  - "Impacted Areas" table/list showing estimated MMI at distance bands
- New `useEewAlerts.ts` hook that:
  - Derives EEW alerts from the existing USGS data (past 24h, magnitude >= 3.0)
  - Auto-selects the most recent significant event
  - Refreshes every 60 seconds
- New `eewUtils.ts` lib:
  - MMI estimation from magnitude and distance (using Wald et al. attenuation)
  - P-wave and S-wave radius calculation from elapsed seconds
  - MMI -> color mapping (I=white, II-III=light green, IV-V=yellow, VI=orange, VII=red-orange, VIII=red, IX=dark red, X+=maroon)
  - MMI -> felt description labels

### Modify
- `EarthquakeDashboard.tsx`: add `"eew"` to `ViewMode` type and add the EEW tab button (with a "pulse" icon like Radio/Zap) in the tab row

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/lib/eewUtils.ts` - MMI attenuation math, wave radius calc, color/label maps
2. Create `src/frontend/src/hooks/useEewAlerts.ts` - derive EEW alerts from props/USGS data
3. Create `src/frontend/src/components/earthquake/EewView.tsx` - full EEW panel with Leaflet map, animated rings, MMI legend, alert list
4. Update `EarthquakeDashboard.tsx` - add `eew` view mode, tab button, and render `<EewView>`
