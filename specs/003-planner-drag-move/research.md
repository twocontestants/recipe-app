# Research: Planner drag-to-move

## Decision 1 — Pointer drag, not HTML5 DnD

**Decision**: `pointerdown` / `pointermove` / `pointerup` with `setPointerCapture` on the meal card.

**Rationale**: HTML5 drag-and-drop is unreliable on iOS. The planner is used in a kitchen on a phone. Pointer events work for finger and mouse.

**Alternatives considered**: HTML5 `draggable`; a DnD library — rejected (constitution: no extra libraries; iOS gaps).

## Decision 2 — When week strips appear

**Decision**: Previous / Next week overlays appear only while a drag is active **and** the pointer Y is inside a fixed viewport edge band. Leaving the band hides that strip.

**Rationale**: Matches “a thing that shows up if they go to the top or bottom.” Always-on strips would cover the first and last days.

**Alternatives considered**: Always show strips during any drag — more discoverable but eats vertical space on a phone.

## Decision 3 — Adjacent-week drop day

**Decision**: Same display-week column (same weekday under the household week-start setting). Then navigate the planner to that adjacent week.

**Rationale**: Predictable. Seeing the destination week confirms the landing.

**Alternatives considered**: Drop onto “the first day of that week”; stay on the current week and only toast — easier to miss.

## Decision 4 — Tap vs drag

**Decision**: Movement ≥ 8 CSS pixels from pointer-down starts a drag and suppresses the click. Less than that is a tap (open recipe).

**Rationale**: Small enough to feel immediate; large enough to avoid accidental moves while scrolling or tapping.

## Decision 5 — Temp meals

**Decision**: Cards whose id starts with `tmp-` are not draggable until the server id exists.

**Rationale**: Move is delete+insert; a temp id cannot be deleted on the server.
