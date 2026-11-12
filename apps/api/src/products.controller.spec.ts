import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from './prisma.service';
import { ProductsController } from './products.controller';

describe('catalog', () => {
  const product = {
    id: 'cloud-matcha', inventory: 100,
    sizes: [
      { name: 'S', recipe: [{ quantity: 3, ingredient: { available: 24 } }] },
      { name: 'L', recipe: [{ quantity: 5, ingredient: { available: 24 } }] },
    ],
    toppings: [],
  };

  it('lists active products with options', async () => {
    const findMany = jest.fn(async () => [product]);
    const db = { product: { findMany } } as unknown as PrismaService;
    await expect(new ProductsController(db).list()).resolves.toEqual([{
      id: product.id, inventory: 8,
      sizes: [
        { name: 'S', availableQuantity: 8, usesProductStock: false },
        { name: 'L', availableQuantity: 4, usesProductStock: false },
      ],
      toppings: [],
    }]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { active: true },
      orderBy: { name: 'asc' },
    }));
  });

  it('returns 404 when the requested product is unavailable', async () => {
    const findFirst = jest.fn(async () => null);
    const db = { product: { findFirst } } as unknown as PrismaService;
    await expect(new ProductsController(db).one('unknown')).rejects.toBeInstanceOf(NotFoundException);
  });
});
