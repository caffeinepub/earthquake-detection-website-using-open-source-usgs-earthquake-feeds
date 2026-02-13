# Specification

## Summary
**Goal:** Make the dashboard’s “Refresh Data” button reliably force an immediate refetch of the currently selected USGS earthquake feed, with correct manual-refresh loading state and clear user confirmation.

**Planned changes:**
- Update the “Refresh Data” action to force a new network request for the currently selected time-window feed (even if React Query considers cached data fresh), using the same query key as the dashboard feed query.
- Separate manual refresh state from background React Query fetching so the button is only disabled and shows “Refreshing...” during a user-initiated refresh.
- Add a small “Last refreshed: <time>” style indicator near the controls that updates only after successful manual refreshes (not background refetches).

**User-visible outcome:** Clicking “Refresh Data” consistently fetches the latest data for the selected time window, the button remains usable during normal operation, and the UI shows when the last manual refresh occurred.
