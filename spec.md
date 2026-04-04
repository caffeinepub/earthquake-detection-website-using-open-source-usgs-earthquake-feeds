# WhoFeelAnEarthquake

## Current State

App is a full-stack earthquake monitoring dashboard with:
- USGS/EMSC/BMKG data feeds
- Table, Map, Split, Tsunami, EEW tabs
- EEW tab with MMI rings (currently max MMI level 8 in `MMI_LEVELS` array)
- Full-screen loading screen (`LoadingScreen.tsx`) shown while `isLoading` is true
- No geolocation or push notification features

## Requested Changes (Diff)

### Add
- **MMI XII support in EEW tab**: Extend `MMI_LEVELS` array from max 8 up to 12. Rings only drawn when USGS data shows that level is actually reached (radius > 0). Update `getMmiColor` and `getMmiLabel` in `eewUtils.ts` for MMI 9-12 with distinct colors.
- **User geolocation feature**: New hook `useUserLocation.ts` — requests browser Geolocation API permission, stores `{lat, lng}` or null. Show a "Locate Me" button in the dashboard header area. When active, display a blue marker on the map and a "Nearest Earthquakes" info strip below the summary cards showing top 3 closest earthquakes + distance in km.
- **Chrome Push Notification for real-time nearby earthquakes**: New utility `notificationService.ts` — requests Notification API permission. When user location is known, compare new earthquake data against previous fetch. For each new earthquake within 1000km of user, send a browser notification with title "Gempa Terdekat: M{mag}" and body "{location} — {distance} km away". Trigger only on new events (compare event IDs between fetches).
- **Service Worker for notifications**: Create `public/sw.js` — simple service worker that handles `push` event and `notificationclick`. Register it in `main.tsx`.

### Modify
- **`LoadingScreen.tsx`**: Replace full-screen spinner with skeleton loading layout. Skeleton must match the real page structure: header skeleton, summary card skeletons (3-4), filter bar skeleton, and table rows skeleton (8 rows). Use `<Skeleton>` from shadcn/ui.
- **`eewUtils.ts`**: Extend `getMmiColor` to cover MMI 9 (deep red), 10 (dark red), 11 (near-black red), 12 (black). Extend `getMmiLabel` for 9, 10, 11, 12 with Roman numeral labels.
- **`EewView.tsx`**: Change `MMI_LEVELS` constant from `[8,7,6,5,4,3,2]` to `[12,11,10,9,8,7,6,5,4,3,2]`. Update `MMI_DESCRIPTIONS` record to include keys 9-12. When drawing rings, skip any MMI level where `getMmiRadiusKm` returns ≤ 0 (already done). No UI change otherwise.
- **`EarthquakeDashboard.tsx`**: Add `useUserLocation` hook. Add locate button in header. Pass userLocation to `EarthquakeMapView`. Show nearest-quakes strip when location known. Wire `notificationService` to auto-request notification permission when user approves location.

### Remove
- Nothing removed

## Implementation Plan

1. Update `src/frontend/src/lib/eewUtils.ts`: extend `getMmiColor` (9→#990000, 10→#660000, 11→#330000, 12→#000000) and `getMmiLabel` (9→IX-Violent, 10→X-Extreme, 11→XI-Extreme, 12→XII-Catastrophic). Fix `getMmiFromMagAndDistance` max clamp from 10 to 12.
2. Update `src/frontend/src/components/earthquake/EewView.tsx`: expand `MMI_LEVELS` to include 9–12, add descriptions for new levels.
3. Replace `src/frontend/src/components/LoadingScreen.tsx` with skeleton layout using shadcn `<Skeleton>` components.
4. Create `src/frontend/src/hooks/useUserLocation.ts` — Geolocation hook.
5. Create `src/frontend/src/lib/notificationService.ts` — notification permission + send logic with distance filter (1000km), dedup by event ID.
6. Create `src/frontend/public/sw.js` — minimal service worker.
7. Update `src/frontend/src/main.tsx` — register service worker.
8. Update `src/frontend/src/pages/EarthquakeDashboard.tsx` — add locate button, nearest quakes strip, wire notification service.
9. Update `src/frontend/src/components/earthquake/EarthquakeMapView.tsx` — accept and show user location marker.
