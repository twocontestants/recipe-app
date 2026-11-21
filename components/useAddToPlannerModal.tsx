'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MealPlan, Recipe } from '@/lib/db';
import { showToast } from '@/components/Toast';
import AddToPlannerModal, { type PlannedMeal } from '@/components/AddToPlannerModal';
import { usePlannerMealCache } from '@/components/usePlannerMealCache';
import { weekPlanFromMeals } from '@/lib/plannerDaySheet';
import {
  calendarDateOf,
  displayDayIndex,
  getThisDisplayWeek,
  localDateIso,
  parseWeekStartDay,
  shiftWeek,
  storageCoords,
  type DayKey,
} from '@/lib/plannerDays';
import { adjacentMonthKeys, monthsForDisplayWeek } from '@/lib/plannerMonth';
import {
  dinnerAddFailedMessage,
  dinnerAddedMessage,
  plannerDinnerPayload,
  postPlannerDinner,
  type PlannerDinnerPayload,
} from '@/lib/plannerWrite';
import { removePlannerMeal, upsertPlannerMeal } from '@/lib/plannerMealCache';

export function useAddToPlannerModal(userId?: string | null) {
  const [plannerModal, setPlannerModal] = useState<{ recipe: Recipe } | null>(null);
  const [weekStartsOn, setWeekStartsOn] = useState<DayKey>('monday');
  const [plannerWeek, setPlannerWeek] = useState(() => getThisDisplayWeek('monday'));
  const [plannerDay, setPlannerDay] = useState(() => displayDayIndex(new Date(), 'monday'));
  const [weekPlan, setWeekPlan] = useState<Record<number, PlannedMeal[]>>({});
  const weekStartsOnRef = useRef(weekStartsOn);
  weekStartsOnRef.current = weekStartsOn;
  const plannerModalRef = useRef(plannerModal);
  plannerModalRef.current = plannerModal;

  const prefetchKeys = useMemo(() => {
    const current = monthsForDisplayWeek(plannerWeek);
    if (!plannerModal) return current;
    const keys = new Set(current);
    for (const key of current) {
      for (const neighbour of adjacentMonthKeys(key)) keys.add(neighbour);
    }
    return [...keys];
  }, [plannerModal, plannerWeek]);

  const { meals, ensureMonths, broadcastPlannerChanged } = usePlannerMealCache(userId, prefetchKeys);

  const applyWeekPlan = (week: string, plans: unknown[]) => {
    setWeekPlan(weekPlanFromMeals(plans, week, weekStartsOnRef.current));
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/preferences');
        if (!res.ok) return;
        const d = await res.json();
        const day = parseWeekStartDay(d.weekStartDay);
        setWeekStartsOn(day);
        setPlannerWeek(getThisDisplayWeek(day));
        setPlannerDay(displayDayIndex(new Date(), day));
      } catch { /* Monday default */ }
    })();
  }, []);

  useEffect(() => {
    if (!plannerModal) return;
    applyWeekPlan(plannerWeek, meals);
  }, [plannerModal, plannerWeek, weekStartsOn, meals]);

  useEffect(() => {
    if (!plannerModal) return;
    void ensureMonths(monthsForDisplayWeek(plannerWeek)).catch(() => { /* keep cached occupancy */ });
  }, [plannerModal, plannerWeek, weekStartsOn, ensureMonths]);

  const persistDinner = async (
    payload: PlannerDinnerPayload,
    successMessage: string,
    tempId: string,
    recipe: Recipe,
  ) => {
    try {
      const saved = await postPlannerDinner(payload);
      removePlannerMeal(tempId);
      const real = { ...payload, ...saved, recipe } as MealPlan;
      if (!real.id) real.id = tempId;
      upsertPlannerMeal(real);
      broadcastPlannerChanged();
    } catch (e) {
      removePlannerMeal(tempId);
      const detail = e instanceof Error ? e.message : 'Unknown error';
      showToast(dinnerAddFailedMessage(detail), 'error', {
        label: 'Retry',
        onClick: () => {
          showToast(successMessage, 'success');
          upsertPlannerMeal({
            ...payload,
            id: tempId,
            recipe,
          } as MealPlan);
          void persistDinner(payload, successMessage, tempId, recipe);
        },
      });
    }
  };

  const handleAddToPlanner = () => {
    const modal = plannerModalRef.current;
    if (!modal) return;
    plannerModalRef.current = null;
    const date = calendarDateOf(plannerWeek, plannerDay);
    const coords = storageCoords(date);
    const payload = plannerDinnerPayload({
      plannedOn: localDateIso(date),
      weekStart: coords.weekStart,
      dayOfWeek: coords.dayOfWeek,
      recipeId: modal.recipe.id,
      servings: modal.recipe.servings || 4,
    });
    const successMessage = dinnerAddedMessage(date);
    const tempId = `tmp-${Date.now()}`;
    upsertPlannerMeal({
      ...payload,
      id: tempId,
      recipe: modal.recipe,
    } as MealPlan);
    setPlannerModal(null);
    showToast(successMessage, 'success');
    void persistDinner(payload, successMessage, tempId, modal.recipe);
  };

  const openPlannerModal = (recipe: Recipe) => {
    const week = getThisDisplayWeek(weekStartsOn);
    setPlannerWeek(week);
    setPlannerDay(displayDayIndex(new Date(), weekStartsOn));
    applyWeekPlan(week, meals);
    setPlannerModal({ recipe });
  };

  const plannerModalJsx = plannerModal && (
    <AddToPlannerModal
      recipeTitle={plannerModal.recipe.title}
      weekStart={plannerWeek}
      selectedDay={plannerDay}
      weekPlan={weekPlan}
      adding={false}
      onClose={() => setPlannerModal(null)}
      onShiftWeek={weeks => {
        const next = shiftWeek(plannerWeek, weeks);
        setPlannerWeek(next);
        applyWeekPlan(next, meals);
      }}
      onSelectDay={setPlannerDay}
      onAdd={handleAddToPlanner}
      weekStartsOn={weekStartsOn}
    />
  );

  return { openPlannerModal, plannerModalJsx };
}
