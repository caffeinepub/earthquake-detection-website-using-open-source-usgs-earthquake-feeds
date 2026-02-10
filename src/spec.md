# Specification

## Summary
**Goal:** Fix the earthquake results table layout so the last row is fully visible (no bottom cropping) in both Table and Split views.

**Planned changes:**
- Adjust `EarthquakeResultsTable` container sizing/overflow so the table’s scroll area accounts for header/row height and does not clip the last row while preserving virtualization and the sticky header.
- Update Split view layout in `EarthquakeDashboard` to remove/replace the current `h-[600px] overflow-hidden` wrapper behavior that clips the table, ensuring the table region is the element that scrolls.
- Verify consistent behavior across view modes (Table and Split) without modifying read-only shadcn/ui component source files.

**User-visible outcome:** In both Table and Split views, users can scroll to the end of the earthquake list and see the final row completely (no clipped bottom), with the header behavior unchanged.
