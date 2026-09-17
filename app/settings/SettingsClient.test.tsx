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

import SettingsClient from './SettingsClient';

describe('SettingsClient loading', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows dictionary skeletons while categories load', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<SettingsClient />);
    expect(screen.getByRole('status', { name: 'Loading ingredient categories' })).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });
});
