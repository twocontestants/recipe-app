import { NextRequest, NextResponse } from 'next/server';
import { getMealPlanForWeek, getShoppingListEdits, saveShoppingListEdits } from '@/lib/db';
import { generateShoppingList } from '@/lib/shopping';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart parameter required' }, { status: 400 });
    }

    const [plans, edits] = await Promise.all([
      getMealPlanForWeek(weekStart),
      getShoppingListEdits(weekStart),
    ]);
    const shoppingList = generateShoppingList(plans);

    return NextResponse.json({
      items: shoppingList,
      mealCount: plans.length,
      edits: edits ?? {
        item_overrides: {},
        custom_items: [],
        category_labels: {},
        category_order: [],
        item_order: {},
        checked_state: {},
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart parameter required' }, { status: 400 });
    }

    const body = await req.json();
    await saveShoppingListEdits(weekStart, {
      item_overrides:  body.item_overrides  ?? {},
      custom_items:    body.custom_items    ?? [],
      category_labels: body.category_labels ?? {},
      category_order:  body.category_order  ?? [],
      item_order:      body.item_order      ?? {},
      checked_state:   body.checked_state   ?? {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
