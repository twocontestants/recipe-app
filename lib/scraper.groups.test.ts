import { describe, expect, it } from 'vitest';
import { ingredientsWithHtmlGroups, recipeFromHtml, schemaIngredients } from './scraper';

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
  it('decodes HTML entities in names and group headings', () => {
    expect(schemaIngredients([
      "1 tsp chef&#39;s salt",
      'For the chef&#39;s sauce:',
      '1 cup stock',
    ])).toEqual([
      { amount: '1', unit: 'tsp', name: "chef's salt" },
      { amount: '1', unit: 'cup', name: 'stock', group: "For the chef's sauce" },
    ]);
  });

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

  it('reads BBC Good Food headings inside one ingredients list', () => {
    const html = `
      <section class="ingredients-list">
        <h3 class="ingredients-list__heading">For the meat sauce</h3>
        <ul class="ingredients-list"><li><span>3 tbsp </span>olive oil</li></ul>
        <h3 class="ingredients-list__heading">For the white sauce (béchamel)</h3>
        <ul class="ingredients-list"><li>50g butter</li></ul>
      </section>
    `;
    const grouped = ingredientsWithHtmlGroups(html, [
      { amount: '3', unit: 'tbsp', name: 'olive oil' },
      { amount: '50', unit: 'g', name: 'butter' },
    ]);
    expect(grouped.map(ing => ing.group ?? null)).toEqual([
      'For the meat sauce',
      'For the white sauce (béchamel)',
    ]);
  });

  it('reads King Arthur section labels and skips the footnote', () => {
    const html = `
      <div class="ingredients-list">
        <div class="ingredient-section">
          <p>Cake</p>
          <ul><li>2 cups flour</li></ul>
        </div>
        <div class="ingredient-section">
          <p>Frosting</p>
          <ul><li>1 cup sugar</li></ul>
          <div class="ingredient-section__footnote"><p>*Substitute cocoa if you like; the frosting will taste different.</p></div>
        </div>
      </div>
    `;
    expect(ingredientsWithHtmlGroups(html, [])).toEqual([
      { amount: '2', unit: 'cups', name: 'flour', group: 'Cake' },
      { amount: '1', unit: 'cup', name: 'sugar', group: 'Frosting' },
    ]);
  });

  it('keeps one Nigella unit system when the other list is hidden', () => {
    const html = `
      <div class="ingredients">
        <header><h2>Ingredients</h2></header>
        <div class="part" data-switcher-state="visible">
          <h3>For the pumpkin filling:</h3>
          <ul><li>2 tbsp olive oil</li></ul>
        </div>
        <div class="part" data-switcher-state="visible">
          <h3>For the tomato sauce:</h3>
          <ul><li>700g passata</li></ul>
        </div>
        <div class="part" data-switcher-state="hidden">
          <h3>For the pumpkin filling:</h3>
          <ul><li>2 tablespoons olive oil</li></ul>
        </div>
        <div class="part" data-switcher-state="hidden">
          <h3>For the tomato sauce:</h3>
          <ul><li>3 cups passata</li></ul>
        </div>
      </div>
    `;
    expect(ingredientsWithHtmlGroups(html, [])).toEqual([
      { amount: '2', unit: 'tbsp', name: 'olive oil', group: 'For the pumpkin filling' },
      { amount: '700', unit: 'g', name: 'passata', group: 'For the tomato sauce' },
    ]);
  });

  it('reads Jetpack headings nested in the ingredient list', () => {
    const html = `
      <div class="jetpack-recipe-ingredients"><ul>
        <h5>Bolognese sauce</h5>
        <li>1 onion, chopped</li>
        <h5>Béchamel sauce</h5>
        <li>50g butter</li>
      </ul></div>
    `;
    expect(ingredientsWithHtmlGroups(html, []).map(ing => `${ing.group}: ${ing.name}`)).toEqual([
      'Bolognese sauce: onion, chopped',
      'Béchamel sauce: butter',
    ]);
  });

  it('reads grouped lists when the class names are generated', () => {
    const html = `
      <div class="ssrcss-wrapper">
        <h2 class="ssrcss-header">Ingredients</h2>
        <h3 class="ssrcss-section">For the ragu</h3>
        <div><ul><li>4 tbsp olive oil</li><li>2 carrots, finely chopped</li></ul></div>
        <h3>For the lasagne</h3>
        <div><ul><li>14 sheets fresh lasagne</li></ul></div>
        <h2>Method</h2>
        <h3>For the sauce</h3>
        <ul><li>Simmer until the sauce is thick.</li><li>Layer the pasta sheets.</li></ul>
      </div>
    `;
    const grouped = ingredientsWithHtmlGroups(html, []);
    expect(grouped.map(ing => ({ name: ing.name, group: ing.group ?? null }))).toEqual([
      { name: 'olive oil', group: 'For the ragu' },
      { name: 'carrots, finely chopped', group: 'For the ragu' },
      { name: 'fresh lasagne', group: 'For the lasagne' },
    ]);
  });

  it('does not use the recipe title as a group when the list is flat', () => {
    const html = `
      <article>
        <h2>Turkey Taco Skillet</h2>
        <div class="wprm-recipe-ingredients-container">
          <h3>Ingredients</h3>
          <ul>
            <li class="wprm-recipe-ingredient">1 tsp olive oil</li>
            <li class="wprm-recipe-ingredient">1 onion</li>
          </ul>
        </div>
        <h2>Method</h2>
        <h3>For the sauce</h3>
        <ul><li>Simmer until thick.</li><li>Serve warm.</li></ul>
      </article>
    `;
    const parsed = [
      { amount: '1', unit: 'tsp', name: 'olive oil' },
      { amount: '1', unit: '', name: 'onion' },
    ];
    expect(ingredientsWithHtmlGroups(html, parsed)).toEqual(parsed);
  });

  it('does not treat a method heading as an ingredient group', () => {
    const html = `
      <article>
        <h2>Ingredients</h2>
        <ul><li>1 onion</li><li>2 carrots</li></ul>
        <h2>Method</h2>
        <h3>For the sauce</h3>
        <ul><li>Simmer until the sauce is thick.</li><li>Add the pasta sheets.</li></ul>
      </article>
    `;
    const parsed = [
      { amount: '1', unit: '', name: 'onion' },
      { amount: '2', unit: '', name: 'carrots' },
    ];
    expect(ingredientsWithHtmlGroups(html, parsed)).toEqual(parsed);
  });
});

describe('recipeFromHtml', () => {
  it('reads Jetpack directions when schema.org has no steps', () => {
    const html = `
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Recipe","name":"Lasagna","recipeIngredient":["1 onion"]}
      </script>
      <div class="jetpack-recipe-directions">
        <p></p>
        <p>Pulse the onion until finely chopped.</p>
        <p>Simmer the sauce for three hours.</p>
      </div>
    `;
    const recipe = recipeFromHtml(html);
    expect(recipe.steps).toEqual([
      'Pulse the onion until finely chopped.',
      'Simmer the sauce for three hours.',
    ]);
  });

  it('parses JSON-LD that contains a raw line break', () => {
    const html = `
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Recipe","name":"Bone Broth","recipeIngredient":["2 tablespoons vinegar","1 onion, chopped"],"author":{"@type":"Person","description":"Line one
Expertise: cook"}}
      </script>
    `;
    const recipe = recipeFromHtml(html);
    expect(recipe.title).toBe('Bone Broth');
    expect(recipe.ingredients.map(ing => ing.name)).toEqual(['vinegar', 'onion, chopped']);
  });
});
