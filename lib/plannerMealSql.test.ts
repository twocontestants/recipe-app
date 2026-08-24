import { describe, expect, it } from 'vitest';
import { mealPlanSelectSql } from './db';

describe('mealPlanSelectSql', () => {
  it('separates meal columns from recipe card columns with a comma', () => {
    expect(mealPlanSelectSql(false)).toMatch(/SELECT mp\.\*,\s*r\.title/);
    expect(mealPlanSelectSql(false)).not.toContain('recipe_ingredients');
  });

  it('adds ingredients and steps only for a full join', () => {
    expect(mealPlanSelectSql(true)).toContain('recipe_ingredients');
    expect(mealPlanSelectSql(true)).toContain('recipe_steps');
  });
});
