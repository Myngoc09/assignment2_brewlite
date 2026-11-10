import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
@Controller('health')
export class HealthController {
  constructor(private db: PrismaService) {}

  @Get()
  async check() {
    await this.db.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      service: 'brewlite-api',
      timestamp: new Date().toISOString(),
      revision: process.env.BREWLITE_REVISION,
    };
  }
}
