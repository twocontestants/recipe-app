import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PlannerDaySheet from './PlannerDaySheet';

afterEach(cleanup);

const weekStart = '2026-08-17';

function renderSheet(overrides: Partial<ComponentProps<typeof PlannerDaySheet>> = {}) {
  const props = {
    title: 'Move on planner',
    recipeTitle: 'Spaghetti Bolognese',
    confirmVerb: 'Move dinner',
    weekStart,
    selectedDay: 2,
    weekPlan: {
      0: [{ title: 'Pasta night', meal_type: 'dinner' }],
    } as Record<number, { title: string; meal_type: string }[]>,
    confirming: false,
    onClose: vi.fn(),
    onShiftWeek: vi.fn(),
    onSelectDay: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
  render(<PlannerDaySheet {...props} />);
  return props;
}

describe('PlannerDaySheet', () => {
  it('lists each weekday as a full-width row instead of a cramped 7-column grid', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Move on planner' })).toBeTruthy();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(7);
    expect(screen.getByRole('option', { name: /mon/i })).toBeTruthy();
    expect(screen.getByText('Pasta night')).toBeTruthy();
    expect(screen.getAllByText('Nothing planned').length).toBeGreaterThan(0);
    expect(document.querySelector('.pqm-day-grid')).toBeNull();
    expect(document.querySelector('.pqm-day-list')).toBeTruthy();
  });

  it('selects a day by index and confirms with the supplied verb', () => {
    const props = renderSheet();
    fireEvent.click(screen.getByRole('option', { name: /thu/i }));
    expect(props.onSelectDay).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: /move dinner/i }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /move dinner · wed 19/i })).toBeTruthy();
  });

  it('lists Sunday first when the household week starts on Sunday', () => {
    renderSheet({ weekStartsOn: 'sunday', weekStart: '2026-08-16', selectedDay: 0 });
    const options = screen.getAllByRole('option');
    expect(options[0].textContent).toMatch(/sun/i);
    expect(options[1].textContent).toMatch(/mon/i);
    expect(screen.getByRole('button', { name: /move dinner · sun 16/i })).toBeTruthy();
  });
});
