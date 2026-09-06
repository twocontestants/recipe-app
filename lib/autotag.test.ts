import { describe, expect, it } from 'vitest';
import type { Ingredient } from './db';
import { autoTag, inferProtein } from './autotag';

function ings(...names: string[]): Ingredient[] {
  return names.map(name => ({ name, amount: '1', unit: '' }));
}

describe('inferProtein', () => {
  it('prefers the protein named in the title', () => {
    expect(inferProtein('Chicken Tikka Masala', ings('chicken thigh', 'yogurt', 'garam masala'))).toBe('chicken');
  });

  it('does not treat stock, sauce, or paste as the main protein', () => {
    expect(inferProtein('Vegetable soup', ings('chicken stock', 'carrot', 'onion', 'fish sauce'))).toBeUndefined();
  });

  it('does not treat eggplant as eggs', () => {
    expect(inferProtein('Eggplant parmesan', ings('1 large eggplant', 'mozzarella'))).toBeUndefined();
  });

  it('reads the method when the ingredient line is generic', () => {
    expect(
      inferProtein(
        'Weeknight fillets',
        ings('4 fillets', 'salt', 'lemon'),
        ['Season the salmon and bake until just opaque.'],
      ),
    ).toBe('fish');
  });

  it('keeps chicken as primary when bacon is only a garnish', () => {
    expect(
      inferProtein(
        'Chicken carbonara',
        ings('chicken breast', 'bacon', 'egg', 'parmesan'),
        ['Fry the bacon, then add the chicken.'],
      ),
    ).toBe('chicken');
  });

  it('still selects pork when bacon or pancetta is the star', () => {
    expect(inferProtein('Carbonara', ings('pancetta', 'egg', 'spaghetti'))).toBe('pork');
  });

  it('finds seafood mentioned only in the method', () => {
    expect(
      inferProtein('Garlic noodles', ings('noodles', 'garlic', 'butter'), ['Toss through the prawns at the end.']),
    ).toBe('seafood');
  });

  it('does not assume beef from vegetarian mince', () => {
    expect(inferProtein('Veggie bolognese', ings('plant-based mince', 'tomato'), ['Brown the mince.'])).toBeUndefined();
  });

  it('uses plain mince as beef when no other protein is named', () => {
    expect(inferProtein('Cottage pie', ings('500g mince', 'potato'))).toBe('beef');
  });

  it('selects legumes from chickpeas or lentils', () => {
    expect(inferProtein('Dal', ings('red lentils', 'onion', 'turmeric'))).toBe('legumes');
  });
});

describe('autoTag', () => {
  it('keeps existing tags and adds dish tags from the title', () => {
    const { primary_protein, tags } = autoTag('Chicken curry', ings('chicken thigh', 'curry powder'), ['family']);
    expect(primary_protein).toBe('chicken');
    expect(tags).toEqual(expect.arrayContaining(['family', 'curry']));
  });

  it('tags spicy from chilli in the ingredients, not from black pepper', () => {
    const spicy = autoTag('Tacos', ings('beef mince', 'chilli flakes', 'cumin'));
    expect(spicy.tags).toContain('spicy');
    expect(spicy.primary_protein).toBe('beef');

    const mild = autoTag('Mash', ings('potato', 'black pepper', 'butter'));
    expect(mild.tags).not.toContain('spicy');
  });

  it('does not treat capsicum or bell pepper as spicy', () => {
    const { tags } = autoTag('Fajita veg', ings('capsicum', 'bell pepper', 'onion'));
    expect(tags).not.toContain('spicy');
  });

  it('tags oven from the method and ignores a dutch oven', () => {
    const oven = autoTag(
      'Tray salmon',
      ings('salmon fillet', 'broccoli'),
      [],
      ['Preheat the oven to 200C. Roast for 15 minutes.'],
    );
    expect(oven.primary_protein).toBe('fish');
    expect(oven.tags).toEqual(expect.arrayContaining(['oven', 'roast']));

    const stew = autoTag(
      'Bean stew',
      ings('cannellini beans', 'tomato'),
      [],
      ['Simmer in a Dutch oven until thick.'],
    );
    expect(stew.tags).not.toContain('oven');
    expect(stew.primary_protein).toBe('legumes');
  });

  it('tags air-fryer and slow-cooker from cooking method wording', () => {
    const air = autoTag(
      'Crispy thighs',
      ings('chicken thigh'),
      [],
      ['Air fry at 200C for 18 minutes, turning once.'],
    );
    expect(air.tags).toContain('air-fryer');
    expect(air.primary_protein).toBe('chicken');

    const slow = autoTag(
      'Pulled pork',
      ings('pork shoulder'),
      [],
      ['Cook in the slow cooker on low for 8 hours.'],
    );
    expect(slow.tags).toContain('slow-cooker');
    expect(slow.primary_protein).toBe('pork');

    const crock = autoTag('Beef ragu', ings('beef brisket'), [], ['Crockpot on low all day.']);
    expect(crock.tags).toContain('slow-cooker');
  });

  it('tags grill, pressure-cooker, microwave, stovetop, and steam', () => {
    expect(autoTag('Steak', ings('sirloin'), [], ['Grill over high heat.']).tags).toContain('grill');
    expect(autoTag('Chickpeas', ings('dried chickpeas'), [], ['Pressure cook for 25 minutes.']).tags).toContain(
      'pressure-cooker',
    );
    expect(autoTag('Mug cake', ings('flour', 'cocoa'), [], ['Microwave for 90 seconds.']).tags).toContain('microwave');
    expect(autoTag('Eggs', ings('eggs'), [], ['Cook on the stovetop until just set.']).tags).toEqual(
      expect.arrayContaining(['stovetop']),
    );
    expect(autoTag('Buns', ings('bao dough'), [], ['Steam in a bamboo steamer for 10 minutes.']).tags).toContain(
      'steam',
    );
  });

  it('tags one-pot and sheet-pan from title or method', () => {
    expect(autoTag('One-pot pasta', ings('penne', 'tomato')).tags).toEqual(
      expect.arrayContaining(['one-pot', 'pasta']),
    );
    expect(autoTag('Dinner', ings('chicken', 'potato'), [], ['Spread on a sheet pan.']).tags).toContain('sheet-pan');
  });

  it('does not tag bake from baking powder or a no-bake title', () => {
    expect(autoTag('Pancakes', ings('flour', 'baking powder', 'egg')).tags).not.toContain('bake');
    expect(autoTag('No-bake cheesecake', ings('cream cheese', 'biscuit')).tags).not.toContain('bake');
  });

  it('does not tag soup just because an ingredient is broth', () => {
    expect(autoTag('Risotto', ings('arborio rice', 'chicken broth', 'parmesan')).tags).not.toContain('soup');
    expect(autoTag('Chicken noodle soup', ings('chicken', 'noodles')).tags).toContain('soup');
  });

  it('marks clearly plant-based mains vegetarian', () => {
    const { primary_protein, tags } = autoTag('Lentil dal', ings('red lentils', 'onion'));
    expect(primary_protein).toBe('legumes');
    expect(tags).toContain('vegetarian');
  });

  it('does not mark a lentil dish vegetarian when the method uses meat', () => {
    const { tags } = autoTag(
      'Lentil dal',
      ings('red lentils'),
      [],
      ['Stir through leftover roast chicken at the end.'],
    );
    expect(tags).not.toContain('vegetarian');
  });
});
