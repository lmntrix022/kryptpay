import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';

import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PaymentsModule, PayoutsModule, AuthModule, WebhooksModule, NotificationsModule, AnalyticsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
