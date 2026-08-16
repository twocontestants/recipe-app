import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PickerRecipeRow from './PickerRecipeRow';

afterEach(cleanup);

const days = [
  { index: 0, name: 'Monday', dateLabel: '17 Aug' },
  { index: 1, name: 'Tuesday', dateLabel: '18 Aug' },
  { index: 2, name: 'Wednesday', dateLabel: '19 Aug' },
];

const rowProps = {
  title: 'Pasta',
  thumb: <span>🍽</span>,
  currentDayIndex: 0,
  days,
};

describe('PickerRecipeRow', () => {
  it('adds to the current day when the recipe row is clicked', () => {
    const onSelect = vi.fn();
    const onAddToDay = vi.fn();
    const onAddToDate = vi.fn();
    render(
      <PickerRecipeRow
        {...rowProps}
        onSelect={onSelect}
        onAddToDay={onAddToDay}
        onAddToDate={onAddToDate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /pasta$/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onAddToDay).not.toHaveBeenCalled();
    expect(onAddToDate).not.toHaveBeenCalled();
  });

  it('opens an add-to menu of the rest of the week from the three-dot button', () => {
    const onSelect = vi.fn();
    const onAddToDay = vi.fn();
    render(
      <PickerRecipeRow
        {...rowProps}
        onSelect={onSelect}
        onAddToDay={onAddToDay}
        onAddToDate={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add Pasta to another day'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: /monday/i })).toBeNull();
    expect(screen.getByRole('menuitem', { name: /tuesday/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /wednesday/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: /tuesday/i }));
    expect(onAddToDay).toHaveBeenCalledWith(1);
  });

  it('lets you pick another date from the add-to menu', () => {
    const onAddToDay = vi.fn();
    const onAddToDate = vi.fn();
    render(
      <PickerRecipeRow
        {...rowProps}
        onSelect={() => {}}
        onAddToDay={onAddToDay}
        onAddToDate={onAddToDate}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add Pasta to another day'));
    fireEvent.click(screen.getByRole('menuitem', { name: /another date/i }));
    fireEvent.change(screen.getByLabelText('Pick another date for Pasta'), {
      target: { value: '2026-08-25' },
    });
    expect(onAddToDate).toHaveBeenCalledWith('2026-08-25');
    expect(onAddToDay).not.toHaveBeenCalled();
  });
});
