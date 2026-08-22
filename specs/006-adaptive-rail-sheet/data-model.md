# Data model: Rail window and week cache

No new persisted tables.

## Rail window

| Field | Meaning |
|-------|---------|
| `originIso` | Held dinner’s local calendar date |
| `count` | Numbered days (odd, ≥5, ≤11) |
| `days` | `origin - floor((count-1)/2)` … that many days |
| `viewportHeight` | Height used to choose `count` |

## Display week

| Field | Meaning |
|-------|---------|
| `weekStart` | `localDateIso(startOfDisplayWeek(...))` |
| `selectedDay` | 0–6 in household order |

Shifting adds or subtracts seven **local** calendar days.

## Storage week cache

| Field | Meaning |
|-------|---------|
| `weekStart` | API / `storageCoords().weekStart` (`formatWeekStart`) |
| `meals` | Dinners returned for that key |
| `status` | present or missing |

Invalidate the origin and destination storage weeks after a successful write.

## Validation

- Rail `count` is odd so the origin stays centred.
- Sheet day `i` occupancy uses the calendar date `dayDateOf(weekStart, i)`, not a reconstructed UTC date.
- Cache miss ⇒ fetch; cache hit ⇒ reuse; write ⇒ delete those keys.
