# Feature Specification: Adaptive rail and honest day-sheet occupancy

**Feature Branch**: `cursor/adaptive-rail-sheet-4c97`

**Created**: 2026-08-22

**Status**: Implemented

**Input**: User description: "Sidebar should show current date ±2 plus Earlier/Later; longer screens show more so Later is not cut off. Shared day sheet sometimes misses recipes when changing weeks and flips between This/Next week and raw dates. Load what is planned on those dates, cache fetches, use speckit first."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rail fits the screen (Priority: P1)

When the cook holds a dinner, the right-hand rail shows **Earlier**, a short run of nearby days centred on the dinner’s date, and **Later**. On a typical phone that run is the dinner’s day plus two days before and two after. On a taller screen more days appear, still centred on the dinner. The rail’s usable height stops above the household bottom navigation on a phone, so Later is never hidden under Planner / Recipes / Shopping.

**Why this priority**: Later is unusable when the rail is too long or when it sits under the tab bar. Nearby days matter more than filling the strip.

**Independent Test**: Hold a dinner on a short phone with the bottom nav showing — five numbered days plus Earlier and Later are fully visible above the nav. Repeat on a tall viewport — more numbered days appear and Later is still fully visible.

**Acceptance Scenarios**:

1. **Given** a typical phone-height screen, **When** the rail opens, **Then** it shows Earlier, the origin day ± two days (five numbered days), and Later, all fully on screen.
2. **Given** a taller screen with spare vertical room, **When** the rail opens, **Then** extra numbered days appear around the origin (still including Earlier and Later).
3. **Given** the rail is open, **When** the cook looks at the bottom, **Then** Later is fully visible (not cut off).
4. **Given** a phone with the bottom navigation visible, **When** the rail opens, **Then** Later sits fully above that bar (not underneath it).
5. **Given** they drop on a numbered day, Earlier, or Later, **When** the drag ends, **Then** existing move behaviour is unchanged.

---

### User Story 2 - Day sheet occupancy matches the planner (Priority: P1)

The shared week-and-day sheet (Recipes add and planner Earlier/Later) lists the dinners that are actually planned on those seven calendar dates. Flipping weeks keeps that honest. Week labels stay consistent: **This week** and **Next week** when those weeks are showing, otherwise a date range — they do not flip between those phrases and mismatched dates for the same week.

**Why this priority**: Empty or wrong occupancy after an arrow tap makes the sheet untrustworthy.

**Independent Test**: Plan Wednesday dinner. Open the sheet on this week — Wednesday shows that recipe. Tap next week, then back — Wednesday still shows it; the header still says This week (not a shifted date range for the same week).

**Acceptance Scenarios**:

1. **Given** dinners exist on specific calendar dates this week, **When** the sheet opens on this week, **Then** each day row lists those dinners (same titles the planner shows for those dates).
2. **Given** the sheet is on this week, **When** the cook taps next week then previous week, **Then** occupancy matches the planner again and the label is This week.
3. **Given** they open next week, **When** they look at the header, **Then** it says Next week (not a date range that is actually this week, or vice versa).
4. **Given** a day in the shown week has nothing planned, **When** they look at that row, **Then** it says nothing planned.

---

### User Story 3 - Occupancy is cached across week flips (Priority: P2)

Flipping weeks in the sheet does not reload weeks the cook already fetched in this visit. A successful add or move refreshes the affected weeks so the sheet does not show stale dinners.

**Why this priority**: Repeated full reloads are slow and were part of the flaky occupancy. Cache must not lie after a write.

**Independent Test**: Open the sheet, flip to next week (network), flip back — this week’s dinners appear without a second request for that week. Add or move a dinner, open the sheet again — the new date shows it.

**Acceptance Scenarios**:

1. **Given** this week’s dinners were already loaded, **When** the cook leaves and returns to this week in the same sheet session, **Then** those dinners still appear without requiring a fresh load of that week.
2. **Given** a dinner is added or moved, **When** the sheet next shows that week, **Then** occupancy includes the change (cache for the written week is refreshed).

---

### Edge Cases

- Very short viewports still show at least origin ±2 plus Earlier and Later (they may be compact, but Later remains reachable and above the bottom nav).
- Origin stays in the numbered window when extra days are added.
- On a phone, extra numbered days are chosen from the height left after the bottom navigation is reserved. The desktop sidebar does not reserve bottom space.
- Household week-start setting still rotates the seven sheet days.
- Temporary meals still cannot open the rail.
- Cache is in-memory for the current page visit only (refresh starts clean).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The rail MUST show Earlier, a contiguous numbered window centred on the held dinner’s date, and Later.
- **FR-002**: On a typical phone height the numbered window MUST be the origin day plus two days before and two after.
- **FR-003**: When vertical space allows, the numbered window MUST grow (still centred on the origin) so Later stays fully visible.
- **FR-010**: On a phone, usable rail height MUST exclude the bottom navigation. Later MUST sit above that bar. The desktop sidebar MUST NOT steal height from the bottom of the rail.
- **FR-004**: The day sheet MUST populate each of the seven displayed dates from dinners planned on those calendar dates (the same association the planner list uses).
- **FR-005**: Week labels MUST be stable: This week / Next week for those weeks, otherwise a date range of the week actually shown.
- **FR-006**: Display-week identity (which seven dates are “this week”, and shifting by one week) MUST use local calendar dates, not a timezone-shifted day.
- **FR-007**: Storage week keys used to talk to the existing planner API MUST stay unchanged (Monday-canonical keys already stored).
- **FR-008**: Weeks already fetched in the current visit MUST be reused when the sheet or rail needs them again.
- **FR-009**: After a successful add or move, cached occupancy for the affected storage weeks MUST be refreshed before the next read.

### Key Entities

- **Rail window**: Origin date, count of numbered days, Earlier/Later slots, viewport height and reserved bottom-nav height used to choose the count.
- **Display week**: Seven local calendar dates from the household start day.
- **Storage week**: Existing Monday-canonical planner API key (unchanged).
- **Week cache**: In-memory dinners keyed by storage week, invalidated on write.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a phone-height screen with the bottom navigation showing, Later is fully visible during a hold-drag (not clipped and not under the nav).
- **SC-002**: After flipping away and back, the sheet shows the same dinners the planner shows for those dates on the first look.
- **SC-003**: The same week is never labelled both “This week” and a conflicting date range in one session of arrowing.
- **SC-004**: Returning to an already-viewed week in the same visit does not require another fetch of that week unless a dinner was added or moved.

## Assumptions

- Typical phone height is a kitchen phone in portrait (~600–750px of usable rail height after the bottom navigation).
- The bottom navigation is the phone tab bar (Planner / Recipes / Shopping). The desktop left sidebar is not a bottom reserve.
- Extra rail days expand evenly around the origin (not only into the future).
- Cache lives in the page for that visit; it is not persisted across reloads.
- `formatWeekStart` remains the storage key helper so existing planned rows keep matching.
