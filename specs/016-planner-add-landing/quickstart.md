# Quickstart: Planner add landing

## Automated

```bash
npm test
```

Expect `lib/plannerAddLanding.test.ts` to cover class matching, week reveal, persist-id swap, and scroll options. Expect `app/planner/PlannerClient.test.tsx` to close the selector before a slow POST resolves and to put `is-landing` on the new dinner.

## Manual

1. Open `/planner` on an empty day this week. Tap **Add dinner**.
2. Tap a recipe. The selector should vanish at once. That day’s new card should settle into place (soft motion + brief ring).
3. Open Add dinner on Monday. Use a row’s three-dot **Add to…** and pick Friday. Friday’s new card should land; Monday should not.
4. From **Another date…**, pick a day in a later week. The planner should show that week and land the new dinner there.
5. With reduced motion enabled, add again: selector still closes; the new card is marked without sliding or bouncing.
6. Repeat an add with the network blocked: the card appears, then disappears with an error, and no highlight remains.
