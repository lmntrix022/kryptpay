import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutStatus, PayoutType } from '@prisma/client';

export class PayoutResponseDto {
  @ApiProperty({ description: 'ID unique du payout', example: 'pout_01HXYZ' })
  payoutId!: string;

  @ApiProperty({ description: 'ID du marchand', example: 'mrc_01M' })
  merchantId!: string;

  @ApiProperty({ description: 'Provider utilisé', enum: ['SHAP', 'MONEROO', 'STRIPE'] })
  provider!: string;

  @ApiProperty({ description: 'Statut du payout', enum: PayoutStatus })
  status!: PayoutStatus;

  @ApiProperty({ description: 'Montant en unités mineures', example: 5000 })
  amount!: number;

  @ApiProperty({ description: 'Code devise', example: 'XOF' })
  currency!: string;

  @ApiProperty({ description: 'Nom du système de paiement', example: 'Moov Money' })
  paymentSystem!: string;

  @ApiProperty({ description: 'Type de payout', enum: PayoutType })
  payoutType!: PayoutType;

  @ApiProperty({ description: 'Numéro de téléphone du bénéficiaire', example: '+221771234567' })
  msisdn!: string;

  @ApiPropertyOptional({ description: 'Référence du provider externe' })
  providerReference?: string | null;

  @ApiPropertyOptional({ description: 'Référence externe' })
  externalReference?: string | null;

  @ApiPropertyOptional({ description: 'Métadonnées additionnelles' })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Date de création', example: '2025-11-01T10:15:00Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Date de mise à jour', example: '2025-11-01T10:15:00Z' })
  updatedAt!: string;

  @ApiProperty({ description: 'Historique des événements', type: [Object] })
  events!: Array<{ type: string; at: string }>;
}
