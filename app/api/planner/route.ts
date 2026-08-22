import { NextRequest, NextResponse } from 'next/server';
import { getMealPlanForWeek, addToMealPlan, removeFromMealPlan } from '@/lib/db';
import { parseDayOfWeek } from '@/lib/plannerDays';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');
    
    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart parameter required' }, { status: 400 });
    }

    const plans = await getMealPlanForWeek(weekStart);
    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.week_start || !body.recipe_id || body.day_of_week === undefined) {
      return NextResponse.json(
        { error: 'week_start, recipe_id, and day_of_week are required' },
        { status: 400 }
      );
    }

    const dayOfWeek = parseDayOfWeek(body.day_of_week);
    if (dayOfWeek === null) {
      return NextResponse.json(
        { error: 'day_of_week must be 0–6 or a weekday name' },
        { status: 400 }
      );
    }

    const plan = await addToMealPlan({
      week_start: body.week_start,
      recipe_id: body.recipe_id,
      day_of_week: dayOfWeek,
      meal_type: body.meal_type || 'dinner',
      servings: body.servings || 4,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
    }

    const deleted = await removeFromMealPlan(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Meal plan entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
