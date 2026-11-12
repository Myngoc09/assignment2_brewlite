import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { CatalogModule } from './catalog.module';
import { DatabaseModule } from './database.module';
import { HealthController } from './health.controller';
import { OrdersModule } from './orders.module';

@Module({
  imports: [DatabaseModule, AuthModule, CatalogModule, OrdersModule],
  controllers: [HealthController],
})
export class AppModule {}
