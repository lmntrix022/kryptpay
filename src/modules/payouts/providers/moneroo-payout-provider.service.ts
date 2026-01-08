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

type MonerooCredentials = {
  secretKey: string;
  publicKey?: string;
};

type MonerooPayoutRequest = {
  amount: number;
  currency: string;
  description: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  method: string;
  recipient: {
    msisdn: string;
  };
  metadata?: Record<string, string>;
};

type MonerooPayoutResponse = {
  message?: string;
  data?: {
    id: string;
  };
  errors?: unknown;
};

@Injectable()
export class MonerooPayoutProviderService implements PayoutProvider {
  private readonly logger = new Logger(MonerooPayoutProviderService.name);
  private readonly defaultBaseUrl = 'https://api.moneroo.io';

  constructor(
    private readonly configService: ConfigService,
    private readonly providerCredentialsService: ProviderCredentialsService,
  ) {}

  async createPayout(context: CreatePayoutContext): Promise<CreatePayoutResult> {
    const { payout, merchant_id, dto } = context;
    const credentials = await this.resolveCredentials(merchant_id);

    const amount = this.formatAmount(payout.amount_minor, payout.currency);
    const normalizedMsisdn = this.normalizeMsisdn(dto.payeeMsisdn);
    
    // Extraire le nom du client depuis les métadonnées ou utiliser des valeurs par défaut
    const customerName = (dto.metadata?.customerName as string | undefined) ?? 'Client BoohPay';
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] ?? 'Client';
    const lastName = nameParts.slice(1).join(' ') || 'BoohPay';
    const customerEmail = (dto.metadata?.customerEmail as string | undefined) ?? 'payout@boohpay.com';

    const metadata: Record<string, string> = {
      boohpay_payout_id: payout.id,
      external_reference: payout.external_reference ?? payout.id,
    };

    // Ajouter les métadonnées personnalisées si fournies
    if (dto.metadata) {
      Object.entries(dto.metadata).forEach(([key, value]) => {
        if (typeof value === 'string') {
          metadata[key] = value;
        } else {
          metadata[key] = JSON.stringify(value);
        }
      });
    }

    const payload: MonerooPayoutRequest = {
      amount,
      currency: payout.currency.toUpperCase(),
      description: dto.metadata?.description as string ?? `Payout ${payout.payout_type.toLowerCase()} - ${payout.id}`,
      customer: {
        email: customerEmail,
        first_name: firstName,
        last_name: lastName,
        phone: normalizedMsisdn,
      },
      method: this.mapPaymentSystemToMonerooMethod(dto.paymentSystemName),
      recipient: {
        msisdn: normalizedMsisdn,
      },
      metadata,
    };

