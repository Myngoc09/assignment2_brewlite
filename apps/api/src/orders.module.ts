import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { DatabaseModule } from './database.module';
import { InventoryModule } from './inventory.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { VnpayController } from './vnpay.controller';
import { VnpayService } from './vnpay.service';

@Module({
  imports: [AuthModule, DatabaseModule, InventoryModule],
  controllers: [OrdersController, VnpayController],
  providers: [OrdersService, VnpayService],
})
export class OrdersModule {}
