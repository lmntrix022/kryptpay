import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayoutStatus } from '@prisma/client';

import { ProviderCredentialsService } from '../../provider-credentials/provider-credentials.service';
import {
  formatAmountFromMinor,
  isZeroDecimalCurrency,
} from '../../../shared/currency/currency.utils';

import {
  CreatePayoutContext,
  CreatePayoutResult,
  PayoutProvider,
} from './payout-provider.interface';

type ShapCredentials = {
  apiId?: string;
  apiSecret?: string;
  baseUrl?: string;
};

type ShapAuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type ShapPayoutResponse = {
  successful?: string;
  success_message?: string;
  response?: {
    payout_id?: string;
    transaction_id?: string;
    payment_system_name?: string;
    amount?: number;
    currency?: string;
    external_reference?: string;
    state?: string;
  };
};

@Injectable()
export class ShapPayoutProviderService implements PayoutProvider {
  private readonly logger = new Logger(ShapPayoutProviderService.name);
  private readonly defaultBaseUrl: string;
  private readonly tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly providerCredentialsService: ProviderCredentialsService,
  ) {
    this.defaultBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>(
        'SHAP_BASE_URL',
        'https://test.billing-easy.net/shap/api/v1/merchant',
      ),
    );
  }

  async createPayout(context: CreatePayoutContext): Promise<CreatePayoutResult> {
    const { payout, merchant_id, dto } = context;
    const credentials = await this.resolveCredentials(merchant_id);
    const accessToken = await this.getAccessToken(merchant_id, credentials);

    const endpoint = `${credentials.baseUrl}/payout`;
    const amountFormatted = formatAmountFromMinor(payout.amount_minor, payout.currency);
    const amount = isZeroDecimalCurrency(payout.currency)
      ? Number.parseInt(amountFormatted, 10)
      : Number.parseFloat(amountFormatted);

    // Normaliser le MSISDN pour le Gabon (format local)
    const normalizedMsisdn = this.normalizeMsisdn(dto.payeeMsisdn);

    const payload = {
      payment_system_name: dto.paymentSystemName,
      payout: {
        payee_msisdn: normalizedMsisdn,
        amount,
        external_reference: payout.external_reference ?? payout.id,
        payout_type: payout.payout_type.toLowerCase(),
      },
    } satisfies Record<string, unknown>;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.buildHeaders(accessToken),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.invalidateToken(merchant_id);
      }

      const text = await response.text().catch(() => '');
      let errorMessage = `SHAP payout failed (${response.status})`;
      
      try {
        const errorJson = JSON.parse(text);
        if (errorJson.error_code) {
          // Format d'erreur SHAP avec code (ex: SP0016)
          const errorDesc = errorJson.error_description || errorJson.error || errorJson.message || 'Erreur inconnue';
          errorMessage = `SHAP payout failed [${errorJson.error_code}]: ${errorDesc}`;
        } else if (errorJson.message) {
          errorMessage = `SHAP payout failed: ${errorJson.message}`;
        } else if (errorJson.error) {
          errorMessage = `SHAP payout failed: ${errorJson.error}`;
        } else if (errorJson.code && errorJson.message) {
          errorMessage = `SHAP payout failed [${errorJson.code}]: ${errorJson.message}`;
        }
      } catch {
        // Si ce n'est pas du JSON, utiliser le texte brut
        if (text) {
          errorMessage = `SHAP payout failed: ${text}`;
        }
      }

      this.logger.error(`${errorMessage}. Status: ${response.status}, Response: ${text}, Payload: ${JSON.stringify(payload)}`);
      
      // Convertir les erreurs SHAP en exceptions HTTP appropriées
      if (response.status === 400 || response.status === 402) {
        throw new BadRequestException(errorMessage);
      }
      throw new HttpException(errorMessage, response.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const json = (await response.json().catch(() => ({}))) as ShapPayoutResponse;
    const payloadResponse = json.response ?? {};

    return {
      providerReference: payloadResponse.payout_id ?? payloadResponse.transaction_id,
      status: this.mapStatus(payloadResponse.state),
      metadata: {
        paymentSystem: payloadResponse.payment_system_name ?? dto.paymentSystemName,
        amount: payloadResponse.amount ?? amount,
        currency: payloadResponse.currency ?? payout.currency,
        shapResponse: json,
      },
      rawResponse: json,
    };
  }

  private async resolveCredentials(merchant_id: string): Promise<{
    apiId: string;
    apiSecret: string;
    baseUrl: string;
  }> {
    const stored = await this.providerCredentialsService.getCredentials<ShapCredentials>(
      merchant_id,
      'SHAP',
    );

    const apiId = stored?.apiId ?? this.configService.get<string>('SHAP_API_ID');
    const apiSecret = stored?.apiSecret ?? this.configService.get<string>('SHAP_API_SECRET');
    const baseUrl = this.normalizeBaseUrl(stored?.baseUrl ?? this.defaultBaseUrl);

    if (!apiId || !apiSecret) {
      this.logger.warn(
        `SHAP credentials not found for merchant ${merchant_id}. Checked stored credentials and environment variables.`,
      );
      throw new Error(
        'SHAP credentials are not configured. Please configure credentials either per merchant or set SHAP_API_ID and SHAP_API_SECRET environment variables.',
      );
    }

    this.logger.debug(
      `Using SHAP credentials for merchant ${merchant_id} (${stored ? 'stored' : 'system default'})`,
    );

    return { apiId, apiSecret, baseUrl };
  }

  private async getAccessToken(
    merchant_id: string,
    credentials: { apiId: string; apiSecret: string; baseUrl: string },
  ): Promise<string> {
    const cacheKey = this.buildCacheKey(merchant_id, credentials.baseUrl);
    const cached = this.tokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() + 30_000) {
      return cached.token;
    }

    const authEndpoint = `${credentials.baseUrl}/auth`;
    let response: Response;
    let errorText = '';

    try {
      response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_id: credentials.apiId,
          api_secret: credentials.apiSecret,
        }),
      });

      if (!response.ok) {
        errorText = await response.text().catch(() => '');
        let errorMessage = `SHAP authentication failed (${response.status})`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = `SHAP authentication failed: ${errorJson.message}`;
          } else if (errorJson.error) {
            errorMessage = `SHAP authentication failed: ${errorJson.error}`;
          }
        } catch {
          // Si ce n'est pas du JSON, utiliser le texte brut
          if (errorText) {
            errorMessage = `SHAP authentication failed: ${errorText}`;
          }
        }

        this.logger.error(`${errorMessage}. Status: ${response.status}, Response: ${errorText}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('authentication')) {
        throw error;
      }
      this.logger.error(`SHAP auth request error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Unable to connect to SHAP API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const auth = (await response.json().catch(() => ({}))) as Partial<ShapAuthResponse>;
    const token = auth.access_token;
    const expiresIn = Number(auth.expires_in ?? 0);

    if (!token) {
      throw new Error('Invalid SHAP auth response');
    }

    const expiresAt =
      Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 3600_000);
    this.tokenCache.set(cacheKey, { token, expiresAt });

    return token;
  }

  private mapStatus(state?: string): PayoutStatus | undefined {
    switch ((state ?? '').toLowerCase()) {
      case 'success':
      case 'successful':
        return PayoutStatus.SUCCEEDED;
      case 'pending':
      case 'processing':
        return PayoutStatus.PROCESSING;
      case 'failed':
      case 'error':
        return PayoutStatus.FAILED;
      default:
        return undefined;
    }
  }

  private buildHeaders(token: string): Headers {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    return headers;
  }

  private buildCacheKey(merchant_id: string, baseUrl: string): string {
    return `${merchant_id}:${baseUrl}`;
  }

  private invalidateToken(merchant_id: string): void {
    for (const key of this.tokenCache.keys()) {
      if (key.startsWith(`${merchant_id}:`)) {
        this.tokenCache.delete(key);
      }
    }
  }

  private normalizeBaseUrl(url: string | undefined): string {
    if (!url) {
      return this.defaultBaseUrl;
    }
    return url.replace(/\/$/, '');
  }

  /**
   * Normalise le MSISDN pour le Gabon
   * Format attendu par SHAP/eBilling: format local (074398524) ou international (241074398524)
   */
  private normalizeMsisdn(msisdn: string): string {
    const digits = msisdn.replace(/\D/g, '');

    // Si déjà au format international complet (241...)
    if (digits.startsWith('241') && digits.length === 11) {
      // Retourner le format local (0...)
      return `0${digits.slice(3)}`;
    }

    // Si format international sans 241 (8 chiffres commençant par 0)
    if (digits.length === 8 && digits.startsWith('0')) {
      return digits; // Déjà au bon format
    }

    // Si format local sans le 0 initial (7 chiffres)
    if (digits.length === 7) {
      return `0${digits}`;
    }

    // Si format 9 chiffres (international partiel)
    if (digits.length === 9 && digits.startsWith('0')) {
      return digits;
    }

    // Retourner tel quel si déjà valide, sinon essayer de formater
    return digits.length >= 8 ? `0${digits.slice(-8)}` : msisdn;
  }
}
