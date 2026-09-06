# Feature Specification: Analytics and Insights tab

**Feature Branch**: `016-analytics-insights`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "Help me plan for an Analytics and insights tab. Make it good with charts and stuff."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Insights and read the kitchen pulse (Priority: P1)

A signed-in cook opens **Insights** from the same kitchen navigation as Planner, Shopping, and Settings. The page immediately shows a pulse of their own cooking: how many dinners they planned in the selected range, how many nights had a dinner, how many distinct recipes they cooked, and their current streak of consecutive days with a dinner. Numbers are large, labelled in plain language, and readable on a phone held in one hand.

**Why this priority**: Without a signed-in tab and a first glance at “how am I cooking?”, there is no feature. This is the MVP.

**Independent Test**: Sign in as a cook with several planned dinners. Open Insights. Confirm the four headline numbers match that cook’s planner (not another cook’s). Sign out: Insights is gone from navigation. Sign in as a second cook with an empty planner: they see an empty kitchen, not the first cook’s numbers.

**Acceptance Scenarios**:

1. **Given** a signed-in cook, **When** they look at kitchen navigation, **Then** Insights appears with Planner, Shopping, and Settings, and is distinct from Recipes.
2. **Given** a guest (not signed in), **When** they look at navigation or visit Insights directly, **Then** they do not see Insights in the nav and are asked to sign in instead of seeing any kitchen numbers.
3. **Given** cook A with planned dinners and cook B with none, **When** each opens Insights, **Then** A sees A’s counts and B sees an empty kitchen — never the other cook’s data.
4. **Given** a cook with planned dinners in the default range, **When** Insights finishes loading, **Then** they can read dinners planned, nights with a dinner, distinct recipes cooked, and current dinner streak without scrolling past the first screen on a phone.
5. **Given** a cook whose planner has no dinners in the selected range, **When** they open Insights, **Then** they see a calm empty state that explains there is nothing to chart yet and offers a way to the Planner — not a blank page or broken charts.

---

### User Story 2 - See cooking as charts, not a spreadsheet (Priority: P1)

The same cook scrolls a little and sees charts that make the pulse visual. A **weekly cadence** chart shows how many dinners they planned in each kitchen week of the range (bars rise and fall). A **protein mix** chart shows how those dinners split across chicken, fish, vegetables, and the rest of the kitchen’s protein vocabulary. Both charts use the product’s existing look (cream page, rust and sage accents, readable type) and stay usable on a phone: labels are not tiny, bars can be read without hovering, and nothing is covered by the bottom tab bar.

Tapping a week on the cadence chart takes them to that week on the Planner. Tapping a protein slice highlights that protein’s count in words.

**Why this priority**: The request is specifically for a tab that is “good with charts.” Cadence and mix are the two charts that turn existing planner data into something a cook can use.

**Independent Test**: Plan dinners across several weeks with mixed proteins. Open Insights. Confirm the cadence bars match dinners-per-week and the mix matches those dinners’ main proteins. Rotate or shrink to a phone-width view: charts remain readable and the tab bar does not cover them.

**Acceptance Scenarios**:

1. **Given** dinners planned across at least four kitchen weeks, **When** the cook views Insights, **Then** the cadence chart shows one bar per kitchen week in the range, with height matching the dinner count for that week (including weeks with zero).
2. **Given** dinners whose recipes have known main proteins (and some without), **When** the cook views the protein mix, **Then** each known protein has a share that matches those dinners, and unknown/unlabelled mains are grouped as “Unlabelled” rather than omitted silently.
3. **Given** a phone-width kitchen, **When** the cook scrolls Insights, **Then** chart titles, axis labels, and values stay readable without pinch-zoom, and the bottom navigation does not cover the charts or their labels.
4. **Given** the cadence chart, **When** the cook taps a week’s bar, **Then** they land on the Planner showing that kitchen week.
5. **Given** the protein mix, **When** the cook taps a slice or row, **Then** they see that protein’s dinner count and share in words (for example “Fish · 4 dinners · 18%”).
6. **Given** two cooks, **When** each views charts, **Then** only their own planned dinners appear.

---

### User Story 3 - Read written insights and a favourites ranking (Priority: P2)

Below the charts, the cook gets a short stack of **insight cards** — one-sentence observations the kitchen can actually act on — and a **most-cooked** ranking of recipes in the range. Insights include variety (a protein that dominates, a protein that has been missing), repeats (the dish they keep putting on the plan), and neglect (a recipe they rated highly that has not been on the plan lately). Each insight is true for this cook and this range. Tapping a named recipe opens that recipe.

**Why this priority**: Charts show shape; sentences tell the cook what to do next week. Favourites make the tab feel like a magazine spread, not a dashboard dump.

**Independent Test**: Seed a planner where chicken is most dinners, fish has not appeared for more than two weeks, one recipe appears three times, and a five-star recipe has not been planned in the range. Open Insights and confirm those four facts appear as cards/ranking. Tap the favourite: the recipe opens.

**Acceptance Scenarios**:

