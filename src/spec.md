# Specification

## Summary
**Goal:** Fix the Leaflet map rendering as a black background when toggling the existing custom fullscreen mode, ensuring tiles stay visible and the map properly resizes.

**Planned changes:**
- Update the existing Leaflet map component to trigger a resize/invalidate after fullscreen layout changes have been applied (not just immediately on fullscreenchange).
- Ensure the map container uses true fullscreen dimensions while in fullscreen (e.g., 100vw/100vh) and restores its prior constrained height on exit.
- Adjust/extend existing fullscreen-related CSS so the Leaflet container/panes stack and render correctly in fullscreen without covering/hiding the tile layer.
- Verify controls, markers, and popups remain functional across repeated fullscreen toggles and that no console errors are introduced.

**User-visible outcome:** Users can enter and exit fullscreen on the map without the base tiles disappearing; the map fills the viewport in fullscreen, returns to its original size on exit, and remains fully interactive (controls, markers, popups) throughout.
