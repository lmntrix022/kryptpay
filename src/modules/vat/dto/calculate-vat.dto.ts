import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateVatDto {
  @ApiProperty({ description: 'Clé d\'idempotence (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiProperty({ description: 'ID du paiement', example: 'pay_01HXYZ' })
  @IsUUID()
  @IsNotEmpty()
  paymentId!: string;

  @ApiProperty({ description: 'ID du marchand (seller)', example: 'mrc_01M' })
  @IsUUID()
  @IsNotEmpty()
  sellerId!: string;

  @ApiProperty({ description: 'Code pays du vendeur (ISO 3166-1 alpha-2)', example: 'GA' })
  @IsString()
  @IsNotEmpty()
  sellerCountry!: string;

  @ApiPropertyOptional({ description: 'Code pays de l\'acheteur (ISO 3166-1 alpha-2)', example: 'FR' })
  @IsString()
  @IsOptional()
  buyerCountry?: string;

  @ApiProperty({ description: 'Code devise (ISO 4217)', example: 'XAF' })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ description: 'Montant en unités mineures', example: 10000 })
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({ description: 'Le prix inclut-il la TVA ? (true = TTC, false = HT)', example: true })
  @IsBoolean()
  priceIncludesVat!: boolean;

  @ApiPropertyOptional({ description: 'Catégorie de produit', example: 'digital', default: 'default' })
  @IsString()
  @IsOptional()
  productCategory?: string;

  @ApiPropertyOptional({ description: 'Numéro de TVA de l\'acheteur (pour B2B)', example: 'FR12345678901' })
  @IsString()
  @IsOptional()
  buyerVatNumber?: string;
}

export class VatCalculationResponseDto {
  @ApiProperty({ description: 'ID de la transaction TVA', example: 'vat_txn_01HXYZ' })
  transactionId!: string;

  @ApiProperty({ description: 'Montant TTC (gross) en unités mineures', example: 10000 })
  amountGross!: number;

  @ApiProperty({ description: 'Montant HT (net) en unités mineures', example: 8474 })
  amountNet!: number;

  @ApiProperty({ description: 'Montant TVA en unités mineures', example: 1526 })
  vatAmount!: number;

  @ApiProperty({ description: 'Taux de TVA appliqué', example: 0.18 })
  vatRate!: number;

  @ApiProperty({ description: 'ID du taux de TVA utilisé', example: 'vat_rate_01HXYZ' })
  vatRateId!: string;

  @ApiProperty({ description: 'Version du calculateur', example: 'v1.0.0' })
  calculationVersion!: string;

  @ApiProperty({ description: 'Règle appliquée', example: 'destination_based', enum: ['destination_based', 'origin_based', 'reverse_charge', 'no_vat'] })
  appliedRule!: string;

  @ApiProperty({ description: 'Transaction B2B ?', example: false })
  isB2B!: boolean;
}

