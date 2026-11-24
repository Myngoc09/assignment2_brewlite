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

  //Đường dẫn API để thay đổi trạng thái đơn hàng, chỉ cho phép nhân viên thay đổi trạng thái trừ khi là hủy đơn
  @Patch('orders/:id/status')
  status(
    @Req() { user }: AuthenticatedRequest,// Lấy thông tin người dùng từ yêu cầu
    @Param('id') id: string,// Lấy ID đơn hàng từ tham số đường dẫn
    @Body() { status }: StatusDto,// Lấy trạng thái mới từ body yêu cầu
  ) {
    const staff = user.role === 'STAFF' || user.role === 'MANAGER';
    return this.orders.status(user.sub, staff, id, status);
  }
}
