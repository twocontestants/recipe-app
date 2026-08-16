# Mise en Place Constitution

## Core Principles

### I. Household-first UX
The product is used in a kitchen, often on a phone. Controls must stay readable, tappable, and unobstructed when the on-screen keyboard is open. Visual chrome (icons, menus, overlays) must never cover the text the user is typing.

### II. Extract what you test
Layout math and other non-UI rules live in small, dependency-free modules so they can be unit-tested without booting the Next.js app. Components consume those modules; they do not inline the rules.

### III. Test-first for behavior changes
When a user-visible bug is fixed, write a failing test that describes the expected geometry or structure first, then change production code until it passes. Do not ship picker/keyboard behavior without automated coverage of the reported failure.

### IV. Keep the planner overlay honest
Modals that sit above the planner must occupy the visible area above the keyboard with no uncovered strip of the page behind them. A dimmed backdrop covers the full screen; the sheet itself sits flush with the visible viewport.

### V. Simplicity
Prefer a flex row over absolute overlays when an icon sits beside an input. Prefer viewport-box math over device-specific hacks. Do not add libraries unless the existing stack cannot express the test.

## Development Workflow

- Spec Kit artifacts (`specs/<feature>/spec.md`, `plan.md`, `tasks.md`) are the source of intent for the feature.
- Tasks that add tests must be completed before the matching implementation task.
- `npm test` must pass before a picker behavior change is considered done.

## Governance

This constitution applies to planner picker work and other UI that shares the same overlay/search patterns. Amendments are recorded in this file with a version bump.

**Version**: 1.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16
