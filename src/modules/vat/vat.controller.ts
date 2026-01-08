import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/current-user.decorator';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { merchants as Merchant } from '@prisma/client';
import { VatService } from './vat.service';
import { VatCalculationService } from './vat-calculation.service';
import { VatRatesService } from './vat-rates.service';
import { VatReportsService } from './vat-reports.service';
import { VatPaymentsService } from './vat-payments.service';
import { VatSettingsService } from './vat-settings.service';
import { VatProviderValidationService } from './vat-provider-validation.service';
import { VatSubscriptionService } from './vat-subscription.service';
import { VatReportExportService } from './vat-report-export.service';
import { CalculateVatDto, VatCalculationResponseDto } from './dto/calculate-vat.dto';
import { UpdateVatSettingsDto, VatSettingsResponseDto, ReversementValidationResponseDto } from './dto/vat-settings.dto';
import { GenerateVatReportDto, VatReportResponseDto, ReportFormat } from './dto/vat-report.dto';

@ApiTags('VAT')
@Controller('vat')
@UseGuards(JwtOrApiKeyGuard)
@ApiSecurity('api-key')
@ApiBearerAuth('JWT-auth')
export class VatController {
  constructor(
    private readonly vatService: VatService,
    private readonly calculationService: VatCalculationService,
    private readonly ratesService: VatRatesService,
    private readonly reportsService: VatReportsService,
    private readonly paymentsService: VatPaymentsService,
    private readonly settingsService: VatSettingsService,
    private readonly providerValidationService: VatProviderValidationService,
    private readonly subscriptionService: VatSubscriptionService,
    private readonly exportService: VatReportExportService,
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcule la TVA pour un paiement (idempotent)' })
  async calculateVat(
    @Body() dto: CalculateVatDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ): Promise<VatCalculationResponseDto> {
    // Récupérer le merchant_id depuis l'authentification
    const merchant_id = merchant?.id || user?.merchantId;
    if (!merchant_id) {
      throw new UnauthorizedException('Merchant ID not found');
    }

    // S'assurer que le sellerId correspond au merchant authentifié
    if (dto.sellerId !== merchant_id) {
      throw new UnauthorizedException('Seller ID does not match authenticated merchant');
    }

    return this.calculationService.calculateVat(dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Liste les transactions TVA du marchand' })
  async listTransactions(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const merchant_id = merchant?.id || user?.merchantId;
    if (!merchant_id) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    return this.vatService.listVatTransactions(merchant_id);
  }

  @Get('transactions/:paymentId')
  @ApiOperation({ summary: 'Récupère la transaction TVA pour un paiement' })
  async getTransaction(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const merchant_id = merchant?.id || user?.merchantId;
    if (!merchant_id) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    return this.vatService.getVatTransaction(paymentId, merchant_id);
  }

  @Get('merchants/:merchant_id/vat-settings')
  @ApiOperation({ summary: 'Récupère les paramètres TVA d\'un marchand' })
  async getVatSettings(
    @Param('merchant_id') merchant_id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ): Promise<VatSettingsResponseDto | null> {
    // Vérifier que le marchand correspond à l'utilisateur authentifié
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }

    const settings = await this.settingsService.getSettings(merchant_id);
    if (!settings) {
      return null;
    }
    return settings;
  }

  @Put('merchants/:merchant_id/vat-settings')
  @ApiOperation({ summary: 'Met à jour les paramètres TVA d\'un marchand' })
  async updateVatSettings(
    @Param('merchant_id') merchant_id: string,
    @Body() dto: UpdateVatSettingsDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ): Promise<VatSettingsResponseDto> {
    // Vérifier que le marchand correspond à l'utilisateur authentifié
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }

    return this.settingsService.upsertSettings(merchant_id, dto);
  }

  @Get('merchants/:merchant_id/reversement-validation')
  @ApiOperation({ summary: 'Valide la configuration du reversement automatique' })
  async validateReversement(
    @Param('merchant_id') merchant_id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
    @Query('reversementAccount') reversementAccount?: string,
    @Query('sellerCountry') sellerCountry?: string,
  ): Promise<ReversementValidationResponseDto> {
    // Vérifier que le marchand correspond à l'utilisateur authentifié
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }

    // Utiliser les paramètres de requête s'ils sont fournis, sinon récupérer depuis les settings
    let accountToValidate = reversementAccount;
    let countryToUse = sellerCountry;

    if (!accountToValidate || !countryToUse) {
      const settings = await this.settingsService.getSettings(merchant_id);
      accountToValidate = accountToValidate || settings?.reversementAccount || undefined;
      countryToUse = countryToUse || settings?.sellerCountry;
    }

    const validation = await this.providerValidationService.validateReversementConfiguration(
      merchant_id,
      accountToValidate,
      countryToUse,
    );

    return {
      canEnableAutoReversement: validation.canEnableAutoReversement,
      availableProviders: validation.availableProviders,
      accountType: validation.accountType,
      compatibleProviders: validation.compatibleProviders,
      warnings: validation.warnings,
      suggestions: validation.suggestions,
    };
  }

