# WhoFeelAnEarthquake

## Current State
- ShakeMapView fetches USGS detail JSON and looks for `intensity.jpg` — fails for most events because USGS only generates ShakeMaps for significant earthquakes (M5.5+). It shows "No ShakeMap available" even when a USGS event page exists.
- EewView MMI radius formula ignores earthquake depth, so rings appear oversized for shallow events and undersized for deep ones. No city/location labels in MMI zones.
- Data is fetched only from USGS. BMKG (Indonesia) and EMSC (European-Mediterranean) are not included.

## Requested Changes (Diff)

### Add
- BMKG data source: `https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json` (latest 15 Indonesia quakes)
- EMSC data source: `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=100&minmag=2.5` (global M2.5+)
- New hook `useMultiSourceEarthquakes.ts` that fetches USGS + BMKG + EMSC, normalizes all to `UsgsFeature` schema, deduplicates by time+location proximity (within 50km and 60 seconds), and returns a merged array with a `source` field on properties
- Source indicator badge (USGS / BMKG / EMSC) in earthquake list items and detail dialog
- MMI rings on EEW map should show city/place labels (using OpenStreetMap Nominatim reverse geocoding for cities within each MMI ring at ~3 sample points per ring)

### Modify
- `ShakeMapView.tsx`: Instead of just fetching `intensity.jpg`, fall back to embedding the USGS ShakeMap event page as an iframe (`https://earthquake.usgs.gov/earthquakes/eventpage/{id}/shakemap`) when the JSON detail approach fails or no intensity.jpg is found. For BMKG/EMSC events without a USGS eventId, show the image from their own ShakeMap URL if available, or a message that ShakeMap is only available for USGS events.
- `eewUtils.ts`: Update `getMmiRadiusKm` to accept `depth` parameter and calculate correct epicentral distance using hypocentral distance: `epicentralDist = sqrt(max(0, hypocentralDist² - depth²))`. Keep backward compatibility by defaulting depth to 10km.
- `EewView.tsx`: Pass earthquake depth to `getMmiRadiusKm`. Add city label markers on the map at the boundary of each MMI ring using Nominatim reverse geocoding. Show source badge (USGS/BMKG/EMSC) in alert list items.
- `EarthquakeDashboard.tsx`: Replace `useUsgsEarthquakes` with `useMultiSourceEarthquakes`, pass the merged data to all views. Add a small "Sources" badge/count in the header or stats row.

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/lib/bmkgTypes.ts` — BMKG response types
2. Create `src/frontend/src/lib/emscTypes.ts` — EMSC/FDSN response types
3. Create `src/frontend/src/lib/dataNormalizer.ts` — normalize BMKG + EMSC responses to `UsgsFeature` format with `source` field
4. Create `src/frontend/src/hooks/useMultiSourceEarthquakes.ts` — merge USGS + BMKG + EMSC, deduplicate
5. Update `eewUtils.ts` — depth-aware MMI radius
6. Update `EewView.tsx` — pass depth to MMI radius, add Nominatim city labels on MMI ring boundaries
7. Update `ShakeMapView.tsx` — iframe fallback for USGS events when intensity.jpg not found
8. Update `EarthquakeDashboard.tsx` — switch to useMultiSourceEarthquakes
