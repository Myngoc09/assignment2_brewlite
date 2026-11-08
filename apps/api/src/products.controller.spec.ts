import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from './prisma.service';
import { ProductsController } from './products.controller';

describe('catalog', () => {
  const product = { id: 'cloud-matcha', sizes: [], toppings: [] };

  it('lists active products with options', async () => {
    const findMany = jest.fn(async () => [product]);
    const db = { product: { findMany } } as unknown as PrismaService;
    await expect(new ProductsController(db).list()).resolves.toEqual([product]);
    expect(findMany).toHaveBeenCalledWith({
      where: { active: true },
      include: { sizes: true, toppings: true },
      orderBy: { name: 'asc' },
    });
  });

  it('returns 404 when the requested product is unavailable', async () => {
    const findFirst = jest.fn(async () => null);
    const db = { product: { findFirst } } as unknown as PrismaService;
    await expect(new ProductsController(db).one('unknown')).rejects.toBeInstanceOf(NotFoundException);
  });
});
