import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminMerchantsController } from './admin-merchants.controller';
import { AdminApiKeysController } from './admin-api-keys.controller';
import { InternalMerchantsController } from './internal-merchants.controller';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    MerchantsController,
    AdminMerchantsController,
    AdminApiKeysController,
    InternalMerchantsController,
  ],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
