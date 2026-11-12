import { IngredientUnit, PrismaClient } from '@prisma/client';

const ingredients = [
  ['OAT-MILK', 'Sữa yến mạch', 'ML', 20000],
  ['MATCHA', 'Bột matcha', 'G', 400],
  ['CREAM', 'Kem sữa', 'ML', 10000],
  ['MILK', 'Sữa tươi', 'ML', 30000],
  ['ESPRESSO', 'Espresso', 'ML', 20000],
  ['BROWN-SUGAR', 'Đường nâu', 'G', 2500],
  ['COLD-BREW', 'Cold brew', 'ML', 20000],
  ['ORANGE-JUICE', 'Nước cam', 'ML', 12000],
  ['STRAWBERRY', 'Dâu tây', 'G', 10000],
  ['STRAWBERRY-JELLY', 'Thạch dâu', 'G', 5000],
  ['CARAMEL', 'Sốt caramel', 'ML', 3000],
  ['SALT', 'Muối', 'G', 200],
  ['JASMINE-TEA', 'Trà lài', 'ML', 20000],
  ['PEACH', 'Đào ngâm', 'G', 8000],
  ['TAPIOCA', 'Trân châu', 'G', 5000],
  ['CHEESE-FOAM', 'Kem cheese', 'ML', 5000],
] as const satisfies ReadonlyArray<readonly [string, string, IngredientUnit, number]>;

type IngredientCode = typeof ingredients[number][0];
type Recipe = Partial<Record<IngredientCode, number>>;

const mediumRecipes: Record<string, Recipe> = {
  'cloud-matcha': { 'OAT-MILK': 200, MATCHA: 4, CREAM: 20 },
  'brown-sugar-latte': { ESPRESSO: 40, MILK: 180, 'BROWN-SUGAR': 20 },
  'cold-brew-orange': { 'COLD-BREW': 160, 'ORANGE-JUICE': 80 },
  'strawberry-milk': { STRAWBERRY: 60, MILK: 180, 'STRAWBERRY-JELLY': 40 },
  'salted-caramel': { ESPRESSO: 40, MILK: 160, CARAMEL: 20, CREAM: 20, SALT: 2 },
  'jasmine-peach': { 'JASMINE-TEA': 180, PEACH: 60, 'ORANGE-JUICE': 40 },
};

const toppingRecipes: Record<string, Recipe> = {
  'Trân châu': { TAPIOCA: 30 },
  'Kem cheese': { 'CHEESE-FOAM': 30 },
  'Shot espresso': { ESPRESSO: 30 },
};

const scale: Record<string, number> = { S: 0.75, M: 1, L: 1.25 };

export async function seedInventory(db: PrismaClient, catalogOnly: boolean) {
  const ids = new Map<string, string>();
  for (const [code, name, unit, demoStock] of ingredients) {
    const available = catalogOnly ? 0 : demoStock;
    const { id } = await db.ingredient.upsert({
      where: { code },
      update: {},
      create: {
        code, name, unit, available,
        movements: available ? { create: { type: 'RECEIPT', quantity: available } } : undefined,
      },
    });
    ids.set(code, id);
  }
  const lines = (recipe: Recipe, multiplier: number) =>
    Object.entries(recipe).map(([code, quantity]) => ({
      ingredientId: ids.get(code)!,
      quantity: Math.round(quantity * multiplier),
    }));

  const products = await db.product.findMany({
    where: { slug: { in: Object.keys(mediumRecipes) } },
    include: { sizes: { include: { recipe: true } }, toppings: { include: { recipe: true } } },
  });
  for (const product of products) {
    for (const size of product.sizes) {
      if (!size.recipe.length && scale[size.name]) {
        await db.recipeIngredient.createMany({
          data: lines(mediumRecipes[product.slug], scale[size.name]).map(line => ({ ...line, sizeId: size.id })),
          skipDuplicates: true,
        });
      }
    }
    for (const topping of product.toppings) {
      const recipe = toppingRecipes[topping.name];
      if (!topping.recipe.length && recipe) {
        await db.toppingIngredient.createMany({
          data: lines(recipe, 1).map(line => ({ ...line, toppingId: topping.id })),
          skipDuplicates: true,
        });
      }
    }
  }
}
