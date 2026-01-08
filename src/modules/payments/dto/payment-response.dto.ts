import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../payments.types';

export class CheckoutPayload {
  @ApiProperty({ description: 'Type de checkout', enum: ['CLIENT_SECRET', 'REDIRECT'] })
  type!: 'CLIENT_SECRET' | 'REDIRECT';

  @ApiPropertyOptional({ description: 'Client secret Stripe (pour CLIENT_SECRET)' })
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'URL de redirection (pour REDIRECT)' })
  url?: string;

  @ApiPropertyOptional({ description: 'Clé publique Stripe' })
  publishableKey?: string;

  @ApiPropertyOptional({ description: 'ID du compte Stripe Connect' })
  stripeAccount?: string;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'ID unique du paiement', example: 'pay_01HXYZ' })
  paymentId!: string;

  @ApiProperty({ description: 'ID du marchand', example: 'mrc_01M' })
  merchantId!: string;

  @ApiProperty({ description: 'ID de la commande', example: 'ORD-2025-00123' })
  orderId!: string;

  @ApiProperty({ description: 'Passerelle utilisée', enum: ['STRIPE', 'MONEROO', 'EBILLING'] })
  gatewayUsed!: 'STRIPE' | 'MONEROO' | 'EBILLING';

  @ApiProperty({ description: 'Statut du paiement', enum: ['PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED'] })
  status!: PaymentStatus;

  @ApiProperty({ description: 'Montant en unités mineures', example: 12500 })
  amount!: number;

  @ApiProperty({ description: 'Code devise', example: 'XOF' })
  currency!: string;

  @ApiPropertyOptional({ description: 'Référence du provider externe' })
  providerReference?: string;

  @ApiPropertyOptional({ description: 'Informations de checkout', type: CheckoutPayload })
  checkout?: CheckoutPayload;

  @ApiPropertyOptional({ description: 'Métadonnées additionnelles' })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Historique des événements', type: [Object] })
  events?: Array<{
    type: string;
    at: string;
    providerEventId?: string;
  }>;

  @ApiProperty({ description: 'Date de création', example: '2025-11-01T10:15:00Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Date de mise à jour', example: '2025-11-01T10:15:00Z' })
  updatedAt!: string;
}
