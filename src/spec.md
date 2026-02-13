# Specification

## Summary
**Goal:** Fix the Split view layout so the Map and Table cards render a complete, properly rounded border (especially along the bottom edge) without clipping, while preserving the intended ~600px panel height behavior.

**Planned changes:**
- Update Split view container/wrapper styling in `frontend/src/pages/EarthquakeDashboard.tsx` to prevent card borders (bottom edge and rounded corners) from being visually clipped.
- Ensure Split view maintains ~600px panel heights while keeping the map visible and the table scrollable, without introducing new overflow/scrollbar artifacts.
- Verify Map-only and Table-only views still render continuous, correct card borders (including the Table’s inner bordered container).

**User-visible outcome:** In Split view, both the Map and Table panels show full, clean rounded card borders (including the bottom edge) with consistent rendering across common screen sizes, and Map-only/Table-only views remain visually correct.
