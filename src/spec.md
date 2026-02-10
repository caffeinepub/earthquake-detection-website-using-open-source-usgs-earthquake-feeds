# Specification

## Summary
**Goal:** Make the Dashboard Split view (Map + Earthquake Results table) responsive across mobile, tablet, and desktop so both panels remain usable without clipping, awkward scrolling, or fixed-height constraints.

**Planned changes:**
- Update the Split view layout to stack Map and Table vertically on small screens and switch to an appropriate two-column layout on medium/large screens.
- Replace any hard-coded Split view container heights with responsive sizing that adapts to viewport height, ensuring content stays accessible on short viewports.
- Adjust the Table card region in Split view so it can scroll vertically (keeping the sticky header working) and scroll horizontally within its own container on narrow widths without breaking the page layout.
- Ensure existing table behaviors remain intact in Split view (row selection opens details dialog, selected-row styling, external link button doesn’t trigger selection, virtualization remains correct).
- Verify no regressions to the existing Table-only and Map-only view modes.

**User-visible outcome:** On any device size, Split view cleanly adapts (stacked on mobile, side-by-side on larger screens), with a usable Map and a responsive, scrollable table (including sticky header and all interactions) without content being cut off.
