import { NextRequest, NextResponse } from 'next/server';
import {
  getAllShoppingLists, createShoppingList, updateShoppingListEdits,
  deleteShoppingList, getShoppingListById, getMealPlanForWeek, applyShoppingListOps
} from '@/lib/db';
import { generateShoppingList } from '@/lib/shopping';
import type { ShoppingOp } from '@/lib/shoppingOps';

// GET /api/shopping-lists — list all, or ?id=X for one with items
export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const list = await getShoppingListById(id);
      if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      // Items were snapshotted at creation — serve them directly, no regeneration
      return NextResponse.json(list);
    }
    const lists = await getAllShoppingLists();
    return NextResponse.json(lists);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/shopping-lists — create new list, snapshot items at this moment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, subtitle, week_starts, recipe_ids } = body;
    if (!name || !recipe_ids?.length) {
      return NextResponse.json({ error: 'name and recipe_ids required' }, { status: 400 });
    }

    // Generate and snapshot items now, from the current meal plans
    let allPlans: any[] = [];
    for (const weekStart of (week_starts ?? [])) {
      const plans = await getMealPlanForWeek(weekStart);
      allPlans = allPlans.concat(plans);
    }
    const filtered = allPlans.filter(p => recipe_ids.includes(p.recipe_id));
    const items = generateShoppingList(filtered);

    const list = await createShoppingList({
      name, subtitle: subtitle ?? '', week_starts: week_starts ?? [], recipe_ids, items,
    });
    return NextResponse.json(list, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/shopping-lists?id=X — save user edits
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

// PATCH /api/shopping-lists?id=X — apply a batch of targeted operations.
// Body: { ops: ShoppingOp[] }. Each op composes with concurrent edits instead
// of overwriting the whole list.
export async function PATCH(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const body = await req.json();
    const ops: ShoppingOp[] = Array.isArray(body?.ops) ? body.ops : [];
    if (ops.length) await applyShoppingListOps(id, ops);
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
