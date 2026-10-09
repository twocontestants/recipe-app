import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecipeFormModal } from './RecipeFormModal';
import { DISCARD_UNSAVED_RECIPE_MESSAGE, emptyRecipeForm, type RecipeFormState } from '@/lib/recipeForm';

afterEach(cleanup);

function paste(el: Element, text: string) {
  fireEvent.paste(el, {
    clipboardData: { getData: () => text },
  });
}

function renderEditor(initial: RecipeFormState = emptyRecipeForm(), onClose = () => {}) {
  function Harness() {
    const [form, setForm] = useState(initial);
    return (
      <RecipeFormModal
        heading="Add Recipe"
        form={form}
        onChange={setForm}
        saving={false}
        saveLabel="Save Recipe"
        onSave={() => {}}
        onClose={onClose}
      />
    );
  }
  render(<Harness />);
}

function tagsField() {
  return screen.getByPlaceholderText('spicy, oven, slow-cooker') as HTMLInputElement;
}

describe('RecipeFormModal bulk paste', () => {
  it('offers duck and an other protein alongside the usual meats', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /duck/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^🍖 other$/i })).toBeTruthy();
  });

  it('parses a pasted ingredient list into rows and tags protein and spice', () => {
    renderEditor();
    paste(
      screen.getByPlaceholderText('flour'),
      '500g chicken thighs\n1 tsp chilli flakes',
    );
    expect(screen.getByDisplayValue('chicken thighs')).toBeTruthy();
    expect(screen.getByDisplayValue('chilli flakes')).toBeTruthy();
    expect(screen.getByDisplayValue('500')).toBeTruthy();
    expect(screen.getByRole('button', { name: /chicken/i }).className).toMatch(/active/);
    expect(tagsField().value).toContain('spicy');
  });

  it('parses a pasted method into steps and adds oven tags', () => {
    renderEditor({
      ...emptyRecipeForm(),
      ingredients: [{ amount: '2', unit: '', name: 'chicken breasts' }],
      primary_protein: 'chicken',
    });
    paste(
      screen.getByPlaceholderText('Step 1…'),
      '1. Preheat the oven to 200C.\n2. Roast for 25 minutes.',
    );
    expect(screen.getByDisplayValue('Preheat the oven to 200C.')).toBeTruthy();
    expect(screen.getByDisplayValue('Roast for 25 minutes.')).toBeTruthy();
    expect(tagsField().value).toMatch(/oven/);
  });

  it('shows a pasted ingredient group as an editable heading', () => {
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Paste ingredient list' }));
    fireEvent.change(screen.getByLabelText('Paste ingredient list'), {
      target: { value: '1 tbsp olive oil\nFor the sauce:\n1 cup stock' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to recipe' }));
    expect(screen.getByDisplayValue('olive oil')).toBeTruthy();
    expect(screen.getByDisplayValue('stock')).toBeTruthy();
    const group = screen.getByLabelText('Ingredient group') as HTMLInputElement;
    expect(group.value).toBe('For the sauce');
  });

  it('parses a paste-list box without replacing existing rows', () => {
    renderEditor({
      ...emptyRecipeForm(),
      ingredients: [{ amount: '1', unit: '', name: 'onion' }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Paste ingredient list' }));
    fireEvent.change(screen.getByLabelText('Paste ingredient list'), {
      target: { value: '2 carrots\n1 celery stick' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to recipe' }));
    expect(screen.getByDisplayValue('onion')).toBeTruthy();
    expect(screen.getByDisplayValue('carrots')).toBeTruthy();
    expect(screen.getByDisplayValue('celery stick')).toBeTruthy();
  });
});

describe('RecipeFormModal unsaved close', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('closes an empty form without asking', () => {
    const onClose = vi.fn();
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    renderEditor(emptyRecipeForm(), onClose);
    fireEvent.click(document.querySelector('.modal-overlay')!);
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks before closing a form that has content', () => {
    const onClose = vi.fn();
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);
    renderEditor({ ...emptyRecipeForm(), title: 'Pasta' }, onClose);
    fireEvent.click(document.querySelector('.modal-overlay')!);
    expect(confirm).toHaveBeenCalledWith(DISCARD_UNSAVED_RECIPE_MESSAGE);
    expect(onClose).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
