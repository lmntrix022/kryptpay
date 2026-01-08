import { PayoutType, PayoutProvider } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayoutDto {
  @ApiProperty({ description: 'Nom du système de paiement', example: 'Moov Money' })
  @IsString()
  @IsNotEmpty()
  paymentSystemName!: string;

  @ApiProperty({ description: 'Numéro de téléphone du bénéficiaire (MSISDN)', example: '+221771234567' })
  @IsString()
  @IsNotEmpty()
  payeeMsisdn!: string;

  @ApiProperty({ description: 'Montant en unités mineures', example: 5000, minimum: 1 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ description: 'Code devise ISO 4217 (3 lettres)', example: 'XOF', minLength: 3, maxLength: 3 })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiPropertyOptional({ description: 'Référence externe optionnelle' })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({ description: 'Type de payout', enum: PayoutType })
  @IsOptional()
  @IsEnum(PayoutType)
  payoutType?: PayoutType;

  @ApiPropertyOptional({ description: 'Provider à utiliser', enum: PayoutProvider })
  @IsOptional()
  @IsEnum(PayoutProvider)
  provider?: PayoutProvider;

  @ApiPropertyOptional({ description: 'Métadonnées additionnelles' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
