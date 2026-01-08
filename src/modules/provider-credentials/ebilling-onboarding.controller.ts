import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { merchants as Merchant, UserRole } from '@prisma/client';

import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/current-user.decorator';

import { TestEbillingCredentialsDto } from './dto/test-ebilling-credentials.dto';
import { UpsertEbillingCredentialsDto } from './dto/upsert-ebilling-credentials.dto';
import { EbillingOnboardingService } from './ebilling-onboarding.service';

@Controller('providers/ebilling/onboarding')
@UseGuards(JwtOrApiKeyGuard)
export class EbillingOnboardingController {
  constructor(private readonly ebillingOnboardingService: EbillingOnboardingService) {}

  @Post('test')
  async testCredentials(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: TestEbillingCredentialsDto,
  ) {
    // L'endpoint de test ne nécessite qu'une authentification JWT valide
    // Il n'a pas besoin d'un merchantId car il teste juste les credentials fournis
    if (!user && !merchantFromApiKey) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.ebillingOnboardingService.testCredentials({
      username: dto.username,
      sharedKey: dto.sharedKey,
      baseUrl: dto.baseUrl,
    });
  }

  @Post('connect')
  async connect(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: UpsertEbillingCredentialsDto,
    @Query('merchantId') merchantIdParam?: string,
  ) {
    const merchantId = this.resolveMerchantId({
      user,
      merchantFromApiKey,
      requestedMerchantId: merchantIdParam,
    });

    // Tester les credentials avant de les sauvegarder
    const testResult = await this.ebillingOnboardingService.testCredentials({
      username: dto.username,
      sharedKey: dto.sharedKey,
      baseUrl: dto.baseUrl,
    });

    if (!testResult.success) {
      throw new Error(testResult.message || 'Les credentials eBilling sont invalides');
    }

    // Sauvegarder les credentials
    await this.ebillingOnboardingService.saveCredentials(
      merchantId,
      {
        username: dto.username,
        sharedKey: dto.sharedKey,
        baseUrl: dto.baseUrl,
      },
      dto.environment ?? 'production',
    );

    return {
      success: true,
      message: 'eBilling connecté avec succès',
      testResult,
    };
  }

  @Get('status')
  async getStatus(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('merchantId') merchantId?: string,
  ) {
    // Si admin sans merchantId, vérifier s'il y a au moins un merchant connecté
    if (user?.role === UserRole.ADMIN && !merchantId) {
      return this.ebillingOnboardingService.getAnyConnectionStatus();
    }

    const resolvedMerchantId = this.resolveMerchantId({
      user,
      merchantFromApiKey,
      requestedMerchantId: merchantId,
    });

    return this.ebillingOnboardingService.getConnectionStatus(resolvedMerchantId);
  }

  private resolveMerchantId(params: {
    user?: AuthenticatedUser;
    merchantFromApiKey?: Merchant;
    requestedMerchantId?: string;
  }): string {
    const { user, merchantFromApiKey, requestedMerchantId } = params;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        return user.merchantId;
      }

      if (user.role === UserRole.ADMIN) {
        if (!requestedMerchantId) {
          throw new UnauthorizedException('merchantId is required for admin access');
        }
        return requestedMerchantId;
      }
    }

    if (merchantFromApiKey) {
      return merchantFromApiKey.id;
    }

    throw new UnauthorizedException('Missing authentication context');
  }
}

