import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProviderCredentialsModule } from './modules/provider-credentials/provider-credentials.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { FiltersModule } from './modules/filters/filters.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './common/queue/queue.module';
import { PrometheusModule } from './common/metrics/prometheus.module';
import { CommonModule } from './common/common.module';
import { MetricsService } from './common/metrics/metrics.service';
import { HttpMetricsInterceptor } from './common/metrics/http-metrics.interceptor';
import { ThrottleBehindProxyGuard } from './common/guards/throttle-behind-proxy.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { SellerDashboardModule } from './modules/seller-dashboard/seller-dashboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PlatformRevenueModule } from './modules/platform-revenue/platform-revenue.module';
import { VatModule } from './modules/vat/vat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000), // 1 minute
          limit: config.get<number>('THROTTLE_LIMIT', 100), // 100 requests
        },
      ],
    }),
    RedisModule,
    QueueModule,
    PrometheusModule,
    CommonModule,
    PrismaModule,
    AuthModule,
    ProviderCredentialsModule,
    MerchantsModule,
    UsersModule,
    PaymentsModule,
    PayoutsModule,
    WebhooksModule,
    DashboardModule,
    NotificationsModule,
    SubscriptionsModule,
    SandboxModule,
    FiltersModule,
    ReconciliationModule,
    SellerDashboardModule,
    AnalyticsModule,
    PlatformRevenueModule,
    VatModule,
  ],
  controllers: [HealthController],
  providers: [
    MetricsService,
    {
      provide: APP_GUARD,
      useClass: ThrottleBehindProxyGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}
