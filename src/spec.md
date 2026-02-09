# Specification

## Summary
**Goal:** Make Past Week and Past Month views show only earthquakes within the selected time window and ensure all time windows are sorted by most recent event first.

**Planned changes:**
- Apply an explicit client-side time-window filter for Past Week (last 7 days) and Past Month (last 30 days) based on `properties.time`, and use the same filtered dataset across Table / Map / Split views, summary stats, and details selection.
- After filtering (and any existing filters), sort earthquakes by event time descending for all time windows (Past Hour/Day/Week/Month) so the list consistently shows the newest events first.

**User-visible outcome:** Selecting Past Week or Past Month shows only earthquakes from the last 7 or 30 days, and results are consistently ordered newest-to-oldest across the table, map, and summary cards.
