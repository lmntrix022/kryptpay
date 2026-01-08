import { Controller, Get, Query, Res, UseGuards, UnauthorizedException, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { merchants as Merchant, UserRole } from '@prisma/client';
import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/current-user.decorator';
import { AnalyticsService, AnalyticsFilters } from './analytics.service';
import { ExportService } from './export.service';

@ApiTags('Analytics')
@Controller('admin/analytics')
@UseGuards(JwtOrApiKeyGuard)
@ApiBearerAuth('JWT-auth')
@ApiSecurity('api-key')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly exportService: ExportService,
  ) {}

  @Get('payments')
  @ApiOperation({ summary: 'Analytics des paiements', description: 'Récupère les statistiques et analytics des paiements avec filtres optionnels' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Date de fin (ISO 8601)' })
  @ApiQuery({ name: 'gateway', required: false, enum: ['STRIPE', 'MONEROO', 'EBILLING'], description: 'Filtrer par passerelle' })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Filtrer par devise' })
  @ApiQuery({ name: 'countryCode', required: false, type: String, description: 'Filtrer par code pays' })
  @ApiQuery({ name: 'isTestMode', required: false, enum: ['true', 'false'], description: 'Filtrer par mode test' })
  @ApiResponse({ status: 200, description: 'Analytics des paiements récupérées avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async getPaymentAnalytics(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('gateway') gateway?: string,
    @Query('currency') currency?: string,
    @Query('countryCode') countryCode?: string,
    @Query('isTestMode') isTestMode?: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    
    const filters: AnalyticsFilters = {
      merchantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      gateway: gateway as any,
      currency,
      countryCode,
      isTestMode: isTestMode === 'true' ? true : isTestMode === 'false' ? false : undefined,
    };

    return this.analyticsService.getPaymentAnalytics(filters);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Analytics des payouts', description: 'Récupère les statistiques et analytics des payouts avec filtres optionnels' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Date de fin (ISO 8601)' })
  @ApiQuery({ name: 'currency', required: false, type: String, description: 'Filtrer par devise' })
  @ApiQuery({ name: 'isTestMode', required: false, enum: ['true', 'false'], description: 'Filtrer par mode test' })
  @ApiResponse({ status: 200, description: 'Analytics des payouts récupérées avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async getPayoutAnalytics(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('currency') currency?: string,
    @Query('isTestMode') isTestMode?: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    
    const filters: AnalyticsFilters = {
      merchantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      currency,
      isTestMode: isTestMode === 'true' ? true : isTestMode === 'false' ? false : undefined,
    };

    return this.analyticsService.getPayoutAnalytics(filters);
  }

  @Get('combined')
  @ApiOperation({ summary: 'Analytics combinées', description: 'Récupère les analytics combinées (paiements + payouts) avec filtres optionnels' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Date de fin (ISO 8601)' })
  @ApiQuery({ name: 'isTestMode', required: false, enum: ['true', 'false'], description: 'Filtrer par mode test' })
  @ApiResponse({ status: 200, description: 'Analytics combinées récupérées avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async getCombinedAnalytics(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isTestMode') isTestMode?: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    
    const filters: AnalyticsFilters = {
      merchantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isTestMode: isTestMode === 'true' ? true : isTestMode === 'false' ? false : undefined,
    };

    return this.analyticsService.getCombinedAnalytics(filters);
  }

  @Get('payments/export/:format')
  @ApiOperation({ summary: 'Exporter analytics paiements', description: 'Exporte les analytics des paiements au format CSV ou PDF' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Date de fin (ISO 8601)' })
  @ApiQuery({ name: 'gateway', required: false, enum: ['STRIPE', 'MONEROO', 'EBILLING'], description: 'Filtrer par passerelle' })
  @ApiResponse({ status: 200, description: 'Fichier exporté avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async exportPaymentAnalytics(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('format') format: 'csv' | 'pdf',
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('gateway') gateway?: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    
    const filters: AnalyticsFilters = {
      merchantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      gateway: gateway as any,
    };

    const analytics = await this.analyticsService.getPaymentAnalytics(filters);
    const filename = `payment-analytics-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      await this.exportService.exportToCSV(analytics, res, filename);
    } else {
      await this.exportService.exportToPDF(analytics, res, filename);
    }
  }

  private resolveMerchantId(
    user: AuthenticatedUser | undefined,
    merchantFromApiKey: Merchant | undefined,
  ): string | undefined {
    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        return user.merchantId;
      } else if (user.role === UserRole.ADMIN) {
        // Admin peut voir les analytics globaux
        return undefined;
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

