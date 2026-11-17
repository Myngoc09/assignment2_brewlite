import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import QRCode from 'qrcode';
import { PrismaService } from './prisma.service';

const gateway = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const paymentWindowMs = 15 * 60 * 1000;

function encodeParams(params: Record<string, string>) {
  const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, '+');
  return Object.keys(params).sort().map(key => `${encode(key)}=${encode(params[key])}`).join('&');
}

function sign(params: string, secret: string) {
  return createHmac('sha512', secret).update(params, 'utf8').digest('hex');
}

function vietnamTime(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace(/\D/g, '');
}

@Injectable()
export class VnpayService {
  constructor(private readonly db: PrismaService) {}

  private config() {
    const { VNPAY_TMN_CODE: terminal, VNPAY_HASH_SECRET: secret, VNPAY_RETURN_URL: returnUrl } = process.env;
    if (!terminal || !secret || !returnUrl || !URL.canParse(returnUrl)) {
      throw new ServiceUnavailableException('VNPAY Sandbox chưa được cấu hình.');
    }
    const returnPage = new URL(returnUrl);
    if (!['http:', 'https:'].includes(returnPage.protocol)) {
      throw new ServiceUnavailableException('URL quay về từ VNPAY không hợp lệ.');
    }
    return { terminal, secret, returnPage };
  }

  async start(userId: string, orderId: string, ip: string) {
    const { terminal, secret, returnPage } = this.config();
    const { order, payment } = await this.db.$transaction(async tx => {
      const [order] = await tx.$queryRaw<{ status: OrderStatus; totalCents: number }[]>`
        SELECT status::text, "totalCents" FROM "Order"
        WHERE id = ${orderId} AND "userId" = ${userId} FOR UPDATE
      `;
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
      if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
        throw new ConflictException('Đơn này không thể thanh toán.');
      }
      if (order.totalCents < 5000 || order.totalCents >= 1_000_000_000) {
        throw new BadRequestException('VNPAY Sandbox hỗ trợ đơn từ 5.000 ₫ đến dưới 1.000.000.000 ₫.');
      }

      const pending = await tx.payment.findFirst({
        where: { orderId, method: 'VNPAY_QR', status: 'PENDING' },
      });
      if (pending) {
        if (Date.now() >= pending.createdAt.getTime() + paymentWindowMs) {
          throw new ConflictException('Mã QR đã hết hạn. Đơn đang chờ kết quả từ VNPAY.');
        }
        return { order, payment: pending };
      }
      const txnRef = randomUUID().replace(/-/g, '');
      const payment = await tx.payment.create({
        data: { id: txnRef, orderId, method: 'VNPAY_QR', idempotencyKey: txnRef },
      });
      if (order.status === 'PAYMENT_FAILED') {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PENDING', statusHistory: { create: { status: 'PENDING', changedById: userId } } },
        });
      }
      return { order, payment };
    });

    const expiresAt = new Date(payment.createdAt.getTime() + paymentWindowMs);
    const query = encodeParams({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: terminal,
      vnp_Amount: String(order.totalCents * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: payment.id,
      vnp_OrderInfo: `Thanh toan BrewLite ${payment.id}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: new URL('/api/payments/vnpay/return', returnPage).toString(),
      vnp_IpAddr: ip === '::1' ? '127.0.0.1' : ip.replace(/^::ffff:/, ''),
      vnp_CreateDate: vietnamTime(payment.createdAt),
      vnp_ExpireDate: vietnamTime(expiresAt),
    });
    const paymentUrl = `${gateway}?${query}&vnp_SecureHash=${sign(query, secret)}`;
    const qrCode = await QRCode.toDataURL(paymentUrl, {
      errorCorrectionLevel: 'L', margin: 4, width: 600,
    });
    return { paymentUrl, qrCode, expiresAt: expiresAt.toISOString() };
  }

  async returnToCheckout(query: Record<string, unknown>) {
    const { returnPage } = this.config();
    const { orderId } = await this.confirm(query);
    if (orderId) returnPage.searchParams.set('vnpayOrder', orderId);
    else returnPage.searchParams.set('vnpayInvalid', '1');
    return returnPage.toString();
  }

  async confirm(query: Record<string, unknown>): Promise<{ RspCode: string; Message: string; orderId?: string }> {
    const { terminal, secret } = this.config();
    const hash = query.vnp_SecureHash;
    const entries = Object.entries(query).filter(([key]) =>
      key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType');
    const invalidSignature = { RspCode: '97', Message: 'Invalid signature' };
    if (typeof hash !== 'string' || !/^[a-f\d]{128}$/i.test(hash) ||
        entries.some(([, value]) => typeof value !== 'string')) {
      return invalidSignature;
    }
    const params = Object.fromEntries(entries) as Record<string, string>;
    const expected = sign(encodeParams(params), secret);
    if (!timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex')) ||
        params.vnp_TmnCode !== terminal) {
      return invalidSignature;
    }

    return this.db.$transaction(async tx => {
      const payment = await tx.payment.findUnique({ where: { id: params.vnp_TxnRef || '' } });
      if (payment?.method !== 'VNPAY_QR') return { RspCode: '01', Message: 'Order not found' };
      const [order] = await tx.$queryRaw<{ status: OrderStatus; totalCents: number; userId: string }[]>`
        SELECT status::text, "totalCents", "userId" FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE
      `;
      if (!order) return { RspCode: '01', Message: 'Order not found' };
      if (!/^\d+$/.test(params.vnp_Amount) || Number(params.vnp_Amount) !== order.totalCents * 100) {
        return { RspCode: '04', Message: 'Invalid amount' };
      }
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (current?.status !== 'PENDING' || order.status !== 'PENDING') {
        return { RspCode: '02', Message: 'Order already confirmed', orderId: payment.orderId };
      }
      const succeeded = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
      if (!params.vnp_ResponseCode || !params.vnp_TransactionStatus || (succeeded && !params.vnp_TransactionNo)) {
        return { RspCode: '99', Message: 'Incomplete payment result' };
      }
      const status = succeeded ? 'PAID' : 'PAYMENT_FAILED';
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: succeeded ? 'SUCCEEDED' : 'FAILED', providerReference: params.vnp_TransactionNo },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status, statusHistory: { create: { status, note: 'VNPAY Sandbox IPN' } } },
      });
      if (succeeded) {
        await tx.loyaltyTransaction.create({
          data: {
            userId: order.userId, orderId: payment.orderId, type: 'EARN',
            points: Math.floor(order.totalCents / 10000),
          },
        });
      }
      return { RspCode: '00', Message: 'Confirm success', orderId: payment.orderId };
    });
  }
}
