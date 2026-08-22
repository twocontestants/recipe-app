# Feature Specification: Month prefetch and live planner sync

**Feature Branch**: `cursor/planner-month-sync-4c97`

**Created**: 2026-08-22

**Status**: Implemented

**Input**: User description: "Don't cache by weeks — silently load the whole month in the background (still display weeks as normal). Broadcast a socket update if any client changes things so the local copy stays synced."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Month loads quietly, week stays the view (Priority: P1)

The cook still moves through the planner one week at a time. Behind that, the household’s dinners for the **calendar month** of the week they are looking at load in one go, without a week-by-week fetch. Flipping to another week in the same month does not hit the network for meals again. If they cross into another month, that month loads the same way, in the background.

**Why this priority**: Week-chunked cache was the wrong grain — a month is one quiet load and matches how cooks think about “what’s on this month.”

**Independent Test**: Open this week. Meals for other days in the same month are already available when opening the day sheet or rail without extra week requests. Next week in the same month appears without a meal refetch.

**Acceptance Scenarios**:

1. **Given** the planner opens on this week, **When** the month has finished loading, **Then** the week on screen still shows only those seven days, but dinners from the rest of that month are already in the local copy.
2. **Given** that month is loaded, **When** the cook opens the next week in the same month, **Then** those dinners appear from the local copy (no new meal download for that week).
3. **Given** they move to a week in another month, **When** that month is not loaded yet, **Then** it loads in the background and the week view updates when it arrives.

---

### User Story 2 - Other devices stay in sync (Priority: P1)

If one phone adds, moves, or deletes a dinner, other open planner or Recipes add-to-plan views in the household pick up the change without a manual refresh. The existing shopping-list live channel is the model: persist first, then tell the others.

**Why this priority**: A month-long local copy goes stale the moment someone else plans a meal.

**Independent Test**: Two clients on the planner. Add a dinner on A. B’s week (or day sheet) shows it shortly after, without B refreshing.

**Acceptance Scenarios**:

1. **Given** two clients are viewing the planner, **When** A adds or moves a dinner, **Then** B’s local copy updates to match.
2. **Given** A deletes a dinner, **When** the update arrives, **Then** B no longer shows that dinner.
3. **Given** Recipes add-to-plan is open on B, **When** A changes that week, **Then** B’s occupancy list reflects the change.
4. **Given** the sender just wrote the change, **When** they broadcast, **Then** they are not wiped back to an older copy of their own edit.

---

### Edge Cases

- Month load failure leaves the week already on screen; a toast is enough.
- Crossing a month boundary (week that spans two months) loads both months that contain those seven dates.
- A tab that was backgrounded may miss a live event; coming back to the tab refreshes the current month quietly. First paint / leftover focus MUST NOT treat the page as “just returned” and wipe a good copy with an empty one.
- Temporary (`tmp-*`) optimistic meals are not required on other clients until the save succeeds.
- Existing dinners stay visible even when the host clock is UTC and the household is east of UTC (stored week keys may be the previous calendar day). An empty month fetch MUST NOT lock the planner on a blank week.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Meal downloads for the planner and the shared day sheet MUST be by calendar month (one request covering that month), not one request per storage week.
- **FR-002**: The planner UI MUST continue to show and navigate by week.
- **FR-003**: Weeks already covered by a loaded month MUST be served from the local copy.
- **FR-004**: After a successful add, move, or delete, the acting client MUST notify other household clients over the existing live socket.
- **FR-005**: Other clients that receive that notice MUST refresh their local month copy from the stored planner (source of truth) and update what is on screen.
- **FR-006**: The sender MUST NOT apply their own broadcast as if it were a remote change (no self-echo overwrite).
- **FR-007**: Existing storage week keys used in the database MUST stay unchanged.
- **FR-008**: A month download MUST return the dinners the household already stored for those dates, even when the server’s clock is in a different timezone from the cook’s phone. It MUST NOT key the query only from Monday dates computed on the server.
- **FR-009**: The week on screen MUST still load via the existing single-week path as a safety net. An empty month result MUST NOT replace dinners already on screen or mark that month as loaded.

### Key Entities

- **Calendar month**: Local year-month (e.g. August 2026) and the dinners whose dates fall in the storage weeks that overlap it.
- **Local month copy**: In-memory dinners for months already loaded this visit.
- **Planner change event**: Notice that some client persisted a planner write.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening the planner and then the next week in the same month does not perform a second meal download for that week.
- **SC-002**: A dinner added on a second device appears on the first within a few seconds while both stay on the planner.
- **SC-003**: The cook still sees exactly one week of days at a time (month load does not change the layout).
- **SC-004**: After opening the planner in Australia, dinners already planned for this week are visible without a refresh workaround.

## Assumptions

- The household already has a Socket.IO relay (shopping list). Planner uses the same server and a shared planner room.
- One household / one planner (no per-user rooms).
- Adjacent months may be prefetched quietly so a week that crosses a month edge is covered.
- `formatWeekStart` (`toISOString()` of local Monday midnight) remains the storage key. East of UTC those keys are often the previous Sunday. Month reads must find those rows without a data migration.
