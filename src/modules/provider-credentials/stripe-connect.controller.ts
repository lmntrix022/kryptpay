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

import { StripeConnectLinkDto } from './dto/stripe-connect-link.dto';
import { StripeConnectService } from './stripe-connect.service';

@Controller('providers/stripe/connect')
@UseGuards(JwtOrApiKeyGuard)
export class StripeConnectController {
  constructor(private readonly stripeConnectService: StripeConnectService) {}

  @Post('link')
  async createLink(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: StripeConnectLinkDto,
  ) {
    const merchantId = this.resolveMerchantId({
      user,
      merchantFromApiKey,
      requestedMerchantId: dto.merchantId,
    });

    return this.stripeConnectService.createOnboardingLink(merchantId, dto);
  }

  @Get('status')
  async getStatus(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('merchantId') merchantId?: string,
  ) {
    // Si admin sans merchantId, vérifier s'il y a au moins un merchant connecté
    if (user?.role === UserRole.ADMIN && !merchantId) {
      return this.stripeConnectService.getAnyConnectionStatus();
    }

    const resolvedMerchantId = this.resolveMerchantId({
      user,
      merchantFromApiKey,
      requestedMerchantId: merchantId,
    });

    return this.stripeConnectService.getAccountStatus(resolvedMerchantId);
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
        const resolvedMerchantId = requestedMerchantId ?? user.merchantId ?? undefined;
        if (!resolvedMerchantId) {
          throw new UnauthorizedException(
            'merchantId is required for admin access. Please provide a merchantId in the request body or ensure your admin account is associated with a merchant.',
          );
        }
        return resolvedMerchantId;
      }
    }

    if (merchantFromApiKey) {
      return merchantFromApiKey.id;
    }

    throw new UnauthorizedException('Missing authentication context');
  }
}
