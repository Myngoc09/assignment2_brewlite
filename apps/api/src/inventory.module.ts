import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { DatabaseModule } from './database.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
