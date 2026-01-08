import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import type { merchants as Merchant } from '@prisma/client';

import { ApiKeyGuard } from '../../auth/api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';

import { UpsertEbillingCredentialsDto } from './dto/upsert-ebilling-credentials.dto';
import { UpsertMonerooCredentialsDto } from './dto/upsert-moneroo-credentials.dto';
import { UpsertShapCredentialsDto } from './dto/upsert-shap-credentials.dto';
import { UpsertStripeCredentialsDto } from './dto/upsert-stripe-credentials.dto';
import { ProviderCredentialsService } from './provider-credentials.service';

@Controller('providers')
@UseGuards(ApiKeyGuard)
export class ProviderCredentialsController {
  constructor(private readonly providerCredentialsService: ProviderCredentialsService) {}

  @Put('stripe/credentials')
  async upsertStripe(
    @CurrentMerchant() merchant: Merchant,
    @Body() dto: UpsertStripeCredentialsDto,
  ) {
    await this.providerCredentialsService.setCredentials(
      merchant.id,
      'STRIPE',
      dto.environment ?? 'production',
      {
        secretKey: dto.secretKey,
        publishableKey: dto.publishableKey,
      },
    );

    return { ok: true };
  }

  @Put('moneroo/credentials')
  async upsertMoneroo(
    @CurrentMerchant() merchant: Merchant,
    @Body() dto: UpsertMonerooCredentialsDto,
  ) {
    await this.providerCredentialsService.setCredentials(
      merchant.id,
      'MONEROO',
      dto.environment ?? 'production',
      {
        secretKey: dto.secretKey,
        publicKey: dto.publicKey,
        walletId: dto.walletId,
      },
    );

    return { ok: true };
  }

  @Put('ebilling/credentials')
  async upsertEbilling(
    @CurrentMerchant() merchant: Merchant,
    @Body() dto: UpsertEbillingCredentialsDto,
  ) {
    await this.providerCredentialsService.setCredentials(
      merchant.id,
      'EBILLING',
      dto.environment ?? 'production',
      {
        username: dto.username,
        sharedKey: dto.sharedKey,
        baseUrl: dto.baseUrl,
      },
    );

    return { ok: true };
  }

  @Put('shap/credentials')
  async upsertShap(@CurrentMerchant() merchant: Merchant, @Body() dto: UpsertShapCredentialsDto) {
    await this.providerCredentialsService.setCredentials(
      merchant.id,
      'SHAP',
      dto.environment ?? 'production',
      {
        apiId: dto.apiId,
        apiSecret: dto.apiSecret,
        baseUrl: dto.baseUrl,
      },
    );

    return { ok: true };
  }
}
