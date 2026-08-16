import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PickerRecipeRow from './PickerRecipeRow';

afterEach(cleanup);

const days = [
  { index: 0, name: 'Monday', dateLabel: '17 Aug' },
  { index: 1, name: 'Tuesday', dateLabel: '18 Aug' },
];

describe('PickerRecipeRow', () => {
  it('adds to the current day when the recipe row is clicked', () => {
    const onSelect = vi.fn();
    const onAddToDay = vi.fn();
    render(
      <PickerRecipeRow
        title="Pasta"
        thumb={<span>🍽</span>}
        currentDayIndex={0}
        days={days}
        onSelect={onSelect}
        onAddToDay={onAddToDay}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /pasta$/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onAddToDay).not.toHaveBeenCalled();
  });

  it('opens an add-to-day menu from the three-dot button without selecting the row', () => {
    const onSelect = vi.fn();
    const onAddToDay = vi.fn();
    render(
      <PickerRecipeRow
        title="Pasta"
        thumb={<span>🍽</span>}
        currentDayIndex={0}
        days={days}
        onSelect={onSelect}
        onAddToDay={onAddToDay}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add Pasta to another day'));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: /tuesday/i }));
    expect(onAddToDay).toHaveBeenCalledWith(1);
  });

  it('lists every day in the add-to menu, including the current day', () => {
    render(
      <PickerRecipeRow
        title="Pasta"
        thumb={<span>🍽</span>}
        currentDayIndex={0}
        days={days}
        onSelect={() => {}}
        onAddToDay={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add Pasta to another day'));
    expect(screen.getByRole('menuitem', { name: /monday/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /tuesday/i })).toBeTruthy();
  });
});
