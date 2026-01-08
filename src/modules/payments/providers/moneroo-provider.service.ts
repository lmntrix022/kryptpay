import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, RefundStatus } from '@prisma/client';

import { ProviderCredentialsService } from '../../provider-credentials/provider-credentials.service';
import { RetryService } from '../../../common/services/retry.service';
import {
  formatAmountFromMinor,
  isZeroDecimalCurrency,
} from '../../../shared/currency/currency.utils';

import {
  CreatePaymentResult,
  CreatePaymentContext,
  PaymentProvider,
} from './payment-provider.interface';
import {
  CreateRefundResult,
  CreateRefundContext,
  RefundProvider,
} from './refund-provider.interface';

type MonerooCredentials = {
  secretKey: string;
  environment?: string;
};

type MonerooInitializeRequest = {
  amount: number;
  currency: string;
  description: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  return_url: string;
  metadata?: Record<string, string>;
  methods?: string[];
  restrict_country_code?: string;
  restricted_phone?: {
    number: string;
    country_code: string;
  };
};

type MonerooInitializeResponse = {
  message?: string;
  data?: {
    id: string;
    checkout_url: string;
  };
  errors?: unknown;
};

@Injectable()
export class MonerooProviderService implements PaymentProvider, RefundProvider {
  private readonly logger = new Logger(MonerooProviderService.name);
  private readonly defaultSecretKey?: string;
  private readonly defaultBaseUrl = 'https://api.moneroo.io';

  constructor(
    private readonly configService: ConfigService,
    private readonly providerCredentialsService: ProviderCredentialsService,
    private readonly retryService: RetryService,
  ) {
    this.defaultSecretKey = this.configService.get<string>('MONEROO_SECRET_KEY');
  }

  async createPayment({ dto, paymentId, merchant_id }: CreatePaymentContext): Promise<CreatePaymentResult> {
    this.logger.debug(`Creating Moneroo payment for order ${dto.orderId}`);

    const credentials = await this.resolveCredentials(merchant_id);
    const isSandbox = credentials.environment === 'sandbox' || credentials.secretKey?.includes('test') || credentials.secretKey?.includes('sandbox');
    const isXOF = dto.currency.toUpperCase() === 'XOF';
    
    // Convertir XOF en USD pour Moneroo en sandbox car XOF n'est pas activé
    let currency = dto.currency.toUpperCase();
    let amount = this.formatAmount(dto.amount, dto.currency);
    
    if (isSandbox && isXOF) {
      // Taux de change approximatif : 1 USD ≈ 600 XOF
      // Convertir le montant en cents XOF vers USD (USD est cent-based)
      const amountInUSD = amount / 600;
      // Arrondir à 2 décimales et convertir en cents
      amount = Math.round(amountInUSD * 100) / 100;
      currency = 'USD';
      this.logger.debug(`Converted XOF ${dto.amount} to USD ${amount} for sandbox`);
    }

    // Extract customer name from metadata or use defaults
    const customerName = (dto.metadata?.customerName as string | undefined) ?? 'Client BoohPay';
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] ?? 'Client';
    const lastName = nameParts.slice(1).join(' ') || 'BoohPay';

    // Formater le numéro de téléphone pour Moneroo
    // Moneroo attend une chaîne (string), pas un entier
    let phoneNumber: string | undefined;
    if (dto.customer?.phone) {
      // Supprimer tous les caractères non numériques mais garder comme string
      const cleanedPhone = dto.customer.phone.replace(/\D/g, '');
      if (cleanedPhone) {
        phoneNumber = cleanedPhone;
      }
    }

    const customer = {
      email: dto.customer?.email ?? 'customer@example.com',
      first_name: firstName,
      last_name: lastName,
      ...(phoneNumber !== undefined && { phone: phoneNumber }),
    };

    const metadata: Record<string, string> = {
      boohpay_payment_id: paymentId,
      order_id: dto.orderId,
    };

