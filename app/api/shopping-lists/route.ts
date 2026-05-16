import { NextRequest, NextResponse } from 'next/server';
import {
  getAllShoppingLists, createShoppingList, updateShoppingListEdits,
  deleteShoppingList, getShoppingListById, getMealPlanForWeek
} from '@/lib/db';
import { generateShoppingList } from '@/lib/shopping';

// GET /api/shopping-lists — list all, or ?id=X for one with items
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const list = await getShoppingListById(id);
      if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      // Generate items from the recipe_ids across all week_starts
      let allPlans: any[] = [];
      for (const weekStart of list.week_starts) {
        const plans = await getMealPlanForWeek(weekStart);
        allPlans = allPlans.concat(plans);
      }
      // Filter to only included recipe_ids
      const filtered = allPlans.filter(p => list.recipe_ids.includes(p.recipe_id));
      const items = generateShoppingList(filtered);

      return NextResponse.json({ ...list, items });
    }
    const lists = await getAllShoppingLists();
    return NextResponse.json(lists);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/shopping-lists — create new list
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, subtitle, week_starts, recipe_ids } = body;
    if (!name || !recipe_ids?.length) {
      return NextResponse.json({ error: 'name and recipe_ids required' }, { status: 400 });
    }
    const list = await createShoppingList({ name, subtitle: subtitle ?? '', week_starts: week_starts ?? [], recipe_ids });
    return NextResponse.json(list, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/shopping-lists?id=X — update edits/checked/subtitle
export async function PUT(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const body = await req.json();
    await updateShoppingListEdits(id, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/shopping-lists?id=X
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await deleteShoppingList(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
