# Implementation Plan: Planner week dock and day tones

**Branch**: `cursor/planner-week-dock-4c97` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-planner-week-dock/spec.md`

## Summary

Duplicate the existing week prev/next/Today controls in a sticky dock at the bottom of the planner, above `--bottom-nav-height`. Tone recipe cards: rust wash for today, parchment/grey for earlier days this week. Stop fading the whole past day block so headings stay readable. Extract `plannerDayTone` for tests.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14

**Primary Dependencies**: Existing `shiftWeek`, `formatWeekLabel`, `PlannerClient.tsx`

**Storage**: None

**Testing**: Vitest for `plannerDayTone`

**Target Platform**: Household web app, phone tab bar

**Project Type**: Web application

**Performance Goals**: Same planner scroll

**Constraints**: Constitution I (tappable, above tab bar), II (extract tone math), V (no new UI library), VII (today is local calendar day)

**Scale/Scope**: One page, CSS + small helper

## Constitution Check

- I: dock above tab bar; large enough prev/next.
- II: `plannerDayTone` in `lib/plannerDays.ts`.
- III: tests for tone before CSS wiring.
- IV: N/A (no overlay).
- V: reuse existing week buttons; sticky, not a new sheet.
- VII: today/past from local `displayDayIndex`, not UTC.

## Project Structure

```text
specs/010-planner-week-dock/
lib/plannerDays.ts
lib/plannerDays.test.ts
app/planner/PlannerClient.tsx
```

## Complexity Tracking

No violations.