    try {
      const response = await fetch(`${this.defaultBaseUrl}/v1/payouts/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${credentials.secretKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `Moneroo payout failed (${response.status})`;

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

        this.logger.error(`${errorMessage}. Status: ${response.status}, Response: ${errorText}, Payload: ${JSON.stringify(payload)}`);

        if (response.status === 400 || response.status === 422) {
          throw new BadRequestException(errorMessage);
        }
        if (response.status === 401 || response.status === 403) {
          throw new HttpException('Moneroo authentication failed. Please check your API key.', HttpStatus.UNAUTHORIZED);
        }
        throw new HttpException(errorMessage, response.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const json = (await response.json()) as MonerooPayoutResponse;

      if (!json.data?.id) {
        this.logger.error(`Invalid Moneroo payout response: ${JSON.stringify(json)}`);
        throw new Error('Invalid Moneroo payout response: missing payout ID');
      }

      this.logger.log(`Moneroo payout initialized: ${json.data.id} for payout ${payout.id}`);

      return {
        providerReference: json.data.id,
        status: PayoutStatus.PENDING,
        metadata: {
          paymentSystem: dto.paymentSystemName,
          amount: amount,
          currency: payout.currency,
          monerooPayoutId: json.data.id,
          monerooResponse: json,
        },
        rawResponse: json,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to initialize Moneroo payout ${payout.id}`, error as Error);
      throw new Error(`Moneroo payout initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async resolveCredentials(merchant_id: string): Promise<MonerooCredentials> {
    const stored = await this.providerCredentialsService.getCredentials<MonerooCredentials>(
      merchant_id,
      'MONEROO',
    );

    const defaultSecretKey = this.configService.get<string>('MONEROO_SECRET_KEY');
    const secretKey = stored?.secretKey ?? defaultSecretKey;

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
      publicKey: stored?.publicKey,
    };
  }

  private formatAmount(amountMinor: number, currency: string): number {
    const amountFormatted = formatAmountFromMinor(amountMinor, currency);
    return isZeroDecimalCurrency(currency)
      ? Number.parseInt(amountFormatted, 10)
      : Number.parseFloat(amountFormatted);
  }

  /**
   * Normalise le MSISDN au format international attendu par Moneroo
   * Format attendu : indicatif pays + numéro (ex: 229XXXXXXXXX pour le Bénin)
   */
  private normalizeMsisdn(msisdn: string): string {
    // Enlever tous les caractères non numériques
    const digits = msisdn.replace(/\D/g, '');

    // Si déjà au format international (commence par l'indicatif pays)
    // Les indicatifs sont généralement de 1 à 3 chiffres
    // Format attendu par Moneroo : indicatif + numéro (sans le 0 initial)
    
    // Si le numéro commence par 0, c'est un format local, on doit l'adapter
    if (digits.startsWith('0')) {
      // Retourner sans le 0 initial pour traitement ultérieur
      // Le mapping de la méthode de paiement déterminera l'indicatif pays
      return digits.substring(1);
    }

    // Si le numéro a 8-9 chiffres sans indicatif, c'est un format local
    if (digits.length >= 8 && digits.length <= 9) {
      // Retourner tel quel, l'indicatif sera ajouté par le mapping de méthode
      return digits;
    }

    // Sinon, retourner tel quel (supposé être au format international)
    return digits;
  }

  /**
   * Map payment system name to Moneroo method code
   * Ex: "mtn_bj" -> "mtn_bj", "airtelmoney" -> "mtn_cm" (selon le pays)
   */
  private mapPaymentSystemToMonerooMethod(paymentSystemName: string): string {
    const system = paymentSystemName.toLowerCase();

    // Mapping direct des noms de systèmes vers les codes Moneroo
    const systemMethodMap: Record<string, string> = {
      // MTN
      'mtn_bj': 'mtn_bj',
      'mtn_ci': 'mtn_ci',
      'mtn_cm': 'mtn_cm',
      'mtn_gh': 'mtn_gh',
      'mtn_ng': 'mtn_ng',
      'mtn_rw': 'mtn_rw',
      'mtn_ug': 'mtn_ug',
      'mtn_zm': 'mtn_zm',
      // Moov
      'moov_bj': 'moov_bj',
      'moov_ci': 'moov_ci',
      'moov_tg': 'moov_tg',
      'moov_ml': 'moov_ml',
      // Orange
      'orange_ci': 'orange_ci',
      'orange_cm': 'orange_cm',
      'orange_ml': 'orange_ml',
      'orange_sn': 'orange_sn',
      // Airtel
      'airtel_ng': 'airtel_ng',
      'airtel_rw': 'airtel_rw',
      'airtel_tz': 'airtel_tz',
      'airtel_ug': 'airtel_ug',
      'airtel_zm': 'airtel_zm',
      // Autres
      'mpesa_ke': 'mpesa_ke',
      'wave_ci': 'wave_ci',
      'wave_sn': 'wave_sn',
    };

    // Si mapping direct trouvé
    if (systemMethodMap[system]) {
      return systemMethodMap[system];
    }

    // Fallback: essayer de deviner depuis le nom
    if (system.includes('mtn')) {
      // Par défaut MTN Bénin si pas spécifié
      return 'mtn_bj';
    }
    if (system.includes('moov')) {
      return 'moov_bj';
    }
    if (system.includes('orange')) {
      return 'orange_ci';
    }
    if (system.includes('airtel')) {
      return 'airtel_ng';
    }

    // Si aucun mapping trouvé, utiliser tel quel (Moneroo pourrait le gérer)
    this.logger.warn(`Unknown payment system: ${paymentSystemName}, using as-is`);
    return system;
  }
}


