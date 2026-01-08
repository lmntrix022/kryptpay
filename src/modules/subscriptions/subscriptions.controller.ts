import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { merchants as Merchant, UserRole, SubscriptionStatus } from '@prisma/client';
import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SubscriptionsService, CreateSubscriptionDto, UpdateSubscriptionDto } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('admin/subscriptions')
@UseGuards(JwtOrApiKeyGuard)
@ApiBearerAuth('JWT-auth')
@ApiSecurity('api-key')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une subscription', description: 'Crée une nouvelle subscription récurrente' })
  @ApiResponse({ status: 201, description: 'Subscription créée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async createSubscription(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: Omit<CreateSubscriptionDto, 'merchantId'> & { merchantId?: string },
  ) {
    const resolvedMerchantId = this.resolveMerchantId(user, merchantFromApiKey, dto.merchant_id);
    if (!resolvedMerchantId) {
      throw new UnauthorizedException('MerchantId is required');
    }
    return this.subscriptionsService.createSubscription({ ...dto, merchant_id: resolvedMerchantId });
  }

  @Get()
  @ApiOperation({ summary: 'Liste des subscriptions', description: 'Récupère la liste des subscriptions avec pagination et filtres. Supporte la pagination par page ou par offset.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (commence à 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page (max 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset pour la pagination (alternative à page)' })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus, description: 'Filtrer par statut' })
  @ApiQuery({ name: 'customerEmail', required: false, type: String, description: 'Filtrer par email client' })
  @ApiQuery({ name: 'merchantId', required: false, type: String, description: 'ID du marchand (admin seulement)' })
  @ApiResponse({ status: 200, description: 'Liste des subscriptions récupérée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async listSubscriptions(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('status') status?: SubscriptionStatus,
    @Query('customerEmail') customerEmail?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('merchantId') merchantIdParam?: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey, merchantIdParam);
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const safeLimit = parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined;
    const parsedPage = page ? Number(page) : undefined;
    const safePage = parsedPage && !Number.isNaN(parsedPage) ? parsedPage : undefined;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : undefined;
    const safeOffset = parsedOffset && !Number.isNaN(parsedOffset) ? parsedOffset : undefined;

    // Créer le DTO de pagination si les paramètres sont fournis
    const pagination = safePage || safeLimit || safeOffset !== undefined
      ? Object.assign(new PaginationDto(), {
          page: safePage,
          limit: safeLimit,
          offset: safeOffset,
        })
      : undefined;

    return this.subscriptionsService.listSubscriptions(merchantId, {
      status,
      customerEmail,
      limit: safeLimit,
      offset: safeOffset,
    }, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir une subscription', description: 'Récupère les détails d\'une subscription par son ID' })
  @ApiResponse({ status: 200, description: 'Subscription récupérée avec succès' })
  @ApiResponse({ status: 404, description: 'Subscription non trouvée' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async getSubscription(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('id') id: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    if (!merchantId) {
      throw new UnauthorizedException('Merchant context required');
    }
    try {
      return await this.subscriptionsService.getSubscription(id, merchantId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Subscription ${id} not found`);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour une subscription', description: 'Met à jour les informations d\'une subscription' })
  @ApiResponse({ status: 200, description: 'Subscription mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Subscription non trouvée' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async updateSubscription(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    if (!merchantId) {
      throw new UnauthorizedException('Merchant context required');
    }
    return this.subscriptionsService.updateSubscription(id, merchantId, dto);
  }

  @Post(':id/pause')
  async pauseSubscription(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('id') id: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    if (!merchantId) {
      throw new UnauthorizedException('Merchant context required');
    }
    return this.subscriptionsService.pauseSubscription(id, merchantId);
  }

  @Post(':id/resume')
  async resumeSubscription(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('id') id: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    if (!merchantId) {
      throw new UnauthorizedException('Merchant context required');
    }
    return this.subscriptionsService.resumeSubscription(id, merchantId);
  }

  @Delete(':id')
  async cancelSubscription(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('id') id: string,
    @Body() body?: { cancelAt?: string },
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    if (!merchantId) {
      throw new UnauthorizedException('Merchant context required');
    }
    const cancelAt = body?.cancelAt ? new Date(body.cancelAt) : undefined;
    return this.subscriptionsService.cancelSubscription(id, merchantId, cancelAt);
  }

  private resolveMerchantId(
    user: AuthenticatedUser | undefined,
    merchantFromApiKey: Merchant | undefined,
    merchantIdParam?: string,
  ): string | undefined {
    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        return user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        // Les admins peuvent voir toutes les subscriptions (undefined) ou filtrer par merchantId
        return merchantIdParam ?? undefined;
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


