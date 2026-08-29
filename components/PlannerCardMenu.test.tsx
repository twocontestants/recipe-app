import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PlannerCardMenu from './PlannerCardMenu';

afterEach(cleanup);

const days = [
  { index: 0, name: 'Monday', dateLabel: '17 Aug' },
  { index: 1, name: 'Tuesday', dateLabel: '18 Aug' },
  { index: 2, name: 'Wednesday', dateLabel: '19 Aug' },
];

function renderMenu(overrides: Partial<ComponentProps<typeof PlannerCardMenu>> = {}) {
  const props = {
    view: 'root' as const,
    right: 8,
    y: 40,
    up: false,
    currentDayIndex: 1,
    days,
    canOpenRecipe: true,
    menuRef: { current: null },
    onViewRecipe: vi.fn(),
    onEditRecipe: vi.fn(),
    onReplace: vi.fn(),
    onOpenMove: vi.fn(),
    onBack: vi.fn(),
    onMoveTo: vi.fn(),
    onAnotherDate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<PlannerCardMenu {...props} />);
  return props;
}

describe('PlannerCardMenu', () => {
  it('offers view, edit, move, and delete on the root menu', () => {
    const props = renderMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'View recipe' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit recipe' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /move to/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(props.onViewRecipe).toHaveBeenCalledTimes(1);
    expect(props.onEditRecipe).toHaveBeenCalledTimes(1);
    expect(props.onOpenMove).toHaveBeenCalledTimes(1);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('disables view and edit when the meal has no recipe', () => {
    renderMenu({ canOpenRecipe: false });
    expect(screen.getByRole('menuitem', { name: 'View recipe' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('menuitem', { name: 'Edit recipe' })).toHaveProperty('disabled', true);
  });

  it('moves to another weekday from the move submenu', () => {
    const props = renderMenu({ view: 'move' });
    fireEvent.click(screen.getByRole('menuitem', { name: /wednesday/i }));
    expect(props.onMoveTo).toHaveBeenCalledWith(2);
    expect(screen.getByRole('menuitem', { name: /tuesday/i })).toHaveProperty('disabled', true);
  });

  it('lets you pick another date from the move submenu', () => {
    const props = renderMenu({ view: 'move' });
    fireEvent.click(screen.getByRole('menuitem', { name: /another date/i }));
    fireEvent.change(screen.getByLabelText('Pick another date'), {
      target: { value: '2026-08-25' },
    });
    expect(props.onAnotherDate).toHaveBeenCalledWith('2026-08-25');
    expect(props.onMoveTo).not.toHaveBeenCalled();
  });
});
