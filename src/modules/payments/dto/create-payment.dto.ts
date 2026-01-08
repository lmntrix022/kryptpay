import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethod {
  Card = 'CARD',
  MobileMoney = 'MOBILE_MONEY',
  Momo = 'MOMO',
}

export class CustomerInfoDto {
  @ApiPropertyOptional({ description: 'Email du client', example: 'client@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Téléphone du client', example: '+221771234567' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID de la commande unique du marchand', example: 'ORD-2025-00123' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: 'Montant en unités mineures (ex: centimes)', example: 12500, minimum: 1 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Code devise ISO 4217 (3 lettres)', example: 'XOF', enum: ['XOF', 'EUR', 'USD'] })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ description: 'Code pays ISO 3166-1 alpha-2 (2 lettres)', example: 'SN' })
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @ApiProperty({ description: 'Méthode de paiement', enum: PaymentMethod, example: PaymentMethod.MobileMoney })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Métadonnées additionnelles (JSON)', example: { cart_id: 'cart_123' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Informations client', type: CustomerInfoDto })
  @IsOptional()
  @Type(() => CustomerInfoDto)
  customer?: CustomerInfoDto;

  @ApiPropertyOptional({ description: 'URL de retour après paiement', example: 'https://merchant.com/checkout/success' })
  @IsString()
  @IsOptional()
  returnUrl?: string;
}
