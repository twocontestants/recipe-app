export type PlannerDinnerPayload = {
  planned_on: string;
  week_start: string;
  day_of_week: number;
  meal_type: 'dinner';
  recipe_id: string;
  servings: number;
};

export function plannerDinnerPayload(opts: {
  plannedOn: string;
  weekStart: string;
  dayOfWeek: number;
  recipeId: string;
  servings?: number;
}): PlannerDinnerPayload {
  return {
    planned_on: opts.plannedOn,
    week_start: opts.weekStart,
    day_of_week: opts.dayOfWeek,
    meal_type: 'dinner',
    recipe_id: opts.recipeId,
    servings: opts.servings || 4,
  };
}

export function dinnerAddedMessage(date: Date, locale = 'en-AU'): string {
  const dayLabel = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  return `Dinner added for ${dayLabel}`;
}

export function dinnerAddFailedMessage(detail: string): string {
  const trimmed = detail.trim();
  return trimmed ? `Couldn't add dinner — ${trimmed}` : "Couldn't add dinner";
}

/** Parse an API error without throwing when the body is HTML or empty. */
export async function readResponseError(res: Response, fallback = 'Unknown error'): Promise<string> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    return res.statusText || fallback;
  }
  if (!text.trim()) return res.statusText || fallback;
  try {
    const data = JSON.parse(text) as { error?: unknown; message?: unknown };
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
  } catch {
    // HTML/plain 500 pages used to surface as `Unexpected token '<'` in the console.
  }
  return res.statusText || fallback;
}

export async function postPlannerDinner(payload: PlannerDinnerPayload): Promise<Record<string, unknown>> {
  const res = await fetch('/api/planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readResponseError(res, 'Failed to add dinner'));
  try {
    const data = await res.json();
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>;
  } catch {
    // Persist succeeded; caller can keep the optimistic row.
  }
  return {};
}
