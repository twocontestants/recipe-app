import { NextRequest, NextResponse } from 'next/server';
import { getMealPlanForWeek, getMealPlansForWeeks, getMealPlansInDateWindow, addToMealPlan, removeFromMealPlan, getRecipeById } from '@/lib/db';
import { parseDayOfWeek } from '@/lib/plannerDays';
import { inferPlannedOn } from '@/lib/plannerDate';
import {
  PLANNER_RANGE_MAX_DAYS,
  inclusiveDayCount,
  isDayIso,
  parseWeekStartList,
} from '@/lib/plannerMonth';
import { isAuthUser, requireUser } from '@/lib/session';
import { canPlanRecipe } from '@/lib/visibility';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (from && to) {
      if (!isDayIso(from) || !isDayIso(to) || from > to) {
        return NextResponse.json({ error: 'from and to must be YYYY-MM-DD with from ≤ to' }, { status: 400 });
      }
      if (inclusiveDayCount(from, to) > PLANNER_RANGE_MAX_DAYS) {
        return NextResponse.json({ error: 'date range is too long' }, { status: 400 });
      }
      const rangePlans = await getMealPlansInDateWindow(from, to, user.id);
      const extraWeeks = parseWeekStartList(searchParams.get('weeks'));
      if (!extraWeeks.length) return NextResponse.json(rangePlans);
      const extraPlans = await getMealPlansForWeeks(extraWeeks, user.id);
      const seen = new Set(rangePlans.map(plan => plan.id));
      return NextResponse.json(rangePlans.concat(extraPlans.filter(plan => !seen.has(plan.id))));
    }

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart or from/to parameters required' }, { status: 400 });
    }

    const plans = await getMealPlanForWeek(weekStart, user.id);
    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const body = await req.json();
    
    if (!body.recipe_id) {
      return NextResponse.json({ error: 'recipe_id is required' }, { status: 400 });
    }

    const recipe = await getRecipeById(body.recipe_id, user.id);
    if (!recipe || !canPlanRecipe(user, recipe)) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const plannedOn = typeof body.planned_on === 'string' && isDayIso(body.planned_on)
      ? body.planned_on
      : body.week_start != null && body.day_of_week !== undefined
        ? inferPlannedOn(String(body.week_start).slice(0, 10), body.day_of_week)
        : null;
    if (!plannedOn) {
      return NextResponse.json(
        { error: 'planned_on or week_start and day_of_week are required' },
        { status: 400 },
      );
    }

    const dayOfWeek = body.day_of_week !== undefined ? parseDayOfWeek(body.day_of_week) : 0;
    if (body.day_of_week !== undefined && dayOfWeek === null) {
      return NextResponse.json(
        { error: 'day_of_week must be 0–6 or a weekday name' },
        { status: 400 }
      );
    }

    const plan = await addToMealPlan({
      planned_on: plannedOn,
      week_start: body.week_start ? String(body.week_start).slice(0, 10) : plannedOn,
      recipe_id: body.recipe_id,
      day_of_week: dayOfWeek ?? 0,
      meal_type: body.meal_type || 'dinner',
      servings: body.servings || 4,
      owner_id: user.id,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
    }

    const deleted = await removeFromMealPlan(id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Meal plan entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
