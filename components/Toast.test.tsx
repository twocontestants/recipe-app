import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { showToast, ToastProvider } from './Toast';

describe('Toast retry action', () => {
  afterEach(cleanup);

  it('shows a retry button on error toasts and runs it once', () => {
    const onRetry = vi.fn();
    render(
      <ToastProvider>
        <button
          type="button"
          onClick={() => showToast("Couldn't add dinner — Planner is full", 'error', {
            label: 'Retry',
            onClick: onRetry,
          })}
        >
          Fail
        </button>
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
