export const STOCK_LIMIT = 2147483647;

type RecipeComponent = {
  quantity: number;
  ingredient: { available: number };
};

export function availableServings(recipe: RecipeComponent[], fallback: number) {
  return recipe.reduce(
    (limit, { quantity, ingredient }) => Math.min(limit, Math.floor(ingredient.available / quantity)),
    recipe.length ? STOCK_LIMIT : fallback,
  );
}
