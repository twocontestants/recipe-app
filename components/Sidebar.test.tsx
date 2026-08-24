import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import type { AuthUser } from '@/lib/roles';

const jessica: AuthUser = {
  id: 'jess-1',
  login_name: 'Jessica',
  display_name: 'Jessica',
  role: 'moderator',
};

const authState = {
  user: jessica as AuthUser | null,
  loading: false,
  refresh: async () => {},
  logout: vi.fn(async () => {}),
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/recipes',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('./AuthProvider', () => ({
  useAuth: () => authState,
}));

describe('Sidebar', () => {
  afterEach(() => {
    cleanup();
    authState.user = jessica;
    authState.loading = false;
  });

  it('keeps Sign out out of the nav when signed in', () => {
    render(<Sidebar />);
    expect(screen.getByText('Jessica')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull();
    expect(screen.queryByText(/sign out/i)).toBeNull();
  });

  it('still offers Sign in when signed out', () => {
    authState.user = null;
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeTruthy();
  });
});
