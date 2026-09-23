import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  pageSkeletonForPath,
  PlannerPageSkeleton,
  RecipeDetailSkeleton,
  RecipesPageSkeleton,
  SettingsPageSkeleton,
  ShoppingPageSkeleton,
} from './Skeleton';

describe('page skeletons', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders a recipe grid placeholder', () => {
    render(<RecipesPageSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading recipes' })).toBeTruthy();
    expect(document.querySelectorAll('.sk-recipe-card').length).toBe(6);
  });

  it('renders a recipe detail placeholder', () => {
    render(<RecipeDetailSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading recipe' })).toBeTruthy();
    expect(screen.getByText('Ingredients')).toBeTruthy();
    expect(screen.getByText('Method')).toBeTruthy();
  });

  it('renders a planner week placeholder', () => {
    render(<PlannerPageSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading planner' })).toBeTruthy();
    expect(document.querySelectorAll('.sk-planner-day').length).toBe(7);
  });

  it('renders a shopping list placeholder', () => {
    render(<ShoppingPageSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading shopping list' })).toBeTruthy();
    expect(document.querySelectorAll('.sk-shop-cat').length).toBe(3);
  });

  it('renders a settings dictionary placeholder', () => {
    render(<SettingsPageSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading ingredient categories' })).toBeTruthy();
    expect(screen.getByText('Account')).toBeTruthy();
  });

  it('picks a skeleton from the current path', () => {
    const { rerender } = render(pageSkeletonForPath('/planner'));
    expect(screen.getByRole('status', { name: 'Loading planner' })).toBeTruthy();
    rerender(pageSkeletonForPath('/shopping-list'));
    expect(screen.getByRole('status', { name: 'Loading shopping list' })).toBeTruthy();
    rerender(pageSkeletonForPath('/settings'));
    expect(screen.getByRole('status', { name: 'Loading ingredient categories' })).toBeTruthy();
    rerender(pageSkeletonForPath('/recipes/abc-123/soup'));
    expect(screen.getByRole('status', { name: 'Loading recipe' })).toBeTruthy();
    rerender(pageSkeletonForPath('/recipes'));
    expect(screen.getByRole('status', { name: 'Loading recipes' })).toBeTruthy();
  });
});
