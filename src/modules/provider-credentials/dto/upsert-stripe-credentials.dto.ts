import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertStripeCredentialsDto {
  @IsOptional()
  @IsIn(['production', 'sandbox'])
  environment?: string = 'production';

  @IsString()
  @MaxLength(256)
  secretKey!: string;

  @IsString()
  @MaxLength(256)
  publishableKey!: string;
}

