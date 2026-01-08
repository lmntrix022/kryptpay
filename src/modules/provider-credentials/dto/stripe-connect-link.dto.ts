import { IsOptional, IsString, IsUrl } from 'class-validator';

export class StripeConnectLinkDto {
  @IsOptional()
  @IsUrl({ require_tld: false }) // Permet localhost et autres URLs sans TLD
  refreshUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false }) // Permet localhost et autres URLs sans TLD
  returnUrl?: string;

  @IsOptional()
  @IsString()
  merchantId?: string;
}
