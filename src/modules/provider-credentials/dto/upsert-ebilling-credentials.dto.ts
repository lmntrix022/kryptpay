import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpsertEbillingCredentialsDto {
  @IsString()
  username!: string;

  @IsString()
  sharedKey!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @IsOptional()
  @IsString()
  environment?: string;
}