    // Add custom metadata if provided
    if (dto.metadata) {
      Object.entries(dto.metadata).forEach(([key, value]) => {
        if (typeof value === 'string') {
          metadata[key] = value;
        } else {
          metadata[key] = JSON.stringify(value);
        }
      });
    }

    // Nettoyer l'URL de retour : supprimer les placeholders comme {payment_id}
    // car Moneroo attend une URL valide et ne supporte pas les placeholders
    let returnUrl = dto.returnUrl ?? `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/payments/callback`;
    if (returnUrl.includes('{payment_id}')) {
      // Supprimer le paramètre payment_id avec placeholder
      returnUrl = returnUrl.replace(/\?payment_id=\{payment_id\}/, '').replace(/&payment_id=\{payment_id\}/, '').replace(/\{payment_id\}/, '');
      // Si l'URL se termine par ? ou &, on nettoie
      returnUrl = returnUrl.replace(/[?&]$/, '');
    }

    const requestPayload: MonerooInitializeRequest = {
      amount,
      currency,
      description: dto.metadata?.description as string ?? `Payment for order ${dto.orderId}`,
      customer,
      return_url: returnUrl,
      metadata,
    };

    // Add payment methods restriction if Mobile Money
    // Note: Moneroo ne permet pas d'avoir restrict_country_code et methods en même temps
    // Note: En mode sandbox, certaines méthodes/pays peuvent ne pas être activés
    // Pour éviter les erreurs, on ne met pas de restrictions en mode sandbox ou pour XOF
    
    // En mode sandbox ou avec XOF, on ne met pas de restrictions pour éviter les erreurs
    // Moneroo choisira automatiquement les méthodes disponibles
    if (dto.paymentMethod === 'MOBILE_MONEY' && !isSandbox && !isXOF) {
      // Map country code to Moneroo payment methods
      const methods = this.mapCountryToMethods(dto.countryCode);
      
      // Vérifier si la devise est compatible avec les méthodes spécifiques
      const isCurrencySupported = this.isCurrencySupportedForMethods(dto.currency, methods, dto.countryCode);
      
      if (methods.length > 0 && isCurrencySupported) {
        requestPayload.methods = methods;
        // Ne pas ajouter restrict_country_code si methods est défini
      } else if (dto.countryCode) {
        // Utiliser restrict_country_code seulement si pas de methods spécifiques
        requestPayload.restrict_country_code = dto.countryCode.toUpperCase();
      }
    } else if (dto.paymentMethod !== 'MOBILE_MONEY' && dto.countryCode && !isSandbox) {
      // Pour les autres méthodes de paiement (non-Mobile Money), utiliser restrict_country_code si disponible
      // et seulement si pas en sandbox
      requestPayload.restrict_country_code = dto.countryCode.toUpperCase();
    }
    // Si sandbox ou XOF, on ne met aucune restriction - Moneroo choisira automatiquement

