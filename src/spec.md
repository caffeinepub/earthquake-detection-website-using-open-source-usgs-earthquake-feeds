# Specification

## Summary
**Goal:** Ensure the Earthquake Details dialog always renders above Leaflet map layers and blocks map interaction while open.

**Planned changes:**
- Adjust app-level/modal and Leaflet container/pane/controls styling (e.g., z-index/stacking context) so the dialog overlay and content consistently appear above map tiles, markers, attribution, and zoom controls in both Map and Split views.
- Ensure the dialog overlay captures pointer events so users cannot click/drag/zoom the map underneath while the dialog is open, and restore normal interaction when closed.
- Implement the fix without modifying any read-only shadcn/ui component source files under `frontend/src/components/ui`, keeping Leaflet functionality and theme support intact.

**User-visible outcome:** Opening Earthquake Details from a marker or table row shows a proper modal above the map (no overlap/hidden content) and the map cannot be interacted with until the dialog is closed.
