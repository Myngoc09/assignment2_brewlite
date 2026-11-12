import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { DatabaseModule } from './database.module';
import { InventoryModule } from './inventory.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, DatabaseModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
