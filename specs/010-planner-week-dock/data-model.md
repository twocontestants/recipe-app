# Data model: Day tone

No database change.

## `plannerDayTone(viewingThisWeek, dayIndex, todayIndex)`

| viewingThisWeek | dayIndex vs todayIndex | Tone |
|-----------------|------------------------|------|
| false | any | `upcoming` |
| true | equal | `today` |
| true | less | `past` |
| true | greater | `upcoming` |

`todayIndex` is `displayDayIndex` of the cook’s local now. Kitchen day strings unchanged (009).
