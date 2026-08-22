import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AddToPlannerModal from './AddToPlannerModal';

afterEach(cleanup);

const weekStart = '2026-08-17';

function renderModal(overrides: Partial<ComponentProps<typeof AddToPlannerModal>> = {}) {
  const props = {
    recipeTitle: 'Spaghetti Bolognese',
    weekStart,
    selectedDay: 2,
    weekPlan: {
      0: [{ title: 'Pasta night', meal_type: 'dinner' }],
    } as Record<number, { title: string; meal_type: string }[]>,
    adding: false,
    onClose: vi.fn(),
    onShiftWeek: vi.fn(),
    onSelectDay: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };
  render(<AddToPlannerModal {...props} />);
  return props;
}

describe('AddToPlannerModal', () => {
  it('lists each weekday as a full-width row instead of a cramped 7-column grid', () => {
    renderModal();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(7);
    expect(screen.getByRole('option', { name: /mon/i })).toBeTruthy();
    expect(screen.getByText('Pasta night')).toBeTruthy();
    expect(screen.getAllByText('Nothing planned').length).toBeGreaterThan(0);
    expect(document.querySelector('.pqm-day-grid')).toBeNull();
    expect(document.querySelector('.pqm-day-list')).toBeTruthy();
  });

  it('selects a day by index and confirms with a readable add label', () => {
    const props = renderModal();
    fireEvent.click(screen.getByRole('option', { name: /thu/i }));
    expect(props.onSelectDay).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: /add dinner/i }));
    expect(props.onAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /add dinner · wed 19/i })).toBeTruthy();
  });

  it('does not use weekday-name keys for occupancy', () => {
    renderModal({
      weekPlan: {
        4: [{ title: 'Fish pie', meal_type: 'dinner' }],
      },
    });
    expect(screen.getByText('Fish pie')).toBeTruthy();
    expect(screen.queryByText('friday')).toBeNull();
  });
});
