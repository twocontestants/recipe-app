import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u1', login_name: 'cook', display_name: 'Cook', role: 'cook' },
    loading: false,
    refresh: async () => {},
    logout: async () => {},
  }),
}));

vi.mock('@/components/usePlannerLive', () => ({
  usePlannerLive: () => ({ broadcastPlannerChanged: vi.fn() }),
}));

import RecipesClient from './RecipesClient';
import { ToastProvider } from '@/components/Toast';
import type { Recipe } from '@/lib/db';

const tomato: Recipe = {
  id: 'r1',
  title: 'Tomato Soup',
  servings: 4,
  tags: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  owner_id: 'u1',
  visibility: 'private',
  can_edit: true,
};

describe('RecipesClient loading', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows recipe card skeletons while the cookbook loads', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<RecipesClient />);
    expect(screen.getByRole('status', { name: 'Loading recipes' })).toBeTruthy();
    expect(document.querySelectorAll('.sk-recipe-card').length).toBe(6);
  });

  it('closes the plan sheet before the planner write resolves', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method || 'GET').toUpperCase();
      if (url.startsWith('/api/recipes')) {
        return { ok: true, json: async () => [tomato] };
      }
      if (url.includes('/api/preferences')) {
        return { ok: true, json: async () => ({ weekStartDay: 'monday' }) };
      }
      if (url.includes('/api/planner') && method === 'POST') {
        await new Promise(() => {});
      }
      if (url.includes('/api/planner')) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({}) };
    }));

    render(
      <ToastProvider>
        <RecipesClient />
      </ToastProvider>,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: /^plan$/i }))[0]);
    expect(await screen.findByRole('dialog', { name: 'Add to planner' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /add dinner/i }));
    expect(screen.queryByRole('dialog', { name: 'Add to planner' })).toBeNull();
    expect(await screen.findByText(/Dinner added for/i)).toBeTruthy();
  });
});
