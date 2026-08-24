# Contract: Week dock and day tones

## `plannerDayTone(viewingThisWeek, dayIndex, todayIndex) → 'past' | 'today' | 'upcoming'`

Used only for this week. Other weeks are all `upcoming`.

## Week change

Bottom and top both call `setWeekStart(parseLocalIso(shiftWeek(formatDate(weekStart), n)))` with `n` ∈ {-1, 1}. Today sets `startOfDisplayWeek(now, weekStartsOn)`.

## CSS classes

- `.pl-week-dock` — sticky week controls
- `.pl-day.is-today .pl-recipe-card` — accent
- `.pl-day.is-past .pl-recipe-card` — grey
