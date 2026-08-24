import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginForm from './LoginForm';
import { ToastProvider } from '@/components/Toast';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ user: null, loading: false, refresh: vi.fn(async () => {}) }),
}));

describe('LoginForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the server error on the form when sign-in is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Wrong sign-in name or password' }),
    }));

    render(
      <ToastProvider>
        <LoginForm />
      </ToastProvider>,
    );

    fireEvent.change(screen.getByLabelText(/email or name/i), { target: { value: 'Jessica' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'nope' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    expect((await screen.findByRole('alert')).textContent).toBe('Wrong sign-in name or password');
  });
});
