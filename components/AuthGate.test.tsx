import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const authState = {
  user: null as { id: string } | null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
};

let pathname = '/planner';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('./AuthProvider', () => ({
  useAuth: () => authState,
}));

import { AuthGate } from './AuthGate';

describe('AuthGate', () => {
  afterEach(() => {
    cleanup();
    authState.user = null;
    authState.loading = true;
    pathname = '/planner';
  });

  it('shows a planner skeleton while auth is loading', () => {
    pathname = '/planner';
    render(<AuthGate><div>secret</div></AuthGate>);
    expect(screen.getByRole('status', { name: 'Loading planner' })).toBeTruthy();
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('shows a shopping skeleton on the shopping route', () => {
    pathname = '/shopping-list';
    render(<AuthGate><div>secret</div></AuthGate>);
    expect(screen.getByRole('status', { name: 'Loading shopping list' })).toBeTruthy();
  });

  it('shows a settings skeleton on the settings route', () => {
    pathname = '/settings';
    render(<AuthGate><div>secret</div></AuthGate>);
    expect(screen.getByRole('status', { name: 'Loading ingredient categories' })).toBeTruthy();
  });

  it('renders children once a signed-in user is known', () => {
    authState.loading = false;
    authState.user = { id: 'u1' };
    render(<AuthGate><div>secret</div></AuthGate>);
    expect(screen.getByText('secret')).toBeTruthy();
  });
});
