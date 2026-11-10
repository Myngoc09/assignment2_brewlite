import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, Prisma, Promotion } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { linePrice, orderDiscount } from './order-pricing';

class Line {
  @IsString()
  productId!: string;

  @IsString()
  size!: string;

  @IsArray()
  @IsString({ each: true })
  toppings!: string[];

  @IsInt()
  @Min(1)
  quantity!: number;
}

class CartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Line)
  items!: Line[];

  @IsOptional()
  @IsString()
  promotionCode?: string;
}

class PayDto {
  @IsIn(['MOCK_WALLET', 'MOCK_CARD'])
  method!: 'MOCK_WALLET' | 'MOCK_CARD';

  @IsOptional()
  @IsIn(['success', 'fail'])
  simulate?: 'success' | 'fail';
}

class PaymentRequestDto extends PayDto {
  @IsString()
  orderId!: string;
}

const statusTransitions = {
  PREPARING: [OrderStatus.PAID],
  READY: [OrderStatus.PREPARING],
  COMPLETED: [OrderStatus.READY],
  CANCELLED: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED, OrderStatus.PAID],
};

const unpaidStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED];

class StatusDto {
  @IsIn(Object.keys(statusTransitions))
  status!: keyof typeof statusTransitions;
}

@Controller()
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private db: PrismaService) {}

  @Post('orders')
  async create(@Req() req: any, @Body() d: CartDto) {
    if (!d.items?.length) {
      throw new BadRequestException('Cart cannot be empty');
    }

    return this.db.$transaction(async (tx) => {
      let subtotal = 0;
      const lines: any[] = [];

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

        lines.push({
          product,
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

      const order = await tx.order.create({
        data: {
          orderNumber: `BL-${randomUUID().toUpperCase()}`,
          userId: req.user.sub,
          subtotalCents: subtotal,
          discountCents: discount,
          totalCents: subtotal - discount,
          promotionId: promotion?.id,
          statusHistory: { create: { status: 'PENDING', changedById: req.user.sub } },
          items: {
            create: lines.map(({ product, ...rest }) => ({
              ...rest,
              product: {
                connect: { id: product.id },
              },
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Acquire stock locks in the same order across multi-product carts.
      for (const line of [...lines].sort((a, b) => a.product.id.localeCompare(b.product.id))) {
        const result = await tx.product.updateMany({
          where: {
            id: line.product.id,
            active: true,
            inventory: { gte: line.quantity },
          },
          data: {
            inventory: { decrement: line.quantity },
          },
        });

        if (result.count !== 1) {
          throw new BadRequestException(
            `${line.product.name} is out of stock`,
          );
        }
      }

      return order;
    });
  }

  @Post('payments')
  payByOrder(
    @Req() req: any,
    @Headers('idempotency-key') key: string | undefined,
    @Body() d: PaymentRequestDto,
  ) {
    return this.pay(req, d.orderId, key, d);
  }

  @Post('orders/:id/pay')
  async pay(
    @Req() req: any,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() d: PayDto,
  ) {
    if (!key || key.length < 8 || key.length > 128) {
      throw new BadRequestException('Idempotency-Key must have 8–128 characters');
    }

    const order = await this.db.order.findFirst({
      where: { id, userId: req.user.sub },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const findPriorPayment = () => this.db.payment.findUnique({
      where: { orderId_idempotencyKey: { orderId: id, idempotencyKey: key } },
      include: { order: true },
    });
    const prior = await findPriorPayment();
    if (prior) {
      return { payment: prior, order: prior.order, replayed: true };
    }

    const succeeded = d.simulate !== 'fail';
    const status = succeeded ? 'PAID' : 'PAYMENT_FAILED';

    try {
      return await this.db.$transaction(async (tx) => {
        const [current] = await tx.$queryRaw<{ status: OrderStatus }[]>`
          SELECT status::text FROM "Order" WHERE id = ${id} FOR UPDATE
        `;
        if (!current || !unpaidStatuses.includes(current.status)) {
          throw new ConflictException('Order is not payable');
        }
        const attemptTime = Date.now();
        const retry = current.status === OrderStatus.PAYMENT_FAILED;
        if (retry) {
          await tx.orderStatusHistory.create({
            data: {
              orderId: id, status: OrderStatus.PENDING, changedById: req.user.sub,
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
            providerReference: `MOCK-${key.slice(0, 12)}`,
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: id, status, changedById: req.user.sub,
            changedAt: new Date(attemptTime + (retry ? 1 : 0)),
          },
        });
        if (succeeded) {
          await tx.loyaltyTransaction.create({
            data: {
              userId: req.user.sub,
              orderId: id,
              type: 'EARN',
              points: Math.floor(order.totalCents / 10000),
            },
          });
        }

        return { payment, order: updatedOrder, replayed: false };
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      ) {
        const replay = await findPriorPayment();
        if (replay) {
          return { payment: replay, order: replay.order, replayed: true };
        }
      }
      throw error;
    }
  }

  @Get(['orders/me', 'orders/mine'])
  mine(@Req() req: any) {
    return this.db.order.findMany({
      where: { userId: req.user.sub },
      include: {
        items: true,
        payments: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('orders/loyalty')
  async loyalty(@Req() req: any) {
    const { _sum } = await this.db.loyaltyTransaction.aggregate({
      where: { userId: req.user.sub },
      _sum: { points: true },
    });
    return { points: _sum.points ?? 0 };
  }

  @Get('orders/:id')
  async one(@Req() req: any, @Param('id') id: string) {
    const order = await this.db.order.findFirst({
      where: {
        id,
        userId: req.user.sub,
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

  @Patch('orders/:id/status')
  async status(
    @Req() req: any,
    @Param('id') id: string,
    @Body() { status }: StatusDto,
  ) {
    const staff = ['STAFF', 'MANAGER'].includes(req.user.role);
    if (!staff && status !== 'CANCELLED') {
      throw new ForbiddenException('Staff role required');
    }

    const owner = staff ? {} : { userId: req.user.sub };
    const order = await this.db.order.findFirst({ where: { id, ...owner }, select: { id: true } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    try {
      if (status === 'CANCELLED') {
        return await this.db.$transaction(async (tx) => {
          const cancelled = await tx.order.update({
            where: { id, ...owner, status: { in: staff ? statusTransitions.CANCELLED : unpaidStatuses } },
            data: { status, statusHistory: { create: { status, changedById: req.user.sub } } },
            include: { items: { orderBy: { productId: 'asc' } } },
          });
          for (const item of cancelled.items) {
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
          statusHistory: { create: { status, changedById: req.user.sub } },
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
