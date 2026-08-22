'use client';

import type { DayKey } from '@/lib/plannerDays';
import PlannerDaySheet, {
  plannerDaySheetCss,
  type PlannedMeal,
} from './PlannerDaySheet';

export type { PlannedMeal };

export interface AddToPlannerModalProps {
  recipeTitle: string;
  weekStart: string;
  selectedDay: number;
  weekPlan: Record<number, PlannedMeal[]>;
  adding: boolean;
  onClose: () => void;
  onShiftWeek: (weeks: number) => void;
  onSelectDay: (dayIndex: number) => void;
  onAdd: () => void;
  weekStartsOn?: DayKey;
}

export default function AddToPlannerModal({
  recipeTitle,
  weekStart,
  selectedDay,
  weekPlan,
  adding,
  onClose,
  onShiftWeek,
  onSelectDay,
  onAdd,
  weekStartsOn = 'monday',
}: AddToPlannerModalProps) {
  return (
    <PlannerDaySheet
      title="Add to planner"
      recipeTitle={recipeTitle}
      confirmVerb="Add dinner"
      weekStart={weekStart}
      selectedDay={selectedDay}
      weekPlan={weekPlan}
      confirming={adding}
      onClose={onClose}
      onShiftWeek={onShiftWeek}
      onSelectDay={onSelectDay}
      onConfirm={onAdd}
      weekStartsOn={weekStartsOn}
    />
  );
}

export const addToPlannerModalCss = plannerDaySheetCss;
