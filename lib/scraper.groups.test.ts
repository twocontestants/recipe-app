import { describe, expect, it } from 'vitest';
import { ingredientsWithHtmlGroups, schemaIngredients } from './scraper';

const WPRM = `
<div class="wprm-recipe-ingredients-container">
  <h3 class="wprm-recipe-ingredients-header">Ingredients</h3>
  <div class="wprm-recipe-ingredient-group">
    <ul class="wprm-recipe-ingredients">
      <li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">1</span> <span class="wprm-recipe-ingredient-unit">tbsp</span> <span class="wprm-recipe-ingredient-name">olive oil</span></li>
    </ul>
  </div>
  <div class="wprm-recipe-ingredient-group">
    <h4 class="wprm-recipe-group-name wprm-recipe-ingredient-group-name">Chili Spice Mix:</h4>
    <ul class="wprm-recipe-ingredients">
      <li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">4</span> <span class="wprm-recipe-ingredient-unit">tsp</span> <span class="wprm-recipe-ingredient-name">paprika powder</span></li>
    </ul>
  </div>
  <div class="wprm-recipe-ingredient-group">
    <h4 class="wprm-recipe-ingredient-group-name">To Serve</h4>
    <ul class="wprm-recipe-ingredients">
      <li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-name">Rice, corn chips</span></li>
    </ul>
  </div>
</div>
`;

const CHECKLIST = `
<div class="recipe-checklist">
  <h2 class="recipe-checklist__title">Ingredients</h2>
  <div class="recipe-checklist__section">
    <h3 class="recipe-checklist__title"></h3>
    <ul class="recipe-checklist__list">
      <li><label class="recipe-checklist__label">1 whole duck</label></li>
    </ul>
  </div>
  <div class="recipe-checklist__section">
    <h3 class="recipe-checklist__title">Celeriac Puree</h3>
    <ul class="recipe-checklist__list">
      <li><label class="recipe-checklist__label">1 celeriac</label></li>
      <li><label class="recipe-checklist__label">200ml milk</label></li>
    </ul>
  </div>
  <div class="recipe-checklist__section">
    <h3 class="recipe-checklist__title"></h3>
    <ul class="recipe-checklist__list">
      <li><label class="recipe-checklist__label">salt and pepper, to taste</label></li>
    </ul>
  </div>
  <div class="recipe-checklist__section">
    <h3 class="recipe-checklist__title">To Garnish</h3>
    <ul class="recipe-checklist__list">
      <li><label class="recipe-checklist__label">8 segments of orange</label></li>
    </ul>
  </div>
</div>
`;

describe('schemaIngredients', () => {
  it('keeps colon and label subheadings from a flat schema list', () => {
    expect(schemaIngredients([
      '1 tbsp olive oil',
      'Chili Spice Mix:',
      '4 tsp paprika powder',
      'To Serve',
      'Rice',
    ])).toEqual([
      { amount: '1', unit: 'tbsp', name: 'olive oil' },
      { amount: '4', unit: 'tsp', name: 'paprika powder', group: 'Chili Spice Mix' },
      { amount: '', unit: '', name: 'Rice', group: 'To Serve' },
    ]);
  });

  it('reads grouped objects', () => {
    expect(schemaIngredients([
      { name: 'Sauce', ingredients: ['1 cup stock'] },
      { heading: 'To serve', ingredients: ['Rice'] },
    ])).toEqual([
      { amount: '1', unit: 'cup', name: 'stock', group: 'Sauce' },
      { amount: '', unit: '', name: 'Rice', group: 'To serve' },
    ]);
  });
});

describe('ingredientsWithHtmlGroups', () => {
  it('stamps WP Recipe Maker groups onto the schema list without rewriting notes', () => {
    const grouped = ingredientsWithHtmlGroups(WPRM, [
      { amount: '1', unit: 'tbsp', name: 'olive oil' },
      { amount: '4', unit: 'tsp', name: 'paprika powder (Note 2)' },
      { amount: '', unit: '', name: 'Rice, corn chips, tortillas (Note 5)' },
    ]);
    expect(grouped).toEqual([
      { amount: '1', unit: 'tbsp', name: 'olive oil' },
      { amount: '4', unit: 'tsp', name: 'paprika powder (Note 2)', group: 'Chili Spice Mix' },
      { amount: '', unit: '', name: 'Rice, corn chips, tortillas (Note 5)', group: 'To Serve' },
    ]);
  });

  it('uses the checklist when schema.org dropped the ungrouped sections', () => {
    const grouped = ingredientsWithHtmlGroups(CHECKLIST, [
      { amount: '1', unit: '', name: 'celeriac' },
      { amount: '200', unit: 'ml', name: 'milk' },
    ]);
    expect(grouped.map(ing => ({ name: ing.name, group: ing.group ?? null }))).toEqual([
      { name: 'whole duck', group: null },
      { name: 'celeriac', group: 'Celeriac Puree' },
      { name: 'milk', group: 'Celeriac Puree' },
      { name: 'salt and pepper, to taste', group: null },
      { name: 'segments of orange', group: 'To Garnish' },
    ]);
  });

  it('reads sibling ingredient lists with headings', () => {
    const html = `
      <h4>For the cake</h4>
      <ul class="ingredients"><li>2 cups flour</li></ul>
      <h4>For the frosting</h4>
      <ul class="ingredients"><li>1 cup sugar</li></ul>
    `;
    const grouped = ingredientsWithHtmlGroups(html, []);
    expect(grouped).toEqual([
      { amount: '2', unit: 'cups', name: 'flour', group: 'For the cake' },
      { amount: '1', unit: 'cup', name: 'sugar', group: 'For the frosting' },
    ]);
  });

  it('leaves a flat list unchanged when the page has no subheadings', () => {
    const html = `<ul class="ingredients"><li>1 onion</li><li>2 carrots</li></ul>`;
    const parsed = [
      { amount: '1', unit: '', name: 'onion' },
      { amount: '2', unit: '', name: 'carrots' },
    ];
    expect(ingredientsWithHtmlGroups(html, parsed)).toEqual(parsed);
  });
});
