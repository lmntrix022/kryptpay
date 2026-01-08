import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { merchants as Merchant, PayoutStatus } from '@prisma/client';

import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/current-user.decorator';
import { SellerDashboardService } from './seller-dashboard.service';

@ApiTags('Seller Dashboard')
@Controller('seller')
@UseGuards(JwtOrApiKeyGuard)
@ApiBearerAuth()
export class SellerDashboardController {
  constructor(private readonly dashboardService: SellerDashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques complètes du vendeur' })
  @ApiQuery({ name: 'currency', required: false, description: 'Devise (EUR par défaut)' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
    @Query('currency') currency?: string,
  ) {
    const merchantId = user?.merchantId || merchant?.id;
    if (!merchantId) {
      throw new Error('Merchant ID required');
    }
    return this.dashboardService.getSellerStats(merchantId, currency || 'EUR');
  }

  @Get('realtime')
  @ApiOperation({ summary: 'Statistiques en temps réel' })
  @ApiResponse({ status: 200, description: 'Statistiques temps réel récupérées' })
  async getRealtimeStats(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const merchantId = user?.merchantId || merchant?.id;
    if (!merchantId) {
      throw new Error('Merchant ID required');
    }
    return this.dashboardService.getRealtimeStats(merchantId);
  }

  @Get('revenue/by-gateway')
  @ApiOperation({ summary: 'Revenus par passerelle de paiement' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Revenus par gateway' })
  async getRevenueByGateway(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const merchantId = user?.merchantId || merchant?.id;
    if (!merchantId) {
      throw new Error('Merchant ID required');
    }
    return this.dashboardService.getRevenueByGateway(
      merchantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('payouts/history')
  @ApiOperation({ summary: 'Historique des reversements' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PayoutStatus })
  @ApiResponse({ status: 200, description: 'Historique des payouts' })
  async getPayoutHistory(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PayoutStatus,
  ) {
    const merchantId = user?.merchantId || merchant?.id;
    if (!merchantId) {
      throw new Error('Merchant ID required');
    }
    return this.dashboardService.getPayoutHistory(
      merchantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Prévisions de revenus' })
  @ApiResponse({ status: 200, description: 'Prévisions calculées' })
  async getForecast(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const merchantId = user?.merchantId || merchant?.id;
    if (!merchantId) {
      throw new Error('Merchant ID required');
    }
    return this.dashboardService.getRevenueForecast(merchantId);
  }
}