    try {
      const response = await this.retryService.withRetry(
        async () => {
          const fetchResponse = await fetch(`${this.defaultBaseUrl}/v1/payments/initialize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${credentials.secretKey}`,
            },
            body: JSON.stringify(requestPayload),
          });
          
          // Pour le retry, on doit vérifier si la réponse est retriable
          if (!fetchResponse.ok && [429, 500, 502, 503, 504].includes(fetchResponse.status)) {
            const error = new Error(`Moneroo API error: ${fetchResponse.status}`);
            (error as any).status = fetchResponse.status;
            throw error;
          }
          
          return fetchResponse;
        },
        {
          maxRetries: 3,
          retryableStatusCodes: [429, 500, 502, 503, 504],
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `Moneroo payment initialization failed (${response.status})`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = `Moneroo error: ${errorJson.message}`;
          } else if (errorJson.errors) {
            const errors = Array.isArray(errorJson.errors) 
              ? errorJson.errors.map((e: any) => e.message || e).join(', ')
              : JSON.stringify(errorJson.errors);
            errorMessage = `Moneroo errors: ${errors}`;
          }
        } catch {
          if (errorText) {
            errorMessage = `Moneroo error: ${errorText}`;
          }
        }

        this.logger.error(`${errorMessage}. Status: ${response.status}, Response: ${errorText}, Payload: ${JSON.stringify(requestPayload)}`);

        if (response.status === 400 || response.status === 422) {
          throw new BadRequestException(errorMessage);
        }
        if (response.status === 401 || response.status === 403) {
          throw new HttpException('Moneroo authentication failed. Please check your API key.', HttpStatus.UNAUTHORIZED);
        }
        throw new HttpException(errorMessage, response.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const json = (await response.json()) as MonerooInitializeResponse;

      if (!json.data?.id || !json.data?.checkout_url) {
        this.logger.error(`Invalid Moneroo response: ${JSON.stringify(json)}`);
        throw new Error('Invalid Moneroo response: missing payment ID or checkout URL');
      }

      this.logger.log(`Moneroo payment initialized: ${json.data.id} for order ${dto.orderId}`);

      return {
        providerReference: json.data.id,
        status: PaymentStatus.PENDING,
        checkoutPayload: {
          type: 'REDIRECT',
          url: json.data.checkout_url,
        },
        metadata: {
          provider: 'moneroo',
          paymentId: json.data.id,
          checkoutUrl: json.data.checkout_url,
          environment: credentials.environment ?? 'production',
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to initialize Moneroo payment for order ${dto.orderId}`, error as Error);
      throw new Error(`Moneroo payment initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async resolveCredentials(merchant_id: string): Promise<MonerooCredentials> {
    const stored = await this.providerCredentialsService.getCredentials<MonerooCredentials>(
      merchant_id,
      'MONEROO',
    );

    const secretKey = stored?.secretKey ?? this.defaultSecretKey;

    if (!secretKey) {
      this.logger.warn(
        `Moneroo credentials not found for merchant ${merchant_id}. Checked stored credentials and environment variables.`,
      );
      throw new Error(
        'Moneroo credentials are not configured. Please configure credentials either per merchant or set MONEROO_SECRET_KEY environment variable.',
      );
    }

    this.logger.debug(
      `Using Moneroo credentials for merchant ${merchant_id} (${stored ? 'stored' : 'system default'})`,
    );

    return {
      secretKey,
      environment: stored?.environment ?? 'production',
    };
  }

  private formatAmount(amountMinor: number, currency: string): number {
    const amountFormatted = formatAmountFromMinor(amountMinor, currency);
    return isZeroDecimalCurrency(currency)
      ? Number.parseInt(amountFormatted, 10)
      : Number.parseFloat(amountFormatted);
  }

  /**
   * Map country code to Moneroo payment method codes
   * Based on the documentation, returns relevant methods for the country
   */
  private mapCountryToMethods(countryCode: string): string[] {
    const code = countryCode.toUpperCase();
    
    // Map common countries to their Moneroo payment methods
    const countryMethodMap: Record<string, string[]> = {
      'BJ': ['mtn_bj', 'moov_bj'], // Benin
      'CI': ['mtn_ci', 'moov_ci', 'orange_ci', 'wave_ci'], // Côte d'Ivoire
      'CM': ['mtn_cm', 'orange_cm'], // Cameroon
      'GA': ['mtn_cm', 'orange_cm'], // Gabon (uses same as Cameroon)
      'SN': ['orange_sn', 'wave_sn', 'wizall_sn', 'freemoney_sn'], // Senegal
      'TG': ['moov_tg', 'togocel'], // Togo
      'ML': ['orange_ml', 'moov_ml'], // Mali
      'NG': ['mtn_ng', 'qr_ngn', 'ussd_ngn'], // Nigeria
      'GH': ['mtn_gh', 'tigo_gh', 'vodafone_gh'], // Ghana
      'KE': ['mpesa_ke'], // Kenya
      'UG': ['mtn_ug', 'airtel_ug'], // Uganda
      'RW': ['mtn_rw', 'airtel_rw'], // Rwanda
      'TZ': ['halopesa_tz', 'mpesa_tz', 'tigo_tz'], // Tanzania
      'ZM': ['mtn_zm', 'airtel_zm', 'zamtel_zm'], // Zambia
    };

    return countryMethodMap[code] ?? [];
  }

  /**
   * Vérifie si une devise est supportée pour les méthodes spécifiées
   * En mode sandbox, certaines devises peuvent ne pas être activées
   */
  private isCurrencySupportedForMethods(currency: string, methods: string[], countryCode?: string): boolean {
    const normalizedCurrency = currency.toUpperCase();
    
    // En mode sandbox, XOF peut ne pas être supporté par toutes les méthodes
    // On retourne false pour forcer l'utilisation de restrict_country_code
    // et laisser Moneroo choisir automatiquement les méthodes compatibles
    if (normalizedCurrency === 'XOF') {
      // XOF est généralement supporté pour le Sénégal, mais peut ne pas l'être en sandbox
      // Si on spécifie des méthodes, on risque une erreur si XOF n'est pas activé
      // Mieux vaut laisser Moneroo choisir automatiquement
      return false;
    }
    
    // Pour les autres devises (USD, EUR, etc.), on assume qu'elles sont supportées
    return true;
  }

  async createRefund({
    paymentProviderReference,
    amountMinor,
    currency,
    reason,
    merchant_id,
  }: CreateRefundContext): Promise<CreateRefundResult> {
    this.logger.debug(`Creating Moneroo refund for payment ${paymentProviderReference}`);

    const credentials = await this.resolveCredentials(merchant_id);
    const amount = this.formatAmount(amountMinor, currency);

    try {
      const response = await this.retryService.withRetry(
        async () => {
          const fetchResponse = await fetch(`${this.defaultBaseUrl}/v1/refunds`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${credentials.secretKey}`,
            },
            body: JSON.stringify({
              payment_id: paymentProviderReference,
              amount,
              currency: currency.toUpperCase(),
              reason: reason || 'Customer request',
            }),
          });
          
          if (!fetchResponse.ok && [429, 500, 502, 503, 504].includes(fetchResponse.status)) {
            const error = new Error(`Moneroo API error: ${fetchResponse.status}`);
            (error as any).status = fetchResponse.status;
            throw error;
          }
          
          return fetchResponse;
        },
        {
          maxRetries: 3,
          retryableStatusCodes: [429, 500, 502, 503, 504],
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `Moneroo refund failed (${response.status})`;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = `Moneroo error: ${errorJson.message}`;
          }
        } catch {
          if (errorText) {
            errorMessage = `Moneroo error: ${errorText}`;
          }
        }

        if (response.status === 400 || response.status === 422) {
          throw new BadRequestException(errorMessage);
        }
        throw new HttpException(errorMessage, response.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const json = await response.json();

      if (!json.data?.id) {
        throw new Error('Invalid Moneroo refund response: missing refund ID');
      }

      // Moneroo refunds sont généralement synchrones mais peuvent être asynchrones
      const status = json.data.status === 'success' || json.data.status === 'completed'
        ? RefundStatus.SUCCEEDED
        : json.data.status === 'pending'
          ? RefundStatus.PENDING
          : json.data.status === 'failed'
            ? RefundStatus.FAILED
            : RefundStatus.PROCESSING;

      return {
        providerReference: json.data.id,
        status,
        metadata: {
          provider: 'moneroo',
          refundStatus: json.data.status,
        },
      };
    } catch (error: any) {
      this.logger.error('Moneroo refund creation failed', error);
      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Moneroo refund error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
