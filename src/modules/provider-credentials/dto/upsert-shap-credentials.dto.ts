import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpsertShapCredentialsDto {
  @IsString()
  apiId!: string;

  @IsString()
  apiSecret!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @IsOptional()
  @IsString()
  environment?: string;
}
