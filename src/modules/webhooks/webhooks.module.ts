import { Module, forwardRef } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { QueueModule } from '../../common/queue/queue.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

import { WebhooksController } from './webhooks.controller';
import { WebhookDeliveryService } from './services/webhook-delivery.service';
import { WebhookQueueService } from './services/webhook-queue.service';
import { WebhookDeliveryProcessor } from './processors/webhook-delivery.processor';
import { WebhookDeliveryScheduler } from './schedulers/webhook-delivery.scheduler';

@Module({
  imports: [
    forwardRef(() => PaymentsModule),
    PayoutsModule,
    QueueModule,
    PrismaModule,
    ConfigModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhookDeliveryService, WebhookQueueService, WebhookDeliveryProcessor, WebhookDeliveryScheduler],
  exports: [WebhookQueueService, WebhookDeliveryService],
})
export class WebhooksModule {}