1. **Given** one protein is at least a third of dinners in the range, **When** the cook reads insight cards, **Then** one card names that protein and its share.
2. **Given** a protein in the kitchen vocabulary that has zero dinners in the range but the cook has cooked it before (or it is a common main they have recipes for), **When** there is a clear gap of at least two kitchen weeks, **Then** a card names the missing protein and how long it has been.
3. **Given** recipes planned more than once in the range, **When** the cook looks at most-cooked, **Then** recipes are ordered by how many times they were planned, with the count shown, and ties are stable.
4. **Given** a recipe the cook rated highly (4 or 5) that was not planned in the selected range, **When** insight cards are shown, **Then** one card suggests that recipe by name.
5. **Given** a named recipe on a card or in the ranking, **When** the cook taps it, **Then** that recipe’s page opens.
6. **Given** nothing interesting to say (one dinner, no ratings, no repeats), **When** the cook scrolls past charts, **Then** they see a short “not enough history yet” note rather than filler or invented advice.

---

### User Story 4 - Change the window they are looking at (Priority: P2)

The cook can switch the time window without leaving Insights. Presets are: **This week**, **Last 4 weeks**, **Last 12 weeks** (the default), and **All time**. Weeks follow that cook’s week-start setting (Sunday vs Monday kitchen). The pulse, charts, insights, and ranking all update together. The current week includes dinners already on the plan for days still ahead — the cook is looking at the kitchen they are running, not only the past.

**Why this priority**: Twelve weeks is a useful default, but a cook checking this week or looking back over a year needs the same tab.

**Independent Test**: With dinners in the current week, a month ago, and many months ago, switch each preset and confirm counts and charts change to match. Change week-start in Settings, return to Insights: week buckets follow the new start day.

**Acceptance Scenarios**:

1. **Given** Insights on the default range, **When** the page loads, **Then** the selected preset is Last 12 weeks and the cadence chart covers those twelve kitchen weeks.
2. **Given** dinners this week including a day still in the future, **When** the cook chooses This week, **Then** those future dinners count.
3. **Given** Last 4 weeks vs Last 12 weeks, **When** the cook switches, **Then** every number and chart on the page updates to that window in one view — no leftover figures from the previous preset.
4. **Given** All time, **When** the cook has planner history older than 12 weeks, **Then** that history is included in counts, mix, ranking, and cadence (cadence may group by week for the whole history).
5. **Given** the cook’s week starts on Sunday (or Monday), **When** they view weekly cadence, **Then** each bar is that kitchen week, not a fixed Monday–Sunday week that disagrees with the Planner.
6. **Given** a preset with no dinners, **When** the cook selects it, **Then** they see the empty state for that window, and switching back to a window with data restores charts.

---

### Edge Cases

- Deleted recipe that is still on the plan: it still counts as a dinner on that day; ranking shows a fallback title if the recipe is gone; tapping it does not open a missing page (the row is not a link, or it explains the recipe is unavailable).
- Public recipe on this cook’s planner: it counts as this cook’s cooking. It does not appear on the recipe owner’s Insights.
- Several dinners on the same kitchen day (unusual): the night still counts as one “night with a dinner”; each dinner counts in dinners planned, protein mix, and ranking.
- Breakfast or lunch on the plan: they do not inflate dinner cadence or dinner streak. They MAY appear in a small “other meals” note if any exist; they are not a second dashboard in this feature.
- Recipe with no main protein: grouped as Unlabelled in the mix; it still counts as a dinner.
- Range that includes today: “current streak” counts consecutive kitchen days with a dinner ending on the most recent past-or-today day that has one, and does not break only because tomorrow is empty.
- Very long All time history: the page still returns; cadence remains a weekly chart (not one bar per day).
- Slow or failed load: the cook sees a loading state, then a retry-friendly error, not a half-drawn chart with the wrong cook’s leftover numbers.
- Bottom tab bar and on-screen keyboard: Insights has no search field in the first version; charts must remain above the tab bar while scrolling.
- Guest bookmark of `/insights`: sign-in, then Insights for that account (or empty if they have no kitchen history).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Signed-in cooks MUST have an Insights item in kitchen navigation alongside Planner, Shopping, and Settings. Guests MUST NOT see it.
- **FR-002**: Direct visits to Insights while signed out MUST prompt sign-in and MUST NOT reveal any kitchen analytics.
- **FR-003**: All Insights figures MUST be computed only from the signed-in cook’s private kitchen (their planned meals, their ratings, their recipes). Cook A MUST NEVER see cook B’s analytics.
- **FR-004**: The default window MUST be the last 12 kitchen weeks through the end of the current kitchen week (including upcoming dinners already on the plan).
- **FR-005**: The cook MUST be able to switch among This week, Last 4 weeks, Last 12 weeks, and All time. Changing the window MUST refresh pulse, charts, insight cards, and ranking together.
- **FR-006**: Kitchen weeks MUST follow that cook’s week-start setting. Cadence bars MUST be those weeks. Day identity MUST stay the calendar label of the planned dinner (not a weekday name or a clock time).
- **FR-007**: The pulse MUST show, for the selected window: number of dinners planned, number of distinct kitchen days that have at least one dinner, number of distinct recipes among those dinners, and current consecutive-day dinner streak.
- **FR-008**: Insights MUST show a weekly cadence chart of dinner counts per kitchen week in the window, including weeks with zero dinners.
- **FR-009**: Insights MUST show a protein-mix chart of dinners in the window, using each recipe’s main protein, with an Unlabelled group when none is set.
- **FR-010**: Charts MUST remain readable on a phone without hovering or pinch-zoom. Values MUST be available as visible labels or as a tap that reveals the number. The bottom kitchen navigation MUST NOT cover chart content.
- **FR-011**: Tapping a cadence week MUST open the Planner on that kitchen week.
- **FR-012**: Insights MUST show a most-cooked ranking (recipe name and times planned) for dinners in the window.
- **FR-013**: Insights MUST show up to a small handful of factual insight cards derived from the window (dominant protein, missing protein after a gap, most-repeated dish, highly rated recipe not planned in the window). Cards MUST NOT invent nutrition, spend, or health advice. If no card qualifies, the section says there is not enough history yet.
- **FR-014**: Tapping a still-available recipe in ranking or cards MUST open that recipe. Unavailable (deleted) recipes MUST NOT pretend to open.
- **FR-015**: Dinner-centric metrics MUST ignore breakfast/lunch/other meal types. Those other meals MUST NOT appear as extra cadence bars.
- **FR-016**: Empty windows MUST use an empty state with a path to the Planner rather than empty axes or placeholder “lorem” insights.
- **FR-017**: Loading and failure MUST be explicit. A failed load MUST NOT display another cook’s or a previous window’s figures.
- **FR-018**: This feature MUST NOT collect new kitchen facts (no calorie logging, no grocery spend, no weigh-ins). It only summarises data the cook already has.

