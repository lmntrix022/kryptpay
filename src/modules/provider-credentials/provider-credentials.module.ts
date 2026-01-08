import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../../auth/auth.module';

import { EbillingOnboardingController } from './ebilling-onboarding.controller';
import { EbillingOnboardingService } from './ebilling-onboarding.service';
import { MonerooOnboardingController } from './moneroo-onboarding.controller';
import { MonerooOnboardingService } from './moneroo-onboarding.service';
import { ProviderCredentialsController } from './provider-credentials.controller';
import { ProviderCredentialsService } from './provider-credentials.service';
import { ShapOnboardingController } from './shap-onboarding.controller';
import { ShapOnboardingService } from './shap-onboarding.service';
import { StripeConnectController } from './stripe-connect.controller';
import { StripeConnectService } from './stripe-connect.service';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [
    ProviderCredentialsController,
    StripeConnectController,
    EbillingOnboardingController,
    ShapOnboardingController,
    MonerooOnboardingController,
  ],
  providers: [
    ProviderCredentialsService,
    StripeConnectService,
    EbillingOnboardingService,
    ShapOnboardingService,
    MonerooOnboardingService,
  ],
  exports: [
    ProviderCredentialsService,
    StripeConnectService,
    EbillingOnboardingService,
    ShapOnboardingService,
    MonerooOnboardingService,
  ],
})
export class ProviderCredentialsModule {}
