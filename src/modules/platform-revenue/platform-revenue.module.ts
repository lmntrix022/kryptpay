import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { PlatformRevenueService } from './platform-revenue.service';
import { PlatformRevenueController } from './platform-revenue.controller';

@Module({
  imports: [PrismaModule],
  providers: [PlatformRevenueService],
  controllers: [PlatformRevenueController],
  exports: [PlatformRevenueService],
})
export class PlatformRevenueModule {}

