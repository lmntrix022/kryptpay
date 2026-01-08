import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { AuthModule } from '../../auth/auth.module';
import { ProviderCredentialsModule } from '../provider-credentials/provider-credentials.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';

import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { ShapPayoutProviderService } from './providers/shap-payout-provider.service';
import { MonerooPayoutProviderService } from './providers/moneroo-payout-provider.service';
import { StripePayoutProviderService } from './providers/stripe-payout-provider.service';
import { PayoutQueueService } from './queue/payout-queue.service';
import { PayoutProcessor } from './queue/payout.processor';
import { RetryService } from '../../common/services/retry.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    ConfigModule, 
    PrismaModule, 
    ProviderCredentialsModule, 
    AuthModule, 
    RedisModule, 
    NotificationsModule,
    BullModule.registerQueue({
      name: 'payouts',
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // 24 heures
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // 7 jours
        },
      },
    }),
  ],
  controllers: [PayoutsController],
  providers: [
    PayoutsService, 
    ShapPayoutProviderService, 
    MonerooPayoutProviderService, 
    StripePayoutProviderService, 
    PayoutQueueService,
    PayoutProcessor,
    RetryService,
  ],
  exports: [PayoutsService, PayoutQueueService],
})
export class PayoutsModule {}
