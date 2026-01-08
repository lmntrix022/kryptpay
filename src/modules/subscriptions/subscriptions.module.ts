import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionBillingService } from './subscription-billing.service';
import { DunningService } from './dunning.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => PaymentsModule), NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionBillingService, DunningService],
  exports: [SubscriptionsService, SubscriptionBillingService, DunningService],
})
export class SubscriptionsModule {}


