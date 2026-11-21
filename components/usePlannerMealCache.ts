'use client';

import { useEffect, useRef, useState } from 'react';
import type { MealPlan } from '@/lib/db';
import {
  ensurePlannerMonths,
  loadedPlannerMonthKeys,
  reloadPlannerMonths,
  snapshotPlannerMeals,
  subscribePlannerMeals,
} from '@/lib/plannerMealCache';
import { usePlannerLive } from '@/components/usePlannerLive';

export function usePlannerMealCache(userId?: string | null, prefetchKeys: string[] = []) {
  const [meals, setMeals] = useState<MealPlan[]>(() => snapshotPlannerMeals());
  const prefetchKey = prefetchKeys.join(',');
  const prefetchRef = useRef(prefetchKeys);
  prefetchRef.current = prefetchKeys;

  useEffect(() => subscribePlannerMeals(() => setMeals(snapshotPlannerMeals())), []);

  useEffect(() => {
    const keys = prefetchRef.current;
    if (!userId || !keys.length) return;
    void ensurePlannerMonths(keys).catch(() => { /* keep whatever is already cached */ });
  }, [userId, prefetchKey]);

  const { broadcastPlannerChanged } = usePlannerLive(() => {
    const keys = loadedPlannerMonthKeys();
    const reloadKeys = keys.length ? keys : prefetchRef.current;
    if (!reloadKeys.length) return;
    void reloadPlannerMonths(reloadKeys).catch(() => { /* keep the copy already cached */ });
  }, userId);

  return {
    meals,
    ensureMonths: ensurePlannerMonths,
    reloadMonths: reloadPlannerMonths,
    broadcastPlannerChanged,
  };
}
