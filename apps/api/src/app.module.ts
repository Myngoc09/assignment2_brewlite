import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { ProductsController } from './products.controller';
import { AuthController } from './auth.controller';
import { OrdersController } from './orders.controller';
import { HealthController } from './health.controller';
const jwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('Set JWT_SECRET to at least 32 characters for production');
}

@Module({imports:[JwtModule.register({secret:jwtSecret||'local-only-secret-change-before-deploy-123456',signOptions:{expiresIn:(process.env.JWT_EXPIRES_IN||'1d') as any}})],controllers:[ProductsController,AuthController,OrdersController,HealthController],providers:[PrismaService,AuthGuard]}) export class AppModule{}
