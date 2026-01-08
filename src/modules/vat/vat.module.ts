import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { ProviderCredentialsModule } from '../provider-credentials/provider-credentials.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { VatController } from './vat.controller';
import { VatService } from './vat.service';
import { VatRatesService } from './vat-rates.service';
import { VatReportsService } from './vat-reports.service';
import { VatPaymentsService } from './vat-payments.service';
import { VatCalculationService } from './vat-calculation.service';
import { VatAuditService } from './vat-audit.service';
import { VatSettingsService } from './vat-settings.service';
import { VatProviderValidationService } from './vat-provider-validation.service';
import { VatMonetizationService } from './vat-monetization.service';
import { VatSubscriptionService } from './vat-subscription.service';
import { VatTaxRulesService } from './vat-tax-rules.service';
import { VatReportExportService } from './vat-report-export.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    ProviderCredentialsModule,
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [VatController],
  providers: [
    VatService,
    VatRatesService,
    VatCalculationService,
    VatReportsService,
    VatPaymentsService,
    VatAuditService,
    VatSettingsService,
    VatProviderValidationService,
    VatMonetizationService,
    VatSubscriptionService,
    VatTaxRulesService,
    VatReportExportService,
  ],
  exports: [
    VatService,
    VatCalculationService,
    VatRatesService,
    VatReportsService,
    VatSettingsService,
    VatProviderValidationService,
    VatMonetizationService,
    VatSubscriptionService,
  ],
})
export class VatModule {}

