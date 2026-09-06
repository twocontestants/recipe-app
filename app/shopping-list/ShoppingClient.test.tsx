import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  }),
}));

import ShoppingClient from './ShoppingClient';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonOk(body: unknown) {
  return { ok: true, json: async () => body };
}

function stubShoppingFetch(detail: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/shopping-lists' || (url.includes('/api/shopping-lists') && !url.includes('id='))) {
      return jsonOk([{
        id: 'list-1',
        name: 'This week',
        subtitle: '',
        generated_at: '2026-09-06T00:00:00.000Z',
        recipe_ids: ['r1', 'r2'],
      }]);
    }
    if (url.includes('/api/shopping-lists?id=list-1')) {
      return jsonOk({
        checked_state: {},
        item_overrides: {},
        custom_items: [],
        category_labels: {},
        category_order: [],
        item_order: {},
        subtitle: '',
        ...detail,
      });
    }
    if (url.includes('/api/preferences')) return jsonOk({});
    return { ok: false, json: async () => ({}) };
  }));
}

describe('ShoppingClient header actions', () => {
  it('does not show Copy or Print', async () => {
    stubShoppingFetch({
      items: [{ name: 'onion', amount: '1', unit: 'each', category: 'produce' }],
    });

    render(<ShoppingClient />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /shopping/i })).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /new list/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^copy$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^print$/i })).toBeNull();
  });
});

describe('ShoppingClient compact cards', () => {
  it('pins a progress bar and shows multi-recipe sources on one line', async () => {
    stubShoppingFetch({
      items: [
        {
          id: 'i1',
          name: 'soy sauce',
          displayName: 'Soy sauce',
          totalAmount: '2',
          unit: 'tbsp',
          category: 'Pantry',
          checked: false,
          recipes: ['Stir Fry', 'Breakfast'],
          contributions: [
            { name: 'Soy sauce', amount: '1', unit: 'tbsp', recipe: 'Stir Fry' },
            { name: 'Soy sauce', amount: '1', unit: 'tbsp', recipe: 'Breakfast' },
          ],
        },
        {
          id: 'i2',
          name: 'olive oil',
          displayName: 'Olive oil',
          totalAmount: '4',
          unit: 'tbsp',
          category: 'Pantry',
          checked: true,
          recipes: ['Stir Fry', 'Breakfast', 'Tuna Bowl'],
          contributions: [
            { name: 'Olive oil', amount: '2', unit: 'tbsp', recipe: 'Stir Fry' },
            { name: 'Olive oil', amount: '1', unit: 'tbsp', recipe: 'Breakfast' },
            { name: 'Olive oil', amount: '1', unit: 'tbsp', recipe: 'Tuna Bowl' },
          ],
        },
        {
          id: 'i3',
          name: 'rice',
          displayName: 'Rice',
          totalAmount: '1',
          unit: 'cup',
          category: 'Pantry',
          checked: false,
          recipes: ['Tuna Bowl'],
          contributions: [
            { name: 'Rice', amount: '1', unit: 'cup', recipe: 'Tuna Bowl' },
          ],
        },
      ],
    });

    const { container } = render(<ShoppingClient />);

    await waitFor(() => {
      expect(screen.getByText('Soy sauce')).toBeTruthy();
    });

    const bar = screen.getByRole('progressbar');
    expect(bar.className).toMatch(/shop-progress-fixed/);
    expect(bar.textContent).toMatch(/1 \/ 3 items/);
    expect(getComputedStyle(bar).position).toBe('fixed');

    expect(screen.getByText('Stir Fry • Breakfast')).toBeTruthy();
    expect(screen.getByText('All recipes')).toBeTruthy();
    expect(container.querySelector('.shop-subitem')).toBeNull();

    const pantry = container.querySelector('[data-theme="pantry"]');
    expect(pantry).toBeTruthy();
    expect(pantry?.className).toMatch(/shop-category-card/);
  });

  it('expands a multi-recipe line to the individual wordings', async () => {
    stubShoppingFetch({
      items: [{
        id: 'i1',
        name: 'onion',
        displayName: 'Onion',
        totalAmount: '2',
        unit: '',
        category: 'Fruit & Veg',
        checked: false,
        recipes: ['Thai Curry', 'Stir Fry'],
        contributions: [
          { name: 'Large onion, diced', amount: '1', unit: '', recipe: 'Thai Curry' },
          { name: 'Brown onion', amount: '1', unit: '', recipe: 'Stir Fry' },
        ],
      }],
    });

    render(<ShoppingClient />);
    await waitFor(() => {
      expect(screen.getByText('Onion')).toBeTruthy();
    });
    expect(screen.queryByText('Large onion, diced')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /all recipes/i }));
    expect(screen.getByText('Large onion, diced')).toBeTruthy();
    expect(screen.getByText('Brown onion')).toBeTruthy();
  });
});
