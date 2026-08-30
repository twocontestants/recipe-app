# Feature Specification: Unified shopping list items

**Feature Branch**: `015-unified-shopping-items`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "Help refactor the shopping lists feature and how the data is stored in the back end. Ultimately the list items should be in the item object and the checked states should be stored with the item within the item object, rather than a seperate check_state object. Similar with custom items, why can't it just be in the same item object. Use speckit. Also we don't need to worry about checked timestamps and checked by, just whether this checked or not."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A tick belongs to the line itself (Priority: P1)

A cook opens a shopping list and ticks items off while walking the aisles. Each line remembers only whether it is ticked. Reloading the list, or another household member opening the same list, shows the same ticks. The list does not store who ticked a line or when.

**Why this priority**: Ticks are the daily use of Shopping. Folding the tick into the line is the core of this change.

**Independent Test**: Generate or open a list, tick two lines, reload. Those two stay ticked; unticked lines stay clear. Nothing on the line shows who ticked it or a tick time.

**Acceptance Scenarios**:

1. **Given** an open list with several lines, **When** the cook ticks one line and reloads, **Then** that line is still ticked and the others are not.
2. **Given** a ticked line, **When** the cook unticks it and reloads, **Then** the line is clear.
3. **Given** a list with ticks, **When** the cook clears all ticks, **Then** every line is clear after reload.
4. **Given** two cooks on the same list, **When** one ticks a line, **Then** the other sees that line ticked without being told who did it or when.

---

### User Story 2 - Hand-added lines are ordinary list items (Priority: P2)

A cook adds “Tape” or extra fruit that was not in the recipes. That line sits in the same list as recipe-derived lines: same tick, rename, amount, aisle, delete, and reorder behaviour.

**Why this priority**: Hand-added lines are already first-class in the kitchen; they should not be a second kind of record.

**Independent Test**: Add a hand-typed line, tick it, rename it, move its aisle, reload. It is still there with those edits. Recipe-derived lines on the same list are unchanged.

**Acceptance Scenarios**:

1. **Given** an open list, **When** the cook adds a hand-typed line, **Then** it appears in the chosen aisle and remains after reload.
2. **Given** a hand-typed line, **When** the cook ticks, renames, changes quantity, or moves aisle, **Then** those edits survive reload the same way recipe-derived lines do.
3. **Given** a hand-typed line, **When** the cook deletes it, **Then** it is gone after reload.
4. **Given** a list that already has recipe-derived lines, **When** the cook adds a hand-typed line, **Then** both kinds appear together as one list.

---

### User Story 3 - Older lists still open with their ticks and extras (Priority: P2)

A cook opens a list that was saved when ticks and hand-added lines were stored separately. They still see those ticks and extras. After that open, the list behaves like a new list: ticks live on the line, extras are ordinary items, and who/when is gone.

**Why this priority**: Existing households must not lose ticks or extras when this change lands.

**Independent Test**: Open a list that still has the old split shape (separate ticks and extras). Ticks and extras appear. A later reload still shows them.

**Acceptance Scenarios**:

1. **Given** a saved list whose ticks were stored separately from the lines, **When** the cook opens it, **Then** each previously ticked line is still ticked.
2. **Given** a saved list with hand-added extras stored separately, **When** the cook opens it, **Then** those extras appear as ordinary lines.
3. **Given** an older list that only recorded who ticked a line and when, **When** the cook opens it, **Then** the line is ticked or not and no who/when is shown or kept.
4. **Given** a list that used leftover name-based tick keys, **When** the cook opens it, **Then** those ticks still land on the matching lines.

---

### Edge Cases

- Empty list: no lines, no ticks; adding the first hand-typed line still works.
- Detached recipe sub-line (one wording pulled out of a merged group): that row has its own tick, stored with that line, not a side table.
- Hidden or deleted recipe line: its tick is gone with the line; it does not reappear as a stray tick.
- Dropdown of saved lists still loads names only; it does not download every list’s lines or ticks.
- Live tick from another cook still applies immediately; a later full read of the list agrees with that tick.
- A cook with unsaved structural edits still in flight is not overwritten by a background refresh (same rule as today).
- A list that never had ticks or extras opens as an ordinary list of unchecked recipe lines.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every shopping line — recipe-derived or hand-added — MUST be one item on the list. Hand-added lines MUST NOT be stored as a separate extras collection.
- **FR-002**: Whether a line is ticked MUST be stored on that item. The list MUST NOT keep a separate tick map for day-to-day use.
- **FR-003**: A tick MUST be only yes or no. The product MUST NOT store who ticked a line or when it was ticked.
- **FR-004**: Checking, unchecking, and “clear all ticks” MUST persist and MUST survive reload.
- **FR-005**: Adding, editing, moving, and deleting a hand-added line MUST persist on that same item and MUST survive reload.
- **FR-006**: Opening a list saved in the older split shape MUST present the same ticks and hand-added lines, then keep them on the items going forward.
- **FR-007**: Name-keyed leftover ticks from older lists MUST still apply to the matching item.
- **FR-008**: Listing saved list names MUST still omit item bodies, ticks, extras, overrides, and aisle order.
- **FR-009**: A detached recipe wording shown as its own row MUST keep its own yes/no tick on that row.
- **FR-010**: Live tick updates between household members MUST still show the line ticked or not, without attributing the tick to a person in stored data.

### Key Entities

- **Shopping list item**: One line on a list. It has identity, the words and amount shown, aisle, optional recipe contributions, whether it was hand-added, and whether it is ticked.
- **Shopping list**: Named list of items plus aisle labels/order. It no longer has a separate extras list or a separate tick map as the source of truth.
- **Shopping list meta**: Dropdown identity only — no item bodies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After ticking or unticking a line, a cook who reloads within a few seconds sees the same yes/no on that line every time.
- **SC-002**: A cook can add a hand-typed line, tick it, and reload, and that line is still present and ticked — with no extra “custom” workflow.
- **SC-003**: Opening an older list that had separate ticks or extras restores those ticks and extras on the first open, without the cook re-entering them.
- **SC-004**: Cooks no longer see or depend on who ticked a line or when; the only stored fact is ticked or not.
- **SC-005**: Opening Shopping with several saved lists still fills the dropdown from a light name list, then loads only the open list’s items.

## Assumptions

- Aisle labels, aisle order, item order, and recipe-line overrides (rename, hide, detach) stay as they are; this feature unifies items, extras, and ticks, not aisle chrome.
- Live household presence (“someone else just ticked onions”) may still flash a brief notice; that notice is not stored.
- Kitchen tables already exist; browse does not run schema creation. Any one-time fold of old lists happens when a list is opened or saved, not on the dropdown index.
- New lists are written in the unified shape from the start.
- Image download size and recipe generation rules are out of scope.
