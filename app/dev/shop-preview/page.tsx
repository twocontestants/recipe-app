'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import ShoppingClient from '../../shopping-list/ShoppingClient';

const items = [
  {
    id: 'i1',
    name: 'chicken breast',
    displayName: 'Chicken breast',
    totalAmount: '600',
    unit: 'g',
    category: 'Meat & Seafood',
    checked: true,
    recipes: ['Thai Curry', 'Stir Fry'],
    contributions: [
      { name: 'Chicken breast', amount: '400', unit: 'g', recipe: 'Thai Curry' },
      { name: 'Chicken breast', amount: '200', unit: 'g', recipe: 'Stir Fry' },
    ],
  },
  {
    id: 'i2',
    name: 'soy sauce',
    displayName: 'Soy sauce',
    totalAmount: '3',
    unit: 'tbsp',
    category: 'Pantry',
    checked: false,
    recipes: ['Stir Fry', 'Breakfast'],
    contributions: [
      { name: 'Soy sauce', amount: '2', unit: 'tbsp', recipe: 'Stir Fry' },
      { name: 'Soy sauce', amount: '1', unit: 'tbsp', recipe: 'Breakfast' },
    ],
  },
  {
    id: 'i3',
    name: 'olive oil',
    displayName: 'Olive oil',
    totalAmount: '4',
    unit: 'tbsp',
    category: 'Pantry',
    checked: true,
    recipes: ['Thai Curry', 'Stir Fry', 'Breakfast'],
    contributions: [
      { name: 'Olive oil', amount: '2', unit: 'tbsp', recipe: 'Thai Curry' },
      { name: 'Olive oil', amount: '1', unit: 'tbsp', recipe: 'Stir Fry' },
      { name: 'Olive oil', amount: '1', unit: 'tbsp', recipe: 'Breakfast' },
    ],
  },
  {
    id: 'i4',
    name: 'coconut milk',
    displayName: 'Coconut milk',
    totalAmount: '1',
    unit: 'can',
    category: 'Pantry',
    checked: false,
    recipes: ['Thai Curry'],
    contributions: [{ name: 'Coconut milk', amount: '1', unit: 'can', recipe: 'Thai Curry' }],
  },
  {
    id: 'i5',
    name: 'milk',
    displayName: 'Milk',
    totalAmount: '1',
    unit: 'L',
    category: 'Dairy',
    checked: false,
    recipes: ['Breakfast'],
    contributions: [{ name: 'Milk', amount: '1', unit: 'L', recipe: 'Breakfast' }],
  },
  {
    id: 'i6',
    name: 'yogurt',
    displayName: 'Greek yogurt',
    totalAmount: '500',
    unit: 'g',
    category: 'Dairy',
    checked: true,
    recipes: ['Breakfast', 'Thai Curry'],
    contributions: [
      { name: 'Greek yogurt', amount: '400', unit: 'g', recipe: 'Breakfast' },
      { name: 'Greek yogurt', amount: '100', unit: 'g', recipe: 'Thai Curry' },
    ],
  },
  {
    id: 'i7',
    name: 'bread',
    displayName: 'Sourdough',
    totalAmount: '1',
    unit: 'loaf',
    category: 'Bakery',
    checked: false,
    recipes: ['Breakfast'],
    contributions: [{ name: 'Sourdough', amount: '1', unit: 'loaf', recipe: 'Breakfast' }],
  },
];

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default function ShopPreview() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const orig = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/shopping-lists' || (url.includes('/api/shopping-lists') && !url.includes('id='))) {
        return json([{
          id: 'list-1',
          name: 'This week',
          subtitle: 'Thai + breakfast',
          generated_at: '2026-09-06T00:00:00.000Z',
          recipe_ids: ['r1', 'r2', 'r3'],
        }]);
      }
      if (url.includes('/api/shopping-lists?id=')) {
        if (init?.method && init.method !== 'GET') return json({ ok: true });
        return json({
          items,
          checked_state: {},
          item_overrides: {},
          custom_items: [],
          category_labels: {},
          category_order: ['Meat & Seafood', 'Pantry', 'Dairy', 'Bakery'],
          item_order: {},
          subtitle: 'Thai + breakfast',
        });
      }
      if (url.includes('/api/preferences') || url.includes('/api/ingredient-categories')) {
        return json({});
      }
      return orig(input, init);
    }) as typeof fetch;
    setReady(true);
    return () => { window.fetch = orig; };
  }, []);

  if (!ready) return null;

  return (
    <div className="app-shell is-shopping">
      <Sidebar />
      <main className="main-content">
        <p className="shop-preview-banner" role="status">
          Sample list for reviewing the new shopping UI. Ticks here are not saved to your kitchen.
        </p>
        <ShoppingClient />
      </main>
      <ToastProvider />
      <style>{`
        .shop-preview-banner {
          max-width: 700px;
          margin: 0 0 1rem;
          padding: 0.55rem 0.8rem;
          background: #F8F0E4;
          border: 1px solid #E4D3B8;
          border-radius: 8px;
          color: #6B4A24;
          font-size: 0.82rem;
        }
      `}</style>
    </div>
  );
}
