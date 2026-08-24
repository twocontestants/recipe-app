# Research: Week dock and day tones

## Bottom picker vs replacing the top

- **Decision**: Keep the top week nav. Add a sticky dock at the bottom of `.pl-root`.
- **Rationale**: The cook asked to add a picker at the bottom, not remove the title-row controls.
- **Alternatives considered**: Only bottom (harder to change week before scrolling). Fixed overlay (covers last dinner).

## Sitting above the tab bar

- **Decision**: `position: sticky; bottom: var(--bottom-nav-height, 0px)`.
- **Rationale**: Same token the rail already uses so Later stays above the nav.
- **Alternatives considered**: Extra padding only (picker scrolls away).

## Today / past tones

- **Decision**: Accent and grey on `.pl-recipe-card` inside `.is-today` / `.is-past`. Remove whole-day `opacity: 0.42`.
- **Rationale**: Spec: previous *recipes* grey; headings stay readable. Today accent on the card, not another Today pip (already exists).
- **Alternatives considered**: Keep whole-day fade (hides day names). Strong rust fill (not subtle).
