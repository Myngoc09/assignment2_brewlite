import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { availableServings } from './stock-quantity';

const recipe = { include: { ingredient: { select: { available: true } } } } as const;
const options = {
  sizes: { include: { recipe } },
  toppings: { include: { recipe } },
} satisfies Prisma.ProductInclude;

function withAvailability(product: Prisma.ProductGetPayload<{ include: typeof options }>) {
  const sizes = product.sizes.map(({ recipe, ...size }) => ({
    ...size,
    availableQuantity: availableServings(recipe, product.inventory),
    usesProductStock: recipe.length === 0,
  }));
  const toppings = product.toppings.map(({ recipe, ...topping }) => ({
    ...topping,
    availableQuantity: recipe.length ? availableServings(recipe, 0) : null,
  }));
  return {
    ...product,
    inventory: sizes.length ? Math.max(...sizes.map(size => size.availableQuantity)) : product.inventory,
    sizes,
    toppings,
  };
}

@Controller('products')
export class ProductsController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async list() {
    const products = await this.db.product.findMany({
      where: { active: true },
      include: options,
      orderBy: { name: 'asc' },
    });
    return products.map(withAvailability);
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const product = await this.db.product.findFirst({
      where: { active: true, OR: [{ id }, { slug: id }] },
      include: options,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return withAvailability(product);
  }
}
