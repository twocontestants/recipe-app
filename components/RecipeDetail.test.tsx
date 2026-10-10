import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Recipe } from '@/lib/db';
import { RecipeDetail } from './RecipeDetail';

afterEach(cleanup);

const recipe: Recipe = {
  id: 'r1',
  title: 'Duck with celeriac puree',
  servings: 2,
  tags: [],
  ingredients: [
    { amount: '1', unit: '', name: 'whole duck' },
    { amount: '1', unit: '', name: 'celeriac', group: 'Celeriac Puree' },
    { amount: '200', unit: 'ml', name: 'milk', group: 'Celeriac Puree' },
    { amount: '', unit: '', name: 'salt and pepper, to taste' },
    { amount: '8', unit: '', name: 'segments of orange', group: 'To Garnish' },
  ],
  steps: ['Roast the duck.'],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  owner_id: 'u1',
  visibility: 'private',
};

function renderDetail(
  ingredients = recipe.ingredients,
  extra: Partial<Parameters<typeof RecipeDetail>[0]> = {},
) {
  render(
    <RecipeDetail
      recipe={{ ...recipe, ingredients }}
      signedIn={false}
      onDuplicate={() => {}}
      onRate={() => {}}
      onNote={() => {}}
      onBack={() => {}}
      onAddToPlanner={() => {}}
      {...extra}
    />,
  );
}

describe('RecipeDetail ingredient groups', () => {
  it('shows subheadings and leaves ungrouped lines without one', () => {
    renderDetail();
    expect(screen.getByRole('heading', { name: 'Celeriac Puree' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'To Garnish' })).toBeTruthy();
    expect(screen.getByText('whole duck')).toBeTruthy();
    expect(screen.getByText('salt and pepper, to taste')).toBeTruthy();
    expect(screen.getByText('200 ml')).toBeTruthy();
    const headings = screen.getAllByRole('heading', { level: 3 }).map(node => node.textContent);
    expect(headings).toEqual(['Celeriac Puree', 'To Garnish']);
  });

  it('offers reparse beside view source when the recipe has a source url', () => {
    renderDetail(recipe.ingredients, {
      recipe: { ...recipe, source_url: 'https://example.com/duck' },
      onReparse: () => {},
    });
    expect(screen.getByRole('link', { name: 'View Source ↗' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reparse' })).toBeTruthy();
  });

  it('hides reparse when there is no source url', () => {
    renderDetail(recipe.ingredients, { onReparse: () => {} });
    expect(screen.queryByRole('button', { name: 'Reparse' })).toBeNull();
  });

  it('renders a flat list when nothing is grouped', () => {
    renderDetail([{ amount: '1', unit: 'can', name: 'tomatoes' }]);
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
    expect(screen.getByText('tomatoes')).toBeTruthy();
  });
});
