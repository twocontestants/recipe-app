import { NextRequest, NextResponse } from 'next/server';
import {
  getAllShoppingLists, createShoppingList, updateShoppingListEdits,
  deleteShoppingList, getShoppingListById, getMealPlansForWeeks, applyShoppingListOps,
  getCategoryDictionary
} from '@/lib/db';
import { generateShoppingList } from '@/lib/shopping';
import type { ShoppingOp } from '@/lib/shoppingOps';
import { isAuthUser, requireUser } from '@/lib/session';

// GET /api/shopping-lists — list all, or ?id=X for one with items
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const list = await getShoppingListById(id, user.id);
      if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(list);
    }
    const lists = await getAllShoppingLists(user.id);
    return NextResponse.json(lists);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const body = await req.json();
    const { name, subtitle, week_starts, recipe_ids } = body;
    if (!name || !recipe_ids?.length) {
      return NextResponse.json({ error: 'name and recipe_ids required' }, { status: 400 });
    }

    const allPlans = await getMealPlansForWeeks(week_starts ?? [], user.id, { includeMethod: true });
    const filtered = allPlans.filter(p => recipe_ids.includes(p.recipe_id));
    const categoryDict = await getCategoryDictionary(user.id);
    const items = generateShoppingList(filtered, categoryDict);

    const list = await createShoppingList({
      name, subtitle: subtitle ?? '', week_starts: week_starts ?? [], recipe_ids, items, owner_id: user.id,
    });
    return NextResponse.json(list, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const body = await req.json();
    await updateShoppingListEdits(id, user.id, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const body = await req.json();
    const ops: ShoppingOp[] = Array.isArray(body?.ops) ? body.ops : [];
    if (ops.length) await applyShoppingListOps(id, ops, user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await deleteShoppingList(id, user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
