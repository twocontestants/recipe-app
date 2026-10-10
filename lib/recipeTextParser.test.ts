import { describe, expect, it } from 'vitest';
import { parseIngredientLine, parseRecipeText } from './recipeTextParser';

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

describe('parseRecipeText entities', () => {
  it('turns &#39; into an apostrophe in the title and ingredients', () => {
    const parsed = parseRecipeText(`
Nagi&#39;s chilli
Ingredients
1 tsp chef&#39;s salt
Method
Simmer until the chilli is thick.
`);
    expect(parsed.title).toBe("Nagi's chilli");
    expect(parsed.ingredients[0].name).toBe("chef's salt");
    expect(parsed.steps[0]).toContain("chilli");
  });
});

describe('parseIngredientLine amounts', () => {
  it('keeps 1½ with the teaspoon instead of splitting the fraction into the name', () => {
    expect(parseIngredientLine('1½ teaspoon smoked paprika')).toEqual([
      { amount: '1.5', unit: 'teaspoon', name: 'smoked paprika' },
    ]);
  });

  it('reads mixed numbers written with a space or ASCII fraction', () => {
    expect(parseIngredientLine('1 ½ tsp smoked paprika')[0]).toMatchObject({
      amount: '1.5', unit: 'tsp', name: 'smoked paprika',
    });
    expect(parseIngredientLine('1 1/2 tsp smoked paprika')[0]).toMatchObject({
      amount: '1.5', unit: 'tsp', name: 'smoked paprika',
    });
    expect(parseIngredientLine('1-1/2 tsp smoked paprika')[0]).toMatchObject({
      amount: '1.5', unit: 'tsp', name: 'smoked paprika',
    });
  });

  it('detects quantity ranges and keeps the unit on the ingredient', () => {
    expect(parseIngredientLine('1-3 teaspoons paprika')).toEqual([
      { amount: '1-3', unit: 'teaspoons', name: 'paprika' },
    ]);
    expect(parseIngredientLine('1–3 teaspoons paprika')[0]).toMatchObject({
      amount: '1-3', unit: 'teaspoons', name: 'paprika',
    });
    expect(parseIngredientLine('1 to 3 teaspoons paprika')[0]).toMatchObject({
      amount: '1-3', unit: 'teaspoons', name: 'paprika',
    });
    expect(parseIngredientLine('2-3 cups flour')[0]).toMatchObject({
      amount: '2-3', unit: 'cups', name: 'flour',
    });
  });

  it('keeps the first of a metric/imperial dual measurement', () => {
    expect(parseIngredientLine('500g/1lb chicken')).toEqual([
      { amount: '500', unit: 'g', name: 'chicken' },
    ]);
    expect(parseIngredientLine('500 g / 1 lb chicken thighs')[0]).toMatchObject({
      amount: '500', unit: 'g', name: 'chicken thighs',
    });
    expect(parseIngredientLine('600g / 1.2 lb scotch fillet')[0]).toMatchObject({
      amount: '600', unit: 'g', name: 'scotch fillet',
    });
  });

  it('keeps ingredient subheadings on the following lines', () => {
    const parsed = parseRecipeText(`
Chilli con carne
Ingredients
1 tbsp olive oil
500g beef mince
Chili Spice Mix:
4 tsp paprika
2 tsp cumin
To Serve
Rice
Method
Brown the beef and simmer.
`);
    expect(parsed.ingredients).toEqual([
      { amount: '1', unit: 'tbsp', name: 'olive oil' },
      { amount: '500', unit: 'g', name: 'beef mince' },
      { amount: '4', unit: 'tsp', name: 'paprika', group: 'Chili Spice Mix' },
      { amount: '2', unit: 'tsp', name: 'cumin', group: 'Chili Spice Mix' },
      { amount: '', unit: '', name: 'Rice', group: 'To Serve' },
    ]);
  });

  it('still splits a shared each-list', () => {
    expect(parseIngredientLine('1 tsp each cumin, coriander, paprika')).toEqual([
      { amount: '1', unit: 'tsp', name: 'cumin' },
      { amount: '1', unit: 'tsp', name: 'coriander' },
      { amount: '1', unit: 'tsp', name: 'paprika' },
    ]);
  });
});