  @Post('merchants/:merchant_id/vat-reports')
  @ApiOperation({ summary: 'Génère un rapport TVA pour une période' })
  async generateReport(
    @Param('merchant_id') merchant_id: string,
    @Body() dto: GenerateVatReportDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ): Promise<VatReportResponseDto> {
    // Vérifier que le marchand correspond à l'utilisateur authentifié
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }
    const report = await this.reportsService.generateReport(merchant_id, dto);
    return {
      id: report.id,
      merchantId: report.merchant_id,
      periodStart: report.period_start.toISOString().split('T')[0],
      periodEnd: report.period_end.toISOString().split('T')[0],
      totalVat: Number(report.total_vat),
      totalSales: Number(report.total_sales),
      totalNet: Number(report.total_net),
      transactionCount: report.transaction_count,
      status: report.status,
      generatedAt: report.generated_at.toISOString(),
    };
  }

  @Get('merchants/:merchant_id/vat-reports')
  @ApiOperation({ summary: 'Liste les rapports TVA d\'un marchand' })
  async listReports(
    @Param('merchant_id') merchant_id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    // Vérifier que le marchand correspond à l'utilisateur authentifié
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }
    return this.reportsService.listReports(merchant_id);
  }

  @Get('vat-reports/:reportId')
  @ApiOperation({ summary: 'Récupère un rapport TVA' })
  async getReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const merchant_id = merchant?.id || user?.merchantId;
    if (!merchant_id) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    return this.reportsService.getReport(reportId, merchant_id);
  }

  @Post('vat-reports/:reportId/submit')
  @ApiOperation({ summary: 'Soumet un rapport TVA' })
  async submitReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const merchant_id = merchant?.id || user?.merchantId;
    if (!merchant_id) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    return this.reportsService.submitReport(reportId, merchant_id);
  }

  @Get('vat-reports/:reportId/export')
  @ApiOperation({ summary: 'Exporte un rapport TVA (CSV/XLSX/PDF)' })
  @ApiQuery({ name: 'format', enum: ReportFormat, required: false, description: 'Format d\'export (csv, xlsx, pdf)', example: 'csv' })
  @ApiResponse({ status: 200, description: 'Fichier exporté avec succès' })
  @ApiResponse({ status: 400, description: 'Format invalide' })
  @ApiResponse({ status: 404, description: 'Rapport non trouvé' })
  async exportReport(
    @Param('reportId') reportId: string,
    @Query('format') format: ReportFormat = ReportFormat.CSV,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
    @Res() res: Response,
  ) {
    const merchant_id = merchant?.id || user?.merchantId;
    if (!merchant_id) {
      throw new UnauthorizedException('Merchant ID not found');
    }

    // Valider le format
    if (!Object.values(ReportFormat).includes(format)) {
      throw new BadRequestException(
        `Format invalide. Formats supportés: ${Object.values(ReportFormat).join(', ')}`,
      );
    }

    try {
      switch (format) {
        case ReportFormat.CSV:
          await this.exportService.exportToCSV(reportId, merchant_id, res);
          break;
        case ReportFormat.XLSX:
          await this.exportService.exportToXLSX(reportId, merchant_id, res);
          break;
        case ReportFormat.PDF:
          await this.exportService.exportToPDF(reportId, merchant_id, res);
          break;
        default:
          throw new BadRequestException(`Format ${format} non supporté`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      );
    }
  }

  @Get('rates')
  @ApiOperation({ summary: 'Liste les taux de TVA (admin)' })
  async listRates(@Body() body: { countryCode?: string }) {
    if (body.countryCode) {
      return this.ratesService.listRates(body.countryCode);
    }
    // TODO: Liste tous les taux
    return [];
  }

  // ============================================
  // Abonnements TVA
  // ============================================

  @Get('merchants/:merchant_id/subscriptions')
  @ApiOperation({ summary: 'Liste les abonnements TVA d\'un marchand' })
  async listVatSubscriptions(
    @Param('merchant_id') merchant_id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }

    return this.subscriptionService.listVatSubscriptions(merchant_id);
  }

  @Get('merchants/:merchant_id/subscriptions/active')
  @ApiOperation({ summary: 'Récupère l\'abonnement TVA actif d\'un marchand' })
  async getActiveVatSubscription(
    @Param('merchant_id') merchant_id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }

    const subscription = await this.subscriptionService.getActiveVatSubscription(merchant_id);
    return subscription || null;
  }

  @Post('merchants/:merchant_id/subscriptions')
  @ApiOperation({ summary: 'Crée un abonnement TVA pour un marchand' })
  async createVatSubscription(
    @Param('merchant_id') merchant_id: string,
    @Body() body: { planType: 'TAX_PRO' | 'BUSINESS_SUITE'; customerEmail: string; customerPhone?: string },
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }

    return this.subscriptionService.createVatSubscription({
      merchant_id,
      planType: body.planType,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
    });
  }

  @Put('merchants/:merchant_id/subscriptions/upgrade')
  @ApiOperation({ summary: 'Change le plan d\'abonnement TVA (upgrade/downgrade)' })
  async upgradeOrDowngradePlan(
    @Param('merchant_id') merchant_id: string,
    @Body() body: { planType: 'TAX_PRO' | 'BUSINESS_SUITE' },
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }

    return this.subscriptionService.upgradeOrDowngradePlan(merchant_id, body.planType);
  }

  @Post('merchants/:merchant_id/subscriptions/cancel')
  @ApiOperation({ summary: 'Annule l\'abonnement TVA actif d\'un marchand' })
  async cancelVatSubscription(
    @Param('merchant_id') merchant_id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const authenticatedMerchantId = merchant?.id || user?.merchantId;
    if (!authenticatedMerchantId) {
      throw new UnauthorizedException('Merchant ID not found');
    }
    if (authenticatedMerchantId !== merchant_id) {
      throw new UnauthorizedException('Merchant ID mismatch');
    }

    return this.subscriptionService.cancelVatSubscription(merchant_id);
  }

  @Get('subscriptions/plans')
  @ApiOperation({ summary: 'Obtient les informations de pricing des plans TVA' })
  async getPlanPricing() {
    return this.subscriptionService.getPlanPricing();
  }
}

