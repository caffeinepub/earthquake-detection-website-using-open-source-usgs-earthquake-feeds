# WhoFeelAnEarthquake

## Current State
Full earthquake detection dashboard built with React + TypeScript + Leaflet + USGS API. Features:
- EarthquakeDashboard page with header, filter controls, summary stats, table/map/split views
- EarthquakeMapView with Leaflet, tectonic boundaries, terrain mode toggle, fullscreen control
- EarthquakeResultsTable with virtualization
- EarthquakeDetailsDialog with moment tensor & MMI info
- FeedAndFilterControls with time window, magnitude slider, search, refresh
- DashboardSummary stats cards
- Dark/light theme via next-themes
- OKLCH color tokens in index.css

## Requested Changes (Diff)

### Add
- Full-screen loading animation on initial page load (before data/UI appears)
- Missing CSS variables for `--success`, `--success-foreground`, `--warning`, `--warning-foreground` in index.css
- Leaflet fullscreen CSS fix: when fullscreen, map tile layers must re-render (invalidateSize call after transition)
- CSS rule: `.leaflet-control-container` buttons get proper styling

### Modify
- Fix index.css to add success/warning OKLCH color variables (currently missing, causing broken badge colors)
- Fix map fullscreen going black: ensure map container has correct height and invalidateSize fires properly after fullscreen transition
- Fix missing `--subtitle` text under the main title to say: "Latest real-time earthquake information around the world"
- Ensure footer says: "© 2026 WhoFeelAnEarthquake. Powered by USGS."
- Ensure all filter controls (Time Window select, Magnitude slider, Search input, Refresh button) are fully functional with correct z-index
- Table must be fully visible (no cropped bottom), scrollable, responsive on all devices
- Loading state: replace skeleton with a full-page animated loading screen

### Remove
- Nothing to remove

## Implementation Plan
1. Add full-screen loading animation component (LoadingScreen) shown while `isLoading` is true
2. Add missing OKLCH color variables for success/warning to index.css
3. Fix Leaflet fullscreen black-screen issue with proper invalidateSize timing
4. Add h2 subtitle under main title
5. Fix footer copyright text
6. Ensure table scrolls properly and is not cropped
7. Validate and build
