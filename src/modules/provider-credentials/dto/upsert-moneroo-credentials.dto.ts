import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertMonerooCredentialsDto {
  @IsOptional()
  @IsIn(['production', 'sandbox'])
  environment?: string = 'production';

  @IsString()
  @MaxLength(256)
  secretKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  publicKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  walletId?: string;
}

