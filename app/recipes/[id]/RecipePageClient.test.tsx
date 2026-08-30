import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '@/lib/db';
import { ToastProvider } from '@/components/Toast';
import RecipePageClient from './RecipePageClient';

const recipe: Recipe = {
  id: 'abc-123',
  title: 'Tomato Soup',
  description: 'A weeknight staple',
  servings: 4,
  tags: ['soup'],
  ingredients: [{ amount: '1', unit: 'can', name: 'tomatoes' }],
  steps: ['Heat and stir'],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  owner_id: 'u1',
  visibility: 'private',
  can_edit: true,
  can_publish: true,
};

const search = new URLSearchParams();
const replace = vi.fn();
const push = vi.fn();
const back = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, back }),
  useSearchParams: () => search,
}));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u1', login_name: 'ada', display_name: 'Ada', role: 'cook' },
    loading: false,
    refresh: async () => {},
    logout: async () => {},
  }),
}));

vi.mock('@/components/usePlannerLive', () => ({
  usePlannerLive: () => ({ broadcastPlannerChanged: vi.fn() }),
}));

function mockFetch(handler: (url: string) => Partial<Response> | Promise<Partial<Response>>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const result = await handler(url);
    return {
      ok: result.ok ?? true,
      status: result.status ?? 200,
      json: result.json ?? (async () => ({})),
    };
  }));
}

describe('RecipePageClient', () => {
  afterEach(() => {
    cleanup();
    search.delete('edit');
    replace.mockClear();
    push.mockClear();
    back.mockClear();
    vi.unstubAllGlobals();
  });

  it('loads the recipe by id without fetching the cookbook list', async () => {
    const urls: string[] = [];
    mockFetch(url => {
      urls.push(url);
      if (url === '/api/recipes/abc-123') {
        return { json: async () => recipe };
      }
      if (url === '/api/preferences') {
        return { json: async () => ({ weekStartDay: 'monday' }) };
      }
      return { ok: false, status: 404 };
    });

    render(
      <ToastProvider>
        <RecipePageClient recipeId="abc-123" />
      </ToastProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Tomato Soup' })).toBeTruthy();
    expect(screen.getByText('Heat and stir')).toBeTruthy();
    expect(urls.some(url => url === '/api/recipes' || url.startsWith('/api/recipes?'))).toBe(false);
    expect(urls).toContain('/api/recipes/abc-123');
    expect(screen.queryByText(/My Recipes|Public Recipes|Your cookbook is empty/i)).toBeNull();
  });

  it('opens the editor when the dedicated page is asked to edit', async () => {
    search.set('edit', '1');
    mockFetch(url => {
      if (url === '/api/recipes/abc-123') return { json: async () => recipe };
      if (url === '/api/preferences') return { json: async () => ({ weekStartDay: 'monday' }) };
      return { ok: false, status: 404 };
    });

    render(
      <ToastProvider>
        <RecipePageClient recipeId="abc-123" />
      </ToastProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Edit Recipe' })).toBeTruthy();
    expect(screen.getByDisplayValue('Tomato Soup')).toBeTruthy();
  });

  it('shows a not-found state when the recipe is missing', async () => {
    mockFetch(url => {
      if (url === '/api/recipes/missing') return { ok: false, status: 404, json: async () => ({ error: 'Recipe not found' }) };
      if (url === '/api/preferences') return { json: async () => ({ weekStartDay: 'monday' }) };
      return { ok: false, status: 404 };
    });

    render(
      <ToastProvider>
        <RecipePageClient recipeId="missing" />
      </ToastProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Recipe not found' })).toBeTruthy();
  });
});
