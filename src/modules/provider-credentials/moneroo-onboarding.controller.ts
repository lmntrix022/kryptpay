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

import { TestMonerooCredentialsDto } from './dto/test-moneroo-credentials.dto';
import { UpsertMonerooCredentialsDto } from './dto/upsert-moneroo-credentials.dto';
import { MonerooOnboardingService } from './moneroo-onboarding.service';

@Controller('providers/moneroo/onboarding')
@UseGuards(JwtOrApiKeyGuard)
export class MonerooOnboardingController {
  constructor(private readonly monerooOnboardingService: MonerooOnboardingService) {}

  @Post('test')
  async testCredentials(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: TestMonerooCredentialsDto,
  ) {
    // L'endpoint de test ne nécessite qu'une authentification JWT valide
    // Il n'a pas besoin d'un merchantId car il teste juste les credentials fournis
    if (!user && !merchantFromApiKey) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.monerooOnboardingService.testCredentials({
      secretKey: dto.secretKey,
      publicKey: dto.publicKey,
    });
  }

  @Post('connect')
  async connect(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: UpsertMonerooCredentialsDto,
    @Query('merchantId') merchantIdParam?: string,
  ) {
    const merchantId = this.resolveMerchantId({
      user,
      merchantFromApiKey,
      requestedMerchantId: merchantIdParam,
    });

    // Tester les credentials avant de les sauvegarder
    const testResult = await this.monerooOnboardingService.testCredentials({
      secretKey: dto.secretKey,
      publicKey: dto.publicKey,
    });

    if (!testResult.success) {
      throw new Error(testResult.message || 'Les credentials Moneroo sont invalides');
    }

    // Sauvegarder les credentials
    await this.monerooOnboardingService.saveCredentials(
      merchantId,
      {
        secretKey: dto.secretKey,
        publicKey: dto.publicKey,
      },
      dto.environment ?? 'production',
    );

    return {
      success: true,
      message: 'Moneroo connecté avec succès',
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
      return this.monerooOnboardingService.getAnyConnectionStatus();
    }

    const resolvedMerchantId = this.resolveMerchantId({
      user,
      merchantFromApiKey,
      requestedMerchantId: merchantId,
    });

    return this.monerooOnboardingService.getConnectionStatus(resolvedMerchantId);
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


