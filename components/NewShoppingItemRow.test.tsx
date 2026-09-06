import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NewShoppingItemRow, { newShoppingItemRowCss } from './NewShoppingItemRow';

afterEach(cleanup);

describe('NewShoppingItemRow layout', () => {
  it('gives the name field the leftover row and keeps qty on a short rail', () => {
    expect(newShoppingItemRowCss).toMatch(/\.new-item-name-wrap\s*\{[^}]*flex:\s*1 1 auto/);
    expect(newShoppingItemRowCss).toMatch(/input\.new-item-name\s*\{[^}]*width:\s*100%/);
    expect(newShoppingItemRowCss).toMatch(/input\.new-item-amount\s*\{[^}]*flex:\s*0 0 4\.75rem/);
    expect(newShoppingItemRowCss).toMatch(/input\.new-item-amount\s*\{[^}]*width:\s*4\.75rem/);
    expect(newShoppingItemRowCss).toMatch(/input\.new-item-amount\s*\{[^}]*max-width:\s*4\.75rem/);
  });

  it('opens suggestions as a drop-up above the name field', () => {
    expect(newShoppingItemRowCss).toMatch(/\.new-item-suggest\s*\{[^}]*bottom:\s*calc\(100%/);
    expect(newShoppingItemRowCss).not.toMatch(/\.new-item-suggest\s*\{[^}]*top:\s*calc\(100%/);
  });
});

describe('NewShoppingItemRow autocomplete', () => {
  it('lists matching ingredients above the name and fills on click', () => {
    const onCommit = vi.fn();
    render(
      <NewShoppingItemRow
        catalog={['onion', 'olive oil', 'black pepper']}
        onCommit={onCommit}
        onCancel={() => {}}
      />,
    );
    const name = screen.getByPlaceholderText('New item…');
    fireEvent.change(name, { target: { value: 'oni' } });
    const list = screen.getByRole('listbox');
    expect(list.getAttribute('data-placement')).toBe('up');
    expect(screen.getByRole('option', { name: 'Onion' })).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'Onion' }));
    expect((name as HTMLInputElement).value).toBe('Onion');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits the typed name on Enter when no suggestion is highlighted', () => {
    const onCommit = vi.fn();
    render(
      <NewShoppingItemRow
        catalog={['onion']}
        onCommit={onCommit}
        onCancel={() => {}}
      />,
    );
    const name = screen.getByPlaceholderText('New item…');
    fireEvent.change(name, { target: { value: 'Tape' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('Tape', '');
  });

  it('fills the highlighted suggestion with ArrowDown then Enter', () => {
    const onCommit = vi.fn();
    render(
      <NewShoppingItemRow
        catalog={['onion', 'olive oil']}
        onCommit={onCommit}
        onCancel={() => {}}
      />,
    );
    const name = screen.getByPlaceholderText('New item…');
    fireEvent.change(name, { target: { value: 'o' } });
    fireEvent.keyDown(name, { key: 'ArrowDown' });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect((name as HTMLInputElement).value).toBe('Onion');
    expect(onCommit).not.toHaveBeenCalled();
  });
});
