import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import HiddenDatePicker, { openNativeDatePicker } from './HiddenDatePicker';

afterEach(cleanup);

describe('HiddenDatePicker', () => {
  it('reports the picked YYYY-MM-DD and clears the input', () => {
    const onPick = vi.fn();
    render(<HiddenDatePicker ariaLabel="Pick another date" onPick={onPick} />);
    const input = screen.getByLabelText('Pick another date') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-08-25' } });
    expect(onPick).toHaveBeenCalledWith('2026-08-25');
    expect(input.value).toBe('');
  });

  it('opens the native picker when showPicker exists', () => {
    const showPicker = vi.fn();
    const el = { showPicker, focus: vi.fn() } as unknown as HTMLInputElement;
    openNativeDatePicker(el);
    expect(showPicker).toHaveBeenCalledTimes(1);
  });
});
