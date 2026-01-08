import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateVatSettingsDto, VatSettingsResponseDto } from './dto/vat-settings.dto';
import { VatProviderValidationService } from './vat-provider-validation.service';

@Injectable()
export class VatSettingsService {
  private readonly logger = new Logger(VatSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerValidationService: VatProviderValidationService,
  ) {}

  /**
   * Récupère les paramètres TVA d'un marchand
   */
  async getSettings(merchant_id: string): Promise<VatSettingsResponseDto | null> {
    const settings = await this.prisma.merchant_vat_settings.findUnique({
      where: { merchant_id: merchant_id },
    });

    if (!settings) {
      return null;
    }

    return this.mapToResponseDto(settings);
  }

  /**
   * Met à jour ou crée les paramètres TVA d'un marchand
   */
  async upsertSettings(
    merchant_id: string,
    dto: UpdateVatSettingsDto,
  ): Promise<VatSettingsResponseDto> {
    // Récupérer les paramètres existants pour obtenir sellerCountry si non fourni
    const existingSettings = await this.prisma.merchant_vat_settings.findUnique({
      where: { merchant_id: merchant_id },
      select: { seller_country: true },
    });

    const sellerCountry = dto.sellerCountry || existingSettings?.seller_country || 'GA';
    const reversementAccount = dto.reversementAccount;

    // Valider le reversement automatique si activé
    if (dto.autoReversement === true) {
      const validation = await this.providerValidationService.validateReversementConfiguration(
        merchant_id,
        reversementAccount,
        sellerCountry,
      );

      if (!validation.canEnableAutoReversement) {
        const errorMessage = [
          'Le reversement automatique ne peut pas être activé :',
          ...validation.warnings,
          '',
          'Suggestions :',
          ...validation.suggestions,
        ].join('\n');

        throw new BadRequestException(errorMessage);
      }

      // Vérifier que le compte de reversement est fourni
      if (!reversementAccount || reversementAccount.trim().length === 0) {
        throw new BadRequestException(
          'Le compte de reversement est requis pour activer le reversement automatique.',
        );
      }
    }

    const settings = await this.prisma.merchant_vat_settings.upsert({
      where: { merchant_id: merchant_id },
      create: {
        id: randomUUID(),
        merchant_id: merchant_id,
        enabled: dto.enabled ?? false,
        seller_country: sellerCountry,
        auto_detect_buyer_country: dto.autoDetectBuyerCountry ?? true,
        default_tax_behavior: dto.defaultTaxBehavior || 'destination_based',
        auto_reversement: dto.autoReversement ?? false,
        reversement_account: reversementAccount,
        default_rates: dto.defaultRates as any,
        updated_at: new Date(),
      },
      update: {
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.sellerCountry && { seller_country: dto.sellerCountry }),
        ...(dto.autoDetectBuyerCountry !== undefined && {
          auto_detect_buyer_country: dto.autoDetectBuyerCountry,
        }),
        ...(dto.defaultTaxBehavior && { default_tax_behavior: dto.defaultTaxBehavior }),
        ...(dto.autoReversement !== undefined && { auto_reversement: dto.autoReversement }),
        ...(dto.reversementAccount !== undefined && { reversement_account: dto.reversementAccount }),
        ...(dto.defaultRates && { default_rates: dto.defaultRates as any }),
      },
    });

    return this.mapToResponseDto(settings);
  }

  /**
   * Vérifie si la TVA est activée pour un marchand
   */
  async isEnabled(merchant_id: string): Promise<boolean> {
    const settings = await this.prisma.merchant_vat_settings.findUnique({
      where: { merchant_id: merchant_id },
      select: { enabled: true },
    });

    return settings?.enabled ?? false;
  }

  private mapToResponseDto(settings: any): VatSettingsResponseDto {
    return {
      id: settings.id,
      merchantId: settings.merchant_id,
      enabled: settings.enabled,
      sellerCountry: settings.seller_country,
      autoDetectBuyerCountry: settings.auto_detect_buyer_country,
      defaultTaxBehavior: settings.default_tax_behavior,
      autoReversement: settings.auto_reversement,
      reversementAccount: settings.reversement_account,
      defaultRates: settings.default_rates as Record<string, number> | undefined,
      createdAt: settings.created_at.toISOString(),
      updatedAt: settings.updated_at.toISOString(),
    };
  }
}

