'use client';

import { useEffect, useRef, useState } from 'react';
import type { Recipe } from '@/lib/db';
import { showToast } from '@/components/Toast';
import AddToPlannerModal, { type PlannedMeal } from '@/components/AddToPlannerModal';
import { usePlannerLive } from '@/components/usePlannerLive';
import { weekPlanFromMeals } from '@/lib/plannerDaySheet';
import { fetchMealsForMonths, fetchMealsForWeeks } from '@/lib/loadPlannerMonth';
import {
  calendarDateOf,
  displayDayIndex,
  getThisDisplayWeek,
  localDateIso,
  parseWeekStartDay,
  shiftWeek,
  storageCoords,
  storageWeeksForDisplayWeek,
  type DayKey,
} from '@/lib/plannerDays';
import { missingMonths, monthsForDisplayWeek } from '@/lib/plannerMonth';
import {
  dinnerAddFailedMessage,
  dinnerAddedMessage,
  plannerDinnerPayload,
  postPlannerDinner,
  type PlannerDinnerPayload,
} from '@/lib/plannerWrite';

export function useAddToPlannerModal(userId?: string | null) {
  const [plannerModal, setPlannerModal] = useState<{ recipe: Recipe } | null>(null);
  const [weekStartsOn, setWeekStartsOn] = useState<DayKey>('monday');
  const [plannerWeek, setPlannerWeek] = useState(() => getThisDisplayWeek('monday'));
  const [plannerDay, setPlannerDay] = useState(() => displayDayIndex(new Date(), 'monday'));
  const [weekPlan, setWeekPlan] = useState<Record<number, PlannedMeal[]>>({});
  const mealStoreRef = useRef(new Map<string, unknown>());
  const loadedMonthsRef = useRef(new Set<string>());
  const plannerWeekRef = useRef(plannerWeek);
  plannerWeekRef.current = plannerWeek;
  const weekStartsOnRef = useRef(weekStartsOn);
  weekStartsOnRef.current = weekStartsOn;
  const plannerModalRef = useRef(plannerModal);
  plannerModalRef.current = plannerModal;

  const snapshotMeals = () => [...mealStoreRef.current.values()];

  const applyWeekPlan = (week: string, meals: unknown[]) => {
    setWeekPlan(weekPlanFromMeals(meals, week, weekStartsOnRef.current));
  };

  const ensureMonths = async (keys: string[]): Promise<unknown[]> => {
    const needed = missingMonths(keys, loadedMonthsRef.current);
    if (needed.length) {
      const meals = await fetchMealsForMonths(needed);
      if (!meals.length) return snapshotMeals();
      for (const meal of meals) {
        if (meal && typeof meal === 'object' && 'id' in meal) {
          mealStoreRef.current.set(String((meal as { id: string }).id), meal);
        }
      }
      for (const key of needed) loadedMonthsRef.current.add(key);
    }
    return snapshotMeals();
  };

  const reloadPlannerCopy = async () => {
    if (!plannerModalRef.current) return;
    try {
      loadedMonthsRef.current.clear();
      await ensureMonths(monthsForDisplayWeek(plannerWeekRef.current));
      const weekMeals = await fetchMealsForWeeks(
        storageWeeksForDisplayWeek(plannerWeekRef.current, weekStartsOnRef.current),
      );
      for (const meal of weekMeals) {
        if (meal && typeof meal === 'object' && 'id' in meal) {
          mealStoreRef.current.set(String((meal as { id: string }).id), meal);
        }
      }
      applyWeekPlan(plannerWeekRef.current, snapshotMeals());
    } catch { /* keep current sheet copy */ }
  };

  const { broadcastPlannerChanged } = usePlannerLive(() => { void reloadPlannerCopy(); }, userId);

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

  const fetchWeekPlan = async (week: string) => {
    try {
      await ensureMonths(monthsForDisplayWeek(week));
      const weekMeals = await fetchMealsForWeeks(storageWeeksForDisplayWeek(week, weekStartsOnRef.current));
      for (const meal of weekMeals) {
        if (meal && typeof meal === 'object' && 'id' in meal) {
          mealStoreRef.current.set(String((meal as { id: string }).id), meal);
        }
      }
      applyWeekPlan(week, snapshotMeals());
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (plannerModal) void fetchWeekPlan(plannerWeek);
  }, [plannerModal, plannerWeek, weekStartsOn]);

  const persistDinner = async (payload: PlannerDinnerPayload, successMessage: string) => {
    try {
      await postPlannerDinner(payload);
      broadcastPlannerChanged();
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Unknown error';
      showToast(dinnerAddFailedMessage(detail), 'error', {
        label: 'Retry',
        onClick: () => {
          showToast(successMessage, 'success');
          void persistDinner(payload, successMessage);
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
    setPlannerModal(null);
    showToast(successMessage, 'success');
    void persistDinner(payload, successMessage);
  };

  const openPlannerModal = (recipe: Recipe) => {
    setPlannerWeek(getThisDisplayWeek(weekStartsOn));
    setPlannerDay(displayDayIndex(new Date(), weekStartsOn));
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
      onShiftWeek={weeks => setPlannerWeek(shiftWeek(plannerWeek, weeks))}
      onSelectDay={setPlannerDay}
      onAdd={handleAddToPlanner}
      weekStartsOn={weekStartsOn}
    />
  );

  return { openPlannerModal, plannerModalJsx };
}
