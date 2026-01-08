import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { merchants as Merchant, UserRole } from '@prisma/client';
import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/current-user.decorator';
import { SandboxWebhooksService, SimulateWebhookDto } from './sandbox-webhooks.service';

@Controller('admin/sandbox')
@UseGuards(JwtOrApiKeyGuard)
export class SandboxController {
  constructor(private readonly sandboxWebhooksService: SandboxWebhooksService) {}

  @Post('webhooks/simulate')
  async simulateWebhook(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: Omit<SimulateWebhookDto, 'merchantId'> & { merchantId?: string },
    @Query('merchantId') merchantIdParam?: string,
  ) {
    const resolvedMerchantId = this.resolveMerchantId(user, merchantFromApiKey, merchantIdParam || dto.merchant_id);
    return this.sandboxWebhooksService.simulateWebhook({ ...dto, merchant_id: resolvedMerchantId });
  }

  @Get('webhooks/history')
  async getWebhookHistory(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('limit') limit?: string,
    @Query('merchantId') merchantIdParam?: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey, merchantIdParam);
    const limitNum = limit ? Number.parseInt(limit, 10) : 50;
    return this.sandboxWebhooksService.getSimulationHistory(merchantId, limitNum);
  }

  @Get('webhooks/examples')
  getExamplePayloads() {
    return this.sandboxWebhooksService.getExamplePayloads();
  }

  private resolveMerchantId(
    user: AuthenticatedUser | undefined,
    merchantFromApiKey: Merchant | undefined,
    merchantIdParam?: string,
  ): string {
    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        return user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        // Les admins peuvent utiliser le sandbox mais doivent fournir un merchantId
        // Pour l'instant, on utilise le merchantId par défaut si disponible
        if (!merchantIdParam && !user.merchantId) {
          throw new UnauthorizedException('MerchantId is required for admin users');
        }
        return merchantIdParam || user.merchantId || '';
      } else {
        throw new UnauthorizedException('Unsupported role');
      }
    } else if (merchantFromApiKey) {
      return merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }
  }
}


