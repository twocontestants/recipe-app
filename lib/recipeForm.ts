import type { Ingredient, Recipe } from './db';

export type RecipeFormState = {
  title: string;
  description: string;
  source_url: string;
  image_url: string;
  servings: number;
  prep_time: number | undefined;
  cook_time: number | undefined;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  primary_protein: string;
};

export const EMPTY_RECIPE_FORM: RecipeFormState = {
  title: '',
  description: '',
  source_url: '',
  image_url: '',
  servings: 4,
  prep_time: undefined,
  cook_time: undefined,
  ingredients: [{ amount: '', unit: '', name: '' }],
  steps: [''],
  tags: [],
  primary_protein: '',
};

export function emptyRecipeForm(): RecipeFormState {
  return {
    ...EMPTY_RECIPE_FORM,
    ingredients: [{ amount: '', unit: '', name: '' }],
    steps: [''],
    tags: [],
  };
}

export function recipeToForm(recipe: Recipe): RecipeFormState {
  return {
    title: recipe.title,
    description: recipe.description || '',
    source_url: recipe.source_url || '',
    image_url: recipe.image_url || '',
    servings: recipe.servings,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    ingredients: (recipe.ingredients && recipe.ingredients.length > 0)
      ? recipe.ingredients
      : [{ amount: '', unit: '', name: '' }],
    steps: (recipe.steps && recipe.steps.length > 0) ? recipe.steps : [''],
    tags: recipe.tags,
    primary_protein: recipe.primary_protein || '',
  };
}

export function recipeFormPayload(form: RecipeFormState) {
  return {
    ...form,
    ingredients: form.ingredients.filter(i => i.name.trim()),
    steps: form.steps.filter(s => s.trim()),
  };
}
