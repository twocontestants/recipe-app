import { describe, expect, it } from 'vitest';
import { parseRecipeText } from './recipeTextParser';

describe('parseRecipeText protein', () => {
  it('does not treat eggplant as eggs', () => {
    const parsed = parseRecipeText(`
Eggplant parmesan
Ingredients
1 large eggplant
2 cups mozzarella
Method
Bake the eggplant until golden.
`);
    expect(parsed.primary_protein).toBeNull();
  });

  it('reads salmon from the method when the ingredient is just fillets', () => {
    const parsed = parseRecipeText(`
Weeknight fillets
Ingredients
4 fillets
1 lemon
Method
Season the salmon and bake in the oven until just opaque.
`);
    expect(parsed.primary_protein).toBe('fish');
  });
});
