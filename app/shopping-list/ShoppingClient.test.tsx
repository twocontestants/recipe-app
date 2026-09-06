import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

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

describe('ShoppingClient header actions', () => {
  it('does not show Copy or Print', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/shopping-lists' || (url.includes('/api/shopping-lists') && !url.includes('id='))) {
        return {
          ok: true,
          json: async () => [{
            id: 'list-1',
            name: 'This week',
            subtitle: '',
            generated_at: '2026-09-06T00:00:00.000Z',
            recipe_ids: ['r1'],
          }],
        };
      }
      if (url.includes('/api/shopping-lists?id=list-1')) {
        return {
          ok: true,
          json: async () => ({
            items: [{ name: 'onion', amount: '1', unit: 'each', category: 'produce' }],
            checked_state: {},
            item_overrides: {},
            custom_items: [],
            category_labels: {},
            category_order: [],
            item_order: {},
            subtitle: '',
          }),
        };
      }
      if (url.includes('/api/preferences')) {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: false, json: async () => ({}) };
    }));

    render(<ShoppingClient />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /shopping/i })).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /new list/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^copy$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^print$/i })).toBeNull();
  });
});
