import { IsOptional, IsString, IsUrl } from 'class-validator';

export class TestEbillingCredentialsDto {
  @IsString()
  username!: string;

  @IsString()
  sharedKey!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;
}