### Key Entities

- **Insights page**: The signed-in cook’s analytics tab. One window of time, one pulse, two charts, optional insight cards, and a most-cooked ranking.
- **Kitchen window**: A closed range of kitchen days selected by a preset (this week, 4 weeks, 12 weeks, all time), aligned to the cook’s week-start.
- **Dinner**: A planned meal whose meal type is dinner. The unit of cadence, mix, streak, and ranking.
- **Kitchen week**: Seven consecutive kitchen days starting on the cook’s week-start day. One cadence bar.
- **Dinner streak**: Count of consecutive kitchen days, ending on the latest past-or-today day that has a dinner, each of which has at least one dinner.
- **Protein share**: How dinners in the window split across the kitchen’s main-protein vocabulary, plus Unlabelled.
- **Insight card**: A short, checkable sentence about this cook’s window (mix, gap, repeat, or neglected high rating).
- **Most-cooked entry**: A recipe and how many times it was planned as dinner in the window.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in cook with a populated planner can open Insights and read the four pulse numbers correctly (they match a manual count of that window) in under 15 seconds from tapping Insights.
- **SC-002**: On a phone-width kitchen, both charts are fully readable without pinch-zoom: week labels or an equivalent tap, dinner counts, and protein names/shares can be determined in one sitting.
- **SC-003**: 100% of Insights visits by a guest result in a sign-in prompt and zero kitchen figures leaked.
- **SC-004**: In a two-account check, zero of cook A’s dinners, ratings, or recipe names appear on cook B’s Insights.
- **SC-005**: Switching presets updates every visible figure to the new window; a reviewer can spot no leftover number from the previous preset.
- **SC-006**: Tapping a cadence week lands on that week in the Planner; tapping an available favourite opens that recipe — each in one action.
- **SC-007**: At least 9 in 10 insight cards shown in a fixture kitchen with known mix/repeats/ratings are factually true for that fixture (no fabricated nutrition or spend).
- **SC-008**: A cook with no dinners in the window reaches Planner from the empty state in one action.

## Assumptions

- Nav label is **Insights** (short enough for the phone tab bar). Page heading may say “Analytics & Insights.”
- Default window is last 12 kitchen weeks including the current week, because a season of cooking is more useful than a single week and still chartable.
- The household already plans dinners as the primary meal; breakfast/lunch are rare and stay out of the main charts.
- Main protein is the recipe’s existing primary-protein field (chicken, beef, fish, and the rest of today’s vocabulary), not a new tagging exercise.
- “Cooked” means “planned as dinner on a kitchen day.” The app does not know whether the household actually ate it.
- Highly rated means that cook’s personal 4 or 5 stars.
- At most four insight cards, so the page does not become a feed.
- All time means the cook’s full planner history, presented as weekly cadence (not daily).
- No export, no sharing Insights with another cook, no public leaderboard, no calorie or cost tracking in this feature.
- Visual language stays the existing editorial kitchen (cream, ink, rust, sage) rather than a generic analytics theme.
- Constitution household-first rules apply: tappable controls, no chrome covering labels, phone tab bar respected.
- Existing sign-in, ownership, and kitchen-day rules are reused; this feature does not change how dinners are stored.
