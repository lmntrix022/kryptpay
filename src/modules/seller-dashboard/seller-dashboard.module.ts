import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { SellerDashboardService } from './seller-dashboard.service';
import { SellerDashboardController } from './seller-dashboard.controller';

@Module({
  imports: [PrismaModule, CommonModule],
  providers: [SellerDashboardService],
  controllers: [SellerDashboardController],
  exports: [SellerDashboardService],
})
export class SellerDashboardModule {}

