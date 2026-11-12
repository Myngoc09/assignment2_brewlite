import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, Promotion } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CartDto, PayDto, StatusDto, statusTransitions } from './orders.dto';
import { linePrice, orderDiscount } from './order-pricing';

const unpaidStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED];

@Injectable()
export class OrdersService {
  constructor(private db: PrismaService) {}

  async create(userId: string, d: CartDto) {
    return this.db.$transaction(async (tx) => {
      let subtotal = 0;
      const lines: Array<Prisma.OrderItemCreateWithoutOrderInput & { productId: string }> = [];

      for (const line of d.items) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          include: {
            sizes: true,
            toppings: true,
          },
        });

        if (!product || !product.active) {
          throw new BadRequestException('Product unavailable');
        }

        const size = product.sizes.find((item) => item.name === line.size);
        const toppingNames = line.toppings ?? [];
        const toppings = product.toppings.filter((item) =>
          toppingNames.includes(item.name),
        );

        if (!size || toppings.length !== toppingNames.length) {
          throw new BadRequestException('Invalid size or topping');
        }

        if (product.inventory < line.quantity) {
          throw new BadRequestException(
            `${product.name} is out of stock`,
          );
        }

        const { unitPrice, lineTotal } = linePrice(
          size.priceCents, toppings.map(topping => topping.priceCents), line.quantity,
        );

        subtotal += lineTotal;
        if (subtotal > 2147483647) {
          throw new BadRequestException('Order subtotal exceeds the supported range');
        }

        lines.push({
          productId: product.id,
          product: { connect: { id: product.id } },
          productName: product.name,
          size: line.size,
          toppings: toppingNames,
          quantity: line.quantity,
          unitPriceCents: unitPrice,
          lineTotalCents: lineTotal,
        });
      }

      let promotion: Promotion | null = null;

      if (d.promotionCode) {
        promotion = await tx.promotion.findFirst({
          where: {
            code: d.promotionCode.toUpperCase(),
            active: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        });

        if (!promotion) {
          throw new BadRequestException('Promotion invalid or expired');
        }
      }

      const discount = orderDiscount(subtotal, promotion?.discountPercent ?? 0);

      // Acquire stock locks in the same order across multi-product carts.
      for (const line of [...lines].sort((a, b) => a.productId.localeCompare(b.productId))) {
        const result = await tx.product.updateMany({
          where: {
            id: line.productId,
            active: true,
            inventory: { gte: line.quantity },
          },
          data: {
            inventory: { decrement: line.quantity },
          },
        });

        if (result.count !== 1) {
          throw new BadRequestException(
            `${line.productName} is out of stock`,
          );
        }
      }

      return tx.order.create({
        data: {
          orderNumber: `BL-${randomUUID().toUpperCase()}`,
          userId,
          subtotalCents: subtotal,
          discountCents: discount,
          totalCents: subtotal - discount,
          promotionId: promotion?.id,
          statusHistory: { create: { status: 'PENDING', changedById: userId } },
          items: {
            create: lines.map(({ productId, ...item }) => item),
          },
        },
        include: {
          items: true,
        },
      });
    });
  }

  async pay(userId: string, id: string, key: string | undefined, d: PayDto) {
    if (!key || key.length < 8 || key.length > 128) {
      throw new BadRequestException('Idempotency-Key must have 8–128 characters');
    }

    const succeeded = d.simulate !== 'fail';
    const status = succeeded ? 'PAID' : 'PAYMENT_FAILED';

    return this.db.$transaction(async (tx) => {
      // Serialize payment attempts and cancellation on the order row.
      const [current] = await tx.$queryRaw<{ status: OrderStatus; totalCents: number }[]>`
        SELECT status::text, "totalCents" FROM "Order"
        WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE
      `;
      if (!current) {
        throw new NotFoundException('Order not found');
      }
      const prior = await tx.payment.findUnique({
        where: { orderId_idempotencyKey: { orderId: id, idempotencyKey: key } },
        include: { order: true },
      });
      if (prior) {
        return { payment: prior, order: prior.order, replayed: true };
      }
      if (!unpaidStatuses.includes(current.status)) {
        throw new ConflictException('Order is not payable');
      }
      const attemptTime = Date.now();
      const retry = current.status === OrderStatus.PAYMENT_FAILED;
      if (retry) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: id, status: OrderStatus.PENDING, changedById: userId,
            changedAt: new Date(attemptTime),
          },
        });
      }
      const updatedOrder = await tx.order.update({ where: { id }, data: { status } });

      const payment = await tx.payment.create({
        data: {
          orderId: id,
          method: d.method,
          idempotencyKey: key,
          status: succeeded ? 'SUCCEEDED' : 'FAILED',
          providerReference: `MOCK-${randomUUID()}`,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id, status, changedById: userId,
          changedAt: new Date(attemptTime + (retry ? 1 : 0)),
        },
      });
      if (succeeded) {
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            orderId: id,
            type: 'EARN',
            points: Math.floor(current.totalCents / 10000),
          },
        });
      }

      return { payment, order: updatedOrder, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  mine(userId: string) {
    return this.db.order.findMany({
      where: { userId },
      include: {
        items: true,
        payments: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async loyalty(userId: string) {
    const { _sum } = await this.db.loyaltyTransaction.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return { points: _sum.points ?? 0 };
  }

  async one(userId: string, id: string) {
    const order = await this.db.order.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        items: true,
        payments: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async status(userId: string, staff: boolean, id: string, status: StatusDto['status']) {
    if (!staff && status !== 'CANCELLED') {
      throw new ForbiddenException('Staff role required');
    }

    const owner = staff ? {} : { userId };
    const order = await this.db.order.findFirst({ where: { id, ...owner }, select: { id: true } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    try {
      if (status === 'CANCELLED') {
        return await this.db.$transaction(async (tx) => {
          const cancelled = await tx.order.update({
            where: { id, ...owner, status: { in: staff ? statusTransitions.CANCELLED : unpaidStatuses } },
            data: { status, statusHistory: { create: { status, changedById: userId } } },
            include: { items: true },
          });
          for (const item of [...cancelled.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
            await tx.product.update({
              where: { id: item.productId },
              data: { inventory: { increment: item.quantity } },
            });
          }
          return cancelled;
        });
      }
      return await this.db.order.update({
        where: { id, status: { in: statusTransitions[status] } },
        data: {
          status,
          statusHistory: { create: { status, changedById: userId } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException('Order cannot move to that status');
      }
      throw error;
    }
  }
}
