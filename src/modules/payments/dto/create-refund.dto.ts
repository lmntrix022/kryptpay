import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRefundDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number; // Si omis, rembourse le montant total

  @IsString()
  @IsOptional()
  reason?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}


