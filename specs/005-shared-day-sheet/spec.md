# Feature Specification: Shared planner day sheet

**Feature Branch**: `cursor/shared-day-sheet-4c97`

**Created**: 2026-08-22

**Status**: Draft

**Input**: User description: "For Earlier or Later, open a similar interface to Add to planner from Recipes. Modularise so it can be reused as we update it. Also show which date the meal is being dragged from on the sidebar."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One week-and-day sheet for adding and moving (Priority: P1)

The household already knows the Recipes **Add to planner** sheet: a week label with previous/next arrows, a list of the seven days with what is already planned, and a confirm button. That same chooser becomes the shared way to pick a calendar day — whether the cook is adding a recipe from Recipes or moving a dinner from the planner rail.

**Why this priority**: Two pickers will drift. One sheet means every later tweak (week-start day, occupancy, labels) lands in both places.

**Independent Test**: Open Add to planner from a recipe. The week list, arrows, occupancy, and confirm button still work. The same sheet, with move wording, can be opened on its own and report the chosen day.

**Acceptance Scenarios**:

1. **Given** a recipe’s Add to planner sheet is open, **When** the cook flips weeks and taps a day, **Then** that day is selected and the confirm label names that weekday and date.
2. **Given** the same sheet is opened to move a dinner, **When** the cook looks at it, **Then** they see the same week list and day rows, with wording that they are moving (not adding).
3. **Given** a later change to the sheet (week arrows, day rows, occupancy), **When** either Recipes or the planner opens it, **Then** both show the updated chooser.

---

### User Story 2 - Earlier / Later opens that sheet to finish a move (Priority: P1)

The cook holds a dinner and drops it on **Earlier** or **Later** on the rail. Instead of a native calendar popup, the shared week-and-day sheet opens. Earlier starts on the week before the dinner’s week; Later starts on the week after. They pick a day (and can flip further) and confirm. The dinner moves there. Closing the sheet without confirming leaves it where it was.

**Why this priority**: The native date popup is a different, harder-to-scan control than the sheet they already use to plan dinners.

**Independent Test**: Hold a Wednesday dinner, drop on Earlier, pick the previous week’s Monday, confirm — the meal is Monday. Drop on Later, close the sheet — the meal stays on Wednesday.

**Acceptance Scenarios**:

1. **Given** a hold-drag is in progress, **When** the cook drops on Earlier, **Then** the shared sheet opens on the previous display week (last day selected) and no native date popup appears.
2. **Given** they drop on Later, **When** the sheet opens, **Then** it shows the next display week (first day selected).
3. **Given** the sheet is open, **When** they choose another day and confirm, **Then** the dinner is saved on that calendar date and the planner shows the week that contains it if needed.
4. **Given** the sheet is open, **When** they close it or tap the dimmer, **Then** the dinner stays on its original date.
5. **Given** they drop on a numbered rail day or a week-list day, **When** the drag ends, **Then** the meal moves there immediately and the sheet does not open.

---

### User Story 3 - The rail marks the day being moved from (Priority: P2)

While the rail is open, the cook can see which date the dinner is coming from. That day is marked more clearly than a thin ring — a short **From** label sits with that day’s circle so it is obvious even when the circle is already filled.

**Why this priority**: Nearby days look alike; without a source mark it is easy to drop back on the same day or lose track mid-drag.

**Independent Test**: Hold Thursday’s dinner. The Thursday circle on the rail is labelled From. Other days are not.

**Acceptance Scenarios**:

1. **Given** a dinner on Thursday is held, **When** the rail appears, **Then** Thursday shows a From indicator and the other numbered days do not.
2. **Given** the origin day also has recipe names, **When** the cook looks at it, **Then** From still appears (names stay under the weekday).

---

### Edge Cases

- Closing the sheet after Earlier/Later does not write a move.
- Confirming the origin date is a no-op (meal stays, no error toast required).
- The sheet respects the household “week starts on” setting, same as Recipes.
- Occupancy on the sheet comes from dinners already planned that week (including the meal being moved).
- Temporary (`tmp-*`) meals still cannot be held, so they never reach this sheet.
- If the week’s dinners fail to load, the sheet still lists seven days (empty occupancy).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Recipes Add to planner and planner Earlier/Later MUST use the same week-and-day chooser (week arrows, seven day rows with occupancy, confirm).
- **FR-002**: The chooser MUST accept different titles and confirm wording so add vs move stay distinct, without duplicating the day list.
- **FR-003**: Dropping on Earlier MUST open the chooser on the display week before the meal’s week, with the last day of that week selected.
- **FR-004**: Dropping on Later MUST open the chooser on the display week after the meal’s week, with the first day of that week selected.
- **FR-005**: Confirming the chooser from Earlier/Later MUST move the dinner to the selected calendar date (same save path as other planner moves).
- **FR-006**: Dismissing the chooser without confirm MUST leave the dinner on its original date.
- **FR-007**: Earlier/Later MUST NOT open a native date popup.
- **FR-008**: While the rail is visible, the origin date MUST show a From indicator; other rail days MUST NOT.
- **FR-009**: Numbered rail days and week-list drops MUST still move immediately without opening the chooser.

### Key Entities

- **Day sheet session**: Which meal (or recipe), which display week is showing, which day index is selected, whether the action is add or move.
- **Rail origin**: The calendar date the held dinner started on.
- **Display week**: Seven days from the household start-of-week setting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A cook who already uses Add to planner can finish an Earlier/Later move on the first try without learning a second picker.
- **SC-002**: A change to the day list or week arrows appears in both Recipes and planner without a second implementation.
- **SC-003**: During a hold-drag, the cook can name the source date from the rail in under two seconds (the From mark is visible without opening a menu).
- **SC-004**: Cancelling the sheet after Earlier/Later never moves the dinner.

## Assumptions

- The existing Recipes Add to planner layout (week arrows, full-width day rows, occupancy text) is the target look.
- Earlier/Later still mean “beyond the numbered rail,” implemented as previous/next display week from the meal’s week; the cook can arrow further.
- Persistence stays the existing planner move (delete + create dinner on the new date).
- No new libraries.
