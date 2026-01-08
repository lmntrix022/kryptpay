import { Module, forwardRef } from '@nestjs/common';

import { GatewaySelector } from '../../shared/gateway/gateway-selector';
import { ProviderCredentialsModule } from '../provider-credentials/provider-credentials.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../../common/redis/redis.module';
import { PrometheusModule } from '../../common/metrics/prometheus.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { VatModule } from '../vat/vat.module';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RefundsService } from './refunds.service';
import { MonerooProviderService } from './providers/moneroo-provider.service';
import { EbillingProviderService } from './providers/ebilling-provider.service';
import { StripeProviderService } from './providers/stripe-provider.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { RetryService } from '../../common/services/retry.service';

@Module({
  imports: [
    ProviderCredentialsModule,
    NotificationsModule,
    RedisModule,
    PrometheusModule,
    forwardRef(() => WebhooksModule),
    forwardRef(() => VatModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    RefundsService,
    GatewaySelector,
    StripeProviderService,
    MonerooProviderService,
    EbillingProviderService,
    IdempotencyService,
    RetryService,
  ],
  exports: [PaymentsService, RefundsService],
})
export class PaymentsModule {}
