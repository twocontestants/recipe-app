import { cleanup, render, screen } from '@testing-library/react';
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
});
