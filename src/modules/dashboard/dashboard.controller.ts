import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UnauthorizedException, UseGuards, Logger, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { merchants as Merchant, UserRole } from '@prisma/client';

import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/current-user.decorator';
import { ApiKeysService } from '../../auth/api-keys.service';
import { PaymentsService } from '../payments/payments.service';
import { RefundsService } from '../payments/refunds.service';
import { CreatePayoutDto } from '../payouts/dto/create-payout.dto';
import { PayoutsService } from '../payouts/payouts.service';
import { WebhookDeliveryService } from '../webhooks/services/webhook-delivery.service';
import { NotificationHistoryService } from '../notifications/services/notification-history.service';
import { NotificationPreferencesService } from '../notifications/services/notification-preferences.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtOrApiKeyGuard)
@ApiBearerAuth('JWT-auth')
@ApiSecurity('api-key')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
    private readonly payoutsService: PayoutsService,
    private readonly apiKeysService: ApiKeysService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
    private readonly notificationHistoryService: NotificationHistoryService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Liste des transactions', description: 'Récupère la liste des transactions avec pagination et filtres. Supporte la pagination par page ou par offset.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (commence à 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset pour la pagination (alternative à page)' })
  @ApiQuery({ name: 'gateway', required: false, enum: ['STRIPE', 'MONEROO', 'EBILLING'], description: 'Filtrer par passerelle' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED'], description: 'Filtrer par statut' })
  @ApiQuery({ name: 'merchantId', required: false, type: String, description: 'ID du marchand (admin seulement)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Date de fin (ISO 8601)' })
  @ApiQuery({ name: 'isTestMode', required: false, enum: ['true', 'false'], description: 'Filtrer par mode test' })
  @ApiResponse({ status: 200, description: 'Liste des transactions récupérée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async listTransactions(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('gateway') gateway?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('offset') offset?: string,
    @Query('merchantId') merchantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isTestMode') isTestMode?: string,
  ) {
    try {
      const parsedLimit = limit ? Number(limit) : undefined;
      const safeLimit = parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined;
      const parsedPage = page ? Number(page) : undefined;
      const safePage = parsedPage && !Number.isNaN(parsedPage) ? parsedPage : undefined;
      const parsedOffset = offset ? Number(offset) : undefined;
      const safeOffset = parsedOffset && !Number.isNaN(parsedOffset) ? parsedOffset : undefined;

      // Créer le DTO de pagination si les paramètres sont fournis
      const pagination = safePage || safeLimit || safeOffset !== undefined
        ? Object.assign(new PaginationDto(), {
            page: safePage,
            limit: safeLimit,
            offset: safeOffset,
          })
        : undefined;

      let resolvedMerchantId: string | undefined;

      if (user) {
        if (user.role === UserRole.MERCHANT) {
          if (!user.merchantId) {
            throw new UnauthorizedException('Merchant context missing');
          }
          resolvedMerchantId = user.merchantId;
        } else if (user.role === UserRole.ADMIN) {
          resolvedMerchantId = merchantId ?? undefined;
        } else {
          throw new UnauthorizedException('Unsupported role');
        }
      } else if (merchantFromApiKey) {
        resolvedMerchantId = merchantFromApiKey.id;
      } else {
        throw new UnauthorizedException('Missing authentication context');
      }

      const startDateObj = startDate ? new Date(startDate) : undefined;
      const endDateObj = endDate ? new Date(endDate) : undefined;

      // Validate dates
      if (startDate && startDateObj && isNaN(startDateObj.getTime())) {
        throw new InternalServerErrorException('Invalid startDate format');
      }
      if (endDate && endDateObj && isNaN(endDateObj.getTime())) {
        throw new InternalServerErrorException('Invalid endDate format');
      }

      // Parse isTestMode
      const parsedIsTestMode = isTestMode === 'true' ? true : isTestMode === 'false' ? false : undefined;

      return await this.paymentsService.listPayments(resolvedMerchantId, {
        gateway,
        status,
        limit: safeLimit,
        startDate: startDateObj,
        endDate: endDateObj,
        isTestMode: parsedIsTestMode,
      }, pagination);
    } catch (error) {
      this.logger.error('Error listing transactions', error instanceof Error ? error.stack : String(error));
      if (error instanceof UnauthorizedException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to list transactions',
      );
    }
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Liste des payouts', description: 'Récupère la liste des payouts avec pagination et filtres. Supporte la pagination par page ou par offset.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (commence à 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset pour la pagination (alternative à page)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'], description: 'Filtrer par statut' })
  @ApiQuery({ name: 'provider', required: false, enum: ['SHAP', 'MONEROO', 'STRIPE'], description: 'Filtrer par provider' })
  @ApiQuery({ name: 'merchantId', required: false, type: String, description: 'ID du marchand (admin seulement)' })
  @ApiResponse({ status: 200, description: 'Liste des payouts récupérée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async listPayouts(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('offset') offset?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    try {
      const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
      const safeLimit = parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined;
      const parsedPage = page ? Number(page) : undefined;
      const safePage = parsedPage && !Number.isNaN(parsedPage) ? parsedPage : undefined;
      const parsedOffset = offset ? Number(offset) : undefined;
      const safeOffset = parsedOffset && !Number.isNaN(parsedOffset) ? parsedOffset : undefined;

      // Créer le DTO de pagination si les paramètres sont fournis
      const pagination = safePage || safeLimit || safeOffset !== undefined
        ? Object.assign(new PaginationDto(), {
            page: safePage,
            limit: safeLimit,
            offset: safeOffset,
          })
        : undefined;

      let resolvedMerchantId: string | undefined;

      if (user) {
        if (user.role === UserRole.MERCHANT) {
          if (!user.merchantId) {
            throw new UnauthorizedException('Merchant context missing');
          }
          resolvedMerchantId = user.merchantId;
        } else if (user.role === UserRole.ADMIN) {
          resolvedMerchantId = merchantId ?? undefined;
        } else {
          throw new UnauthorizedException('Unsupported role');
        }
      } else if (merchantFromApiKey) {
        resolvedMerchantId = merchantFromApiKey.id;
      } else {
        throw new UnauthorizedException('Missing authentication context');
      }

      return await this.payoutsService.listPayouts(resolvedMerchantId, {
        status,
        provider,
        limit: safeLimit,
      }, pagination);
    } catch (error) {
      this.logger.error('Error listing payouts', error instanceof Error ? error.stack : String(error));
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to list payouts',
      );
    }
  }

  @Post('payouts')
  async createPayout(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: CreatePayoutDto,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else {
        throw new UnauthorizedException('Only merchants can create payouts');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    return this.payoutsService.createPayout(resolvedMerchantId, dto);
  }

  @Get('api-keys')
  async listApiKeys(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('merchantId') merchantId?: string,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        // Admins can see all keys or keys for a specific merchant
        if (merchantId) {
          resolvedMerchantId = merchantId;
        } else {
          // If no merchantId specified, return all keys for admin
          return this.apiKeysService.listAllKeys();
        }
      } else {
        throw new UnauthorizedException('Unsupported role');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    return this.apiKeysService.listMerchantKeys(resolvedMerchantId!);
  }

  @Get('me')
  async getCurrentUser(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
  ) {
    return {
      user,
      merchantFromApiKey,
      hasMerchantAccess: !!(user?.merchantId || merchantFromApiKey),
      canAccessApiKeys: user?.role === UserRole.ADMIN || !!(user?.merchantId || merchantFromApiKey),
    };
  }

  @Post('api-keys')
  async createApiKey(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body('label') label?: string,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else {
        throw new UnauthorizedException('Only merchants can create API keys');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    return this.apiKeysService.generateApiKey(resolvedMerchantId!, label);
  }

  @Patch('api-keys/:apiKeyId/revoke')
  async revokeApiKey(
    @Param('apiKeyId') apiKeyId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        // Admin can revoke any key
        return this.apiKeysService.revokeApiKey(apiKeyId);
      } else {
        throw new UnauthorizedException('Only merchants can revoke their API keys');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    // Verify the key belongs to the merchant
    const key = await this.apiKeysService.findById(apiKeyId);
    if (!key || key.merchant_id !== resolvedMerchantId) {
      throw new UnauthorizedException('API key not found or does not belong to you');
    }

    return this.apiKeysService.revokeApiKey(apiKeyId);
  }

  @Delete('api-keys/:apiKeyId')
  async deleteApiKey(
    @Param('apiKeyId') apiKeyId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        // Admin can delete any key
        return this.apiKeysService.deleteApiKey(apiKeyId);
      } else {
        throw new UnauthorizedException('Only merchants can delete their API keys');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    // Verify the key belongs to the merchant
    const key = await this.apiKeysService.findById(apiKeyId);
    if (!key || key.merchant_id !== resolvedMerchantId) {
      throw new UnauthorizedException('API key not found or does not belong to you');
    }

    return this.apiKeysService.deleteApiKey(apiKeyId);
  }

  @Get('refunds')
  async listRefunds(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('status') status?: string,
    @Query('paymentId') paymentId?: string,
    @Query('limit') limit?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const safeLimit = parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined;

    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        resolvedMerchantId = merchantId ?? undefined;
      } else {
        throw new UnauthorizedException('Unsupported role');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    return this.refundsService.listRefunds(resolvedMerchantId, {
      status,
      paymentId,
      limit: safeLimit,
    });
  }

  @Get('webhooks')
  async listWebhooks(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const safeLimit = parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined;

    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else {
        throw new UnauthorizedException('Only merchants can list their webhooks');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    return this.webhookDeliveryService.listWebhookDeliveries(resolvedMerchantId!, {
      status,
      limit: safeLimit,
    });
  }

  @Get('webhooks/config')
  async getWebhookConfig(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else {
        throw new UnauthorizedException('Only merchants can view their webhook config');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    return this.webhookDeliveryService.getMerchantWebhookConfig(resolvedMerchantId!);
  }

  @Put('webhooks/config')
  async updateWebhookConfig(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() body: { webhookUrl?: string; webhookSecret?: string },
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else {
        throw new UnauthorizedException('Only merchants can update their webhook config');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    return this.webhookDeliveryService.updateMerchantWebhookConfig(
      resolvedMerchantId!,
      body.webhookUrl,
      body.webhookSecret,
    );
  }

  @Get('notifications/history')
  async getNotificationHistory(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        // Admin peut voir tous les marchands, mais pour l'instant on limite à son propre merchant
        resolvedMerchantId = user.merchantId ?? undefined;
      } else {
        throw new UnauthorizedException('Only merchants can view their notification history');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    if (!resolvedMerchantId) {
      throw new UnauthorizedException('Merchant ID required');
    }

    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : undefined;

    return this.notificationHistoryService.getMerchantHistory(resolvedMerchantId, {
      limit: parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
      offset: parsedOffset && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
      type: type as any,
      status: status as any,
      channel: channel as any,
    });
  }

  @Get('notifications/statistics')
  async getNotificationStatistics(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        // Admin peut voir les stats globales
        resolvedMerchantId = undefined;
      } else {
        throw new UnauthorizedException('Unauthorized');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    return this.notificationHistoryService.getStatistics(resolvedMerchantId);
  }

  @Get('notifications/preferences')
  async getNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else {
        throw new UnauthorizedException('Only merchants can view their notification preferences');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    if (!resolvedMerchantId) {
      throw new UnauthorizedException('Merchant ID required');
    }

    const preferences = await this.notificationPreferencesService.getOrCreatePreferences(resolvedMerchantId);
    return {
      paymentNotifications: preferences.payment_notifications,
      payoutNotifications: preferences.payout_notifications,
      refundNotifications: preferences.refund_notifications,
      systemNotifications: preferences.system_notifications,
      customerNotifications: preferences.customer_notifications,
      emailEnabled: preferences.email_enabled,
      smsEnabled: preferences.sms_enabled,
      pushEnabled: preferences.push_enabled,
    };
  }

  @Put('notifications/preferences')
  async updateNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body()
    body: {
      paymentNotifications?: boolean;
      payoutNotifications?: boolean;
      refundNotifications?: boolean;
      systemNotifications?: boolean;
      customerNotifications?: boolean;
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
    },
  ) {
    let resolvedMerchantId: string | undefined;

    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        resolvedMerchantId = user.merchantId;
      } else {
        throw new UnauthorizedException('Only merchants can update their notification preferences');
      }
    } else if (merchantFromApiKey) {
      resolvedMerchantId = merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }

    if (!resolvedMerchantId) {
      throw new UnauthorizedException('Merchant ID required');
    }

    const preferences = await this.notificationPreferencesService.updatePreferences(resolvedMerchantId, body);
    return {
      paymentNotifications: preferences.payment_notifications,
      payoutNotifications: preferences.payout_notifications,
      refundNotifications: preferences.refund_notifications,
      systemNotifications: preferences.system_notifications,
      customerNotifications: preferences.customer_notifications,
      emailEnabled: preferences.email_enabled,
      smsEnabled: preferences.sms_enabled,
      pushEnabled: preferences.push_enabled,
    };
  }
}
