import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { IngredientDto, RecipeDto } from './inventory.dto';
import { PrismaService } from './prisma.service';
import { STOCK_LIMIT } from './stock-quantity';

@Injectable()
export class InventoryService {
  constructor(private readonly db: PrismaService) {}

  list() {
    return this.db.ingredient.findMany({ orderBy: { code: 'asc' } });
  }

  async create(dto: IngredientDto) {
    if (!dto.name.trim()) {
      throw new BadRequestException('Ingredient name is required');
    }
    try {
      return await this.db.ingredient.create({ data: { ...dto, name: dto.name.trim() } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ingredient code already exists');
      }
      throw error;
    }
  }

  async movements(ingredientId: string) {
    const ingredient = await this.db.ingredient.findUnique({ where: { id: ingredientId } });
    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }
    return this.db.stockMovement.findMany({
      where: { ingredientId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  receive(ingredientId: string, quantity: number, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const [ingredient] = await tx.$queryRaw<{ available: number }[]>`
        SELECT "available" FROM "Ingredient" WHERE id = ${ingredientId} FOR UPDATE
      `;
      if (!ingredient) {
        throw new NotFoundException('Ingredient not found');
      }
      // Keep room for any outstanding reservations that can still be released.
      const { _sum } = await tx.stockMovement.aggregate({
        where: {
          ingredientId,
          type: StockMovementType.RESERVE,
          order: { status: { in: ['PENDING', 'PAYMENT_FAILED', 'PAID'] } },
        },
        _sum: { quantity: true },
      });
      if (ingredient.available + (_sum.quantity ?? 0) + quantity > STOCK_LIMIT) {
        throw new BadRequestException('Ingredient stock exceeds the supported range');
      }
      const updated = await tx.ingredient.update({
        where: { id: ingredientId },
        data: { available: { increment: quantity } },
      });
      await tx.stockMovement.create({
        data: { ingredientId, quantity, actorId, type: StockMovementType.RECEIPT },
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async recipe(kind: 'size' | 'topping', id: string) {
    const select = { recipe: { select: { ingredientId: true, quantity: true } } };
    const option = kind === 'size'
      ? await this.db.productSize.findUnique({ where: { id }, select })
      : await this.db.productTopping.findUnique({ where: { id }, select });
    if (!option) {
      throw new NotFoundException('Menu option not found');
    }
    return { id, ingredients: option.recipe };
  }

  setRecipe(kind: 'size' | 'topping', id: string, { ingredients }: RecipeDto) {
    return this.db.$transaction(async (tx) => {
      const option = kind === 'size'
        ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "ProductSize" WHERE id = ${id} FOR UPDATE`
        : await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "ProductTopping" WHERE id = ${id} FOR UPDATE`;
      if (!option.length) {
        throw new NotFoundException('Menu option not found');
      }
      const count = await tx.ingredient.count({
        where: { id: { in: ingredients.map(({ ingredientId }) => ingredientId) } },
      });
      if (count !== ingredients.length) {
        throw new BadRequestException('Recipe contains an unknown ingredient');
      }
      if (kind === 'size') {
        await tx.recipeIngredient.deleteMany({ where: { sizeId: id } });
        await tx.recipeIngredient.createMany({ data: ingredients.map(line => ({ ...line, sizeId: id })) });
      } else {
        await tx.toppingIngredient.deleteMany({ where: { toppingId: id } });
        await tx.toppingIngredient.createMany({ data: ingredients.map(line => ({ ...line, toppingId: id })) });
      }
      return { id, ingredients };
    });
  }

  async reserve(tx: Prisma.TransactionClient, orderId: string, actorId: string, demand: Map<string, number>) {
    for (const [ingredientId, quantity] of [...demand].sort(([a], [b]) => a.localeCompare(b))) {
      if (quantity > STOCK_LIMIT) {
        throw new BadRequestException('Not enough ingredient stock for this order');
      }
      const result = await tx.ingredient.updateMany({
        where: { id: ingredientId, available: { gte: quantity } },
        data: { available: { decrement: quantity } },
      });
      if (result.count !== 1) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: ingredientId }, select: { name: true } });
        throw new BadRequestException(`Not enough stock: ${ingredient?.name ?? ingredientId}`);
      }
      await tx.stockMovement.create({
        data: { orderId, ingredientId, quantity, actorId, type: StockMovementType.RESERVE },
      });
    }
  }

  async release(tx: Prisma.TransactionClient, orderId: string, actorId: string) {
    const reservations = await tx.stockMovement.findMany({
      where: { orderId, type: StockMovementType.RESERVE },
      select: { ingredientId: true, quantity: true },
    });
    for (const { ingredientId, quantity } of reservations.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId))) {
      await tx.ingredient.update({ where: { id: ingredientId }, data: { available: { increment: quantity } } });
      await tx.stockMovement.create({
        data: { orderId, ingredientId, quantity, actorId, type: StockMovementType.RELEASE },
      });
    }
  }
}
