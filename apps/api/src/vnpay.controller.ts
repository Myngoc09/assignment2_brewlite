import { Controller, Get, Ip, Param, Post, Query, Redirect, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { VnpayService } from './vnpay.service';
   
@Controller()
export class VnpayController {
  constructor(private readonly vnpay: VnpayService) {}

  @Post('orders/:id/vnpay')
  @UseGuards(AuthGuard)
  start(@Param('id') id: string, @Req() { user }: AuthenticatedRequest, @Ip() ip: string) {
    return this.vnpay.start(user.sub, id, ip);
  }

  @Get('payments/vnpay/ipn')
  async confirm(@Query() query: Record<string, unknown>) {
    const { RspCode, Message } = await this.vnpay.confirm(query);
    return { RspCode, Message };
  }

  @Get('payments/vnpay/return')
  @Redirect()
  async returnToCheckout(@Query() query: Record<string, unknown>) {
    return { url: await this.vnpay.returnToCheckout(query) };
  }
}
