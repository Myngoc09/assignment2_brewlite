import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

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
  @Max(2147483647)
  quantity!: number;
}

export class CartDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => Line)
  items!: Line[];

  @IsOptional()
  @IsString()
  promotionCode?: string;
}

export class PayDto {
  @IsIn(['MOCK_WALLET', 'MOCK_CARD'])
  method!: 'MOCK_WALLET' | 'MOCK_CARD';

  @IsOptional()
  @IsIn(['success', 'fail'])
  simulate?: 'success' | 'fail';
}

export class PaymentRequestDto extends PayDto {
  @IsString()
  orderId!: string;
}

export const statusTransitions = {
  // Đơn đã thanh toán mới được chuyển sang đang chuẩn bị
  PREPARING: [OrderStatus.PAID],

  // Đơn đang chuẩn bị mới được chuyển sang sẵn sàng
  READY: [OrderStatus.PREPARING],

  // Đơn sẵn sàng mới được chuyển sang hoàn thành
  COMPLETED: [OrderStatus.READY],

  // Các trạng thái có thể chuyển sang đã hủy
  CANCELLED: [
    OrderStatus.PENDING,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.PAID,
  ],
};

export class StatusDto {
  // Chỉ chấp nhận những trạng thái được định nghĩa bên trên
  @IsIn(Object.keys(statusTransitions))
  status!: keyof typeof statusTransitions;
}

