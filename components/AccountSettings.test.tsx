import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountSettings } from './AccountSettings';
import type { AuthUser } from '@/lib/roles';

const user: AuthUser = {
  id: 'u1',
  login_name: 'ada@example.com',
  display_name: 'Ada',
  role: 'cook',
};

const logout = vi.fn(async () => {});
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ user, loading: false, refresh: async () => {}, logout }),
}));

describe('AccountSettings', () => {
  afterEach(() => {
    cleanup();
    logout.mockClear();
    replace.mockClear();
    vi.unstubAllGlobals();
  });

  it('shows change-password fields and Sign out at the top of settings', () => {
    render(<AccountSettings />);
    expect(screen.getByRole('heading', { name: /account/i })).toBeTruthy();
    expect(screen.getByLabelText(/current password/i)).toBeTruthy();
    expect(screen.getByLabelText(/^new password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/confirm new password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
  });

  it('shows an inline error when the new passwords do not match', async () => {
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'old' } });
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'next' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'nope' } });
    fireEvent.submit(screen.getByRole('button', { name: /update password/i }).closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toBe('New passwords do not match');
  });

  it('signs out from settings and leaves the gated page', async () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await vi.waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith('/recipes');
  });
});
