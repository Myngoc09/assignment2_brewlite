import { Body, Controller, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { CartDto, PayDto, PaymentRequestDto, StatusDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller()
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  create(@Req() { user }: AuthenticatedRequest, @Body() cart: CartDto) {
    return this.orders.create(user.sub, cart);
  }

  @Post('payments')
  payByOrder(
    @Req() { user }: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() payment: PaymentRequestDto,
  ) {
    return this.orders.pay(user.sub, payment.orderId, key, payment);
  }

  @Post('orders/:id/pay')
  pay(
    @Req() { user }: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() payment: PayDto,
  ) {
    return this.orders.pay(user.sub, id, key, payment);
  }

  @Get(['orders/me', 'orders/mine'])
  mine(@Req() { user }: AuthenticatedRequest) {
    return this.orders.mine(user.sub);
  }

  @Get('orders/loyalty')
  loyalty(@Req() { user }: AuthenticatedRequest) {
    return this.orders.loyalty(user.sub);
  }

  @Get('orders/:id')
  one(@Req() { user }: AuthenticatedRequest, @Param('id') id: string) {
    return this.orders.one(user.sub, id);
  }

  @Patch('orders/:id/status')
  status(
    @Req() { user }: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() { status }: StatusDto,
  ) {
    const staff = user.role === 'STAFF' || user.role === 'MANAGER';
    return this.orders.status(user.sub, staff, id, status);
  }
}
