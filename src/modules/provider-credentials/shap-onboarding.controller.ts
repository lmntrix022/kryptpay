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

import { TestShapCredentialsDto } from './dto/test-shap-credentials.dto';
import { UpsertShapCredentialsDto } from './dto/upsert-shap-credentials.dto';
import { ShapOnboardingService } from './shap-onboarding.service';

@Controller('providers/shap/onboarding')
@UseGuards(JwtOrApiKeyGuard)
export class ShapOnboardingController {
  constructor(private readonly shapOnboardingService: ShapOnboardingService) {}

  @Post('test')
  async testCredentials(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: TestShapCredentialsDto,
  ) {
    // L'endpoint de test ne nécessite qu'une authentification JWT valide
    // Il n'a pas besoin d'un merchantId car il teste juste les credentials fournis
    if (!user && !merchantFromApiKey) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.shapOnboardingService.testCredentials({
      apiId: dto.apiId,
      apiSecret: dto.apiSecret,
      baseUrl: dto.baseUrl,
    });
  }

  @Post('connect')
  async connect(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: UpsertShapCredentialsDto,
    @Query('merchantId') merchantIdParam?: string,
  ) {
    const merchantId = this.resolveMerchantId({
      user,
      merchantFromApiKey,
      requestedMerchantId: merchantIdParam,
    });

    // Tester les credentials avant de les sauvegarder
    const testResult = await this.shapOnboardingService.testCredentials({
      apiId: dto.apiId,
      apiSecret: dto.apiSecret,
      baseUrl: dto.baseUrl,
    });

    if (!testResult.success) {
      throw new Error(testResult.message || 'Les credentials SHAP sont invalides');
    }

    // Sauvegarder les credentials
    await this.shapOnboardingService.saveCredentials(
      merchantId,
      {
        apiId: dto.apiId,
        apiSecret: dto.apiSecret,
        baseUrl: dto.baseUrl,
      },
      dto.environment ?? 'production',
    );

    return {
      success: true,
      message: 'SHAP connecté avec succès',
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
      return this.shapOnboardingService.getAnyConnectionStatus();
    }

    const resolvedMerchantId = this.resolveMerchantId({
      user,
      merchantFromApiKey,
      requestedMerchantId: merchantId,
    });

    return this.shapOnboardingService.getConnectionStatus(resolvedMerchantId);
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

