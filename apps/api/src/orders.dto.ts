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
  PREPARING: [OrderStatus.PAID],
  READY: [OrderStatus.PREPARING],
  COMPLETED: [OrderStatus.READY],
  CANCELLED: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED, OrderStatus.PAID],
};

export class StatusDto {
  @IsIn(Object.keys(statusTransitions))
  status!: keyof typeof statusTransitions;
}
