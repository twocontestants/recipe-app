import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '@/lib/db';
import { ToastProvider } from './Toast';
import { useAddToPlannerModal } from './useAddToPlannerModal';

const recipe: Recipe = {
  id: 'r1',
  title: 'Tomato Soup',
  description: '',
  servings: 4,
  tags: [],
  ingredients: [],
  steps: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  owner_id: 'u1',
  visibility: 'private',
  can_edit: true,
};

vi.mock('@/components/usePlannerLive', () => ({
  usePlannerLive: () => ({ broadcastPlannerChanged: vi.fn() }),
}));

function Harness() {
  const { openPlannerModal, plannerModalJsx } = useAddToPlannerModal('u1');
  return (
    <ToastProvider>
      <button type="button" onClick={() => openPlannerModal(recipe)}>Plan recipe</button>
      {plannerModalJsx}
    </ToastProvider>
  );
}

function stubFetch(opts: { holdPost?: Promise<void>; post?: () => Partial<Response> | Promise<Partial<Response>> } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();
    if (url.includes('/api/preferences')) {
      return { ok: true, json: async () => ({ weekStartDay: 'monday' }) };
    }
    if (url.includes('/api/planner') && method === 'POST') {
      if (opts.holdPost) await opts.holdPost;
      if (opts.post) {
        const result = await opts.post();
        return {
          ok: result.ok ?? true,
          statusText: result.statusText ?? (result.ok === false ? 'Internal Server Error' : 'Created'),
          json: result.json ?? (async () => ({ id: 'm1' })),
          text: result.text ?? (async () => JSON.stringify({ id: 'm1' })),
        };
      }
      return { ok: true, json: async () => ({ id: 'm1' }), text: async () => JSON.stringify({ id: 'm1' }) };
    }
    if (url.includes('/api/planner')) {
      return { ok: true, json: async () => [] };
    }
    return { ok: true, json: async () => ({}) };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('useAddToPlannerModal', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('closes the sheet before the planner write resolves', async () => {
    stubFetch({ holdPost: new Promise(() => {}) });
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Plan recipe' }));
    expect(await screen.findByRole('dialog', { name: 'Add to planner' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /add dinner/i }));
    expect(screen.queryByRole('dialog', { name: 'Add to planner' })).toBeNull();
    expect(await screen.findByText(/Dinner added for/i)).toBeTruthy();
  });

  it('offers retry when the background write fails', async () => {
    const fetchMock = stubFetch({
      post: async () => ({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Planner is full' }),
        text: async () => JSON.stringify({ error: 'Planner is full' }),
      }),
    });
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Plan recipe' }));
    fireEvent.click(await screen.findByRole('button', { name: /add dinner/i }));
    expect(screen.queryByRole('dialog', { name: 'Add to planner' })).toBeNull();
    expect(await screen.findByText(/Couldn't add dinner — Planner is full/i)).toBeTruthy();
    const postsBefore = fetchMock.mock.calls.filter(([, init]) => String(init?.method || '').toUpperCase() === 'POST').length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      const posts = fetchMock.mock.calls.filter(([, init]) => String(init?.method || '').toUpperCase() === 'POST');
      expect(posts.length).toBe(postsBefore + 1);
    });
  });
});
