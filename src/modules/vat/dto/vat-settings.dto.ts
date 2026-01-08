import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVatSettingsDto {
  @ApiPropertyOptional({ description: 'TVA activée pour ce marchand', example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Code pays du vendeur (ISO 3166-1 alpha-2)', example: 'GA' })
  @IsString()
  @IsOptional()
  sellerCountry?: string;

  @ApiPropertyOptional({ description: 'Détection automatique du pays de l\'acheteur', example: true })
  @IsBoolean()
  @IsOptional()
  autoDetectBuyerCountry?: boolean;

  @ApiPropertyOptional({ 
    description: 'Comportement fiscal par défaut', 
    example: 'destination_based',
    enum: ['destination_based', 'origin_based', 'no_vat']
  })
  @IsString()
  @IsOptional()
  defaultTaxBehavior?: string;

  @ApiPropertyOptional({ description: 'Reversement automatique activé', example: false })
  @IsBoolean()
  @IsOptional()
  autoReversement?: boolean;

  @ApiPropertyOptional({ description: 'Compte pour reversement', example: 'account_123' })
  @IsString()
  @IsOptional()
  reversementAccount?: string;

  @ApiPropertyOptional({ description: 'Taux par défaut par catégorie (JSON)', example: { digital: 0.18, physical: 0.20 } })
  @IsObject()
  @IsOptional()
  defaultRates?: Record<string, number>;
}

export class VatSettingsResponseDto {
  @ApiProperty({ description: 'ID des paramètres', example: 'vat_settings_01HXYZ' })
  id!: string;

  @ApiProperty({ description: 'ID du marchand', example: 'mrc_01M' })
  merchantId!: string;

  @ApiProperty({ description: 'TVA activée', example: true })
  enabled!: boolean;

  @ApiProperty({ description: 'Code pays du vendeur', example: 'GA' })
  sellerCountry!: string;

  @ApiProperty({ description: 'Détection automatique du pays acheteur', example: true })
  autoDetectBuyerCountry!: boolean;

  @ApiProperty({ description: 'Comportement fiscal par défaut', example: 'destination_based' })
  defaultTaxBehavior!: string;

  @ApiProperty({ description: 'Reversement automatique', example: false })
  autoReversement!: boolean;

  @ApiPropertyOptional({ description: 'Compte pour reversement' })
  reversementAccount?: string;

  @ApiPropertyOptional({ description: 'Taux par défaut par catégorie' })
  defaultRates?: Record<string, number>;

  @ApiProperty({ description: 'Date de création', example: '2025-11-01T10:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Date de mise à jour', example: '2025-11-01T10:00:00Z' })
  updatedAt!: string;
}

export class ReversementValidationResponseDto {
  @ApiProperty({ description: 'Le reversement automatique peut être activé', example: true })
  canEnableAutoReversement!: boolean;

  @ApiProperty({ description: 'Providers de versement disponibles', example: ['STRIPE', 'SHAP'] })
  availableProviders!: string[];

  @ApiPropertyOptional({ description: 'Type de compte détecté', enum: ['bank', 'mobile_money', 'unknown'] })
  accountType?: 'bank' | 'mobile_money' | 'unknown';

  @ApiProperty({ description: 'Providers compatibles avec le type de compte', example: ['STRIPE'] })
  compatibleProviders!: string[];

  @ApiProperty({ description: 'Avertissements', example: [] })
  warnings!: string[];

  @ApiProperty({ description: 'Suggestions', example: ['Configurez Stripe pour...'] })
  suggestions!: string[];
}

