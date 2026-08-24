<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0 (new principle)
- Modified principles: none renamed
- Added sections: VII. Kitchen dates are day strings
- Removed sections: none
- Follow-up TODOs: none
-->

# Mise en Place Constitution

## Core Principles

### I. Household-first UX
The product is used in a kitchen, often on a phone. Controls must stay readable, tappable, and unobstructed when the on-screen keyboard is open. Visual chrome (icons, menus, overlays) must never cover the text the user is typing.

### II. Extract what you test
Layout math and other non-UI rules live in small, dependency-free modules so they can be unit-tested without booting the Next.js app. Components consume those modules; they do not inline the rules.

### III. Test-first for behavior changes
When a user-visible bug is fixed, write a failing test that describes the expected geometry or structure first, then change production code until it passes. Do not ship picker/keyboard behavior without automated coverage of the reported failure.

### IV. Keep the planner overlay honest
Modals that sit above the planner must occupy leftover visible space with the sheet itself — including chrome and URL-bar gaps — so more content stays on screen. Do not hide those gaps with a taller or more transparent dimmer. When a keyboard is open, the sheet sits flush with the visible area above the keys; it must not slide under them.

### V. Simplicity
Prefer a flex row over absolute overlays when an icon sits beside an input. Prefer viewport-box math over device-specific hacks. Do not add libraries unless the existing stack cannot express the test.

### VI. No secrets in source
Credentials, API keys, and database connection strings MUST live in the host environment (`POSTGRES_URL`, `ANTHROPIC_API_KEY`, and the like). Source, specs, fixtures, committed examples, and agent environment files MUST NOT contain a live secret or a hardcoded fallback that embeds one. A missing env var MUST fail closed. Pull requests MUST fail a secret scan. Agents MUST leave existing leaks uncopied and MUST NOT reintroduce a convenience fallback.

### VII. Kitchen dates are day strings
A planned dinner day is the calendar label `YYYY-MM-DD`. It MUST stay that string from storage through the planner. It MUST NOT become a weekday name, a clock instant, or a timezone-shifted timestamp. Matching a dinner to a planner cell MUST compare those day strings. Timezone MAY only decide which calendar day is “today.”

## Development Workflow

- Spec Kit artifacts (`specs/<feature>/spec.md`, `plan.md`, `tasks.md`) are the source of intent for the feature.
- Tasks that add tests must be completed before the matching implementation task.
- `npm test` must pass before a picker behavior change is considered done.
- Secret scan (gitleaks on the working tree) MUST pass before a change is considered done.

## Governance

This constitution applies to the whole repository — planner UI, APIs, database access, and deployment config — not only picker overlays. Amendments are recorded in this file with a version bump. A pull request that adds a secret or a secret-bearing fallback is non-compliant even if the feature spec did not mention security.

**Version**: 1.3.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-24
