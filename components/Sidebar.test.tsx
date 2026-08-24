import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import type { AuthUser } from '@/lib/roles';

const signedIn: AuthUser = {
  id: 'u1',
  login_name: 'ada@example.com',
  display_name: 'Ada Lovelace',
  role: 'moderator',
};

const authState = {
  user: signedIn as AuthUser | null,
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
    authState.user = signedIn;
    authState.loading = false;
  });

  it('does not show the account name, role, or Sign out in the nav', () => {
    render(<Sidebar />);
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
    expect(screen.queryByText(/moderator/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull();
    expect(screen.getByRole('link', { name: /settings/i })).toBeTruthy();
  });

  it('offers Sign in in the nav when signed out', () => {
    authState.user = null;
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeTruthy();
  });
});
