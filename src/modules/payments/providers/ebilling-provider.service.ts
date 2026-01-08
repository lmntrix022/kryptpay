import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';

import { ProviderCredentialsService } from '../../provider-credentials/provider-credentials.service';
import { formatAmountFromMinor } from '../../../shared/currency/currency.utils';

import {
  CreatePaymentContext,
  CreatePaymentResult,
  PaymentProvider,
} from './payment-provider.interface';

type EbillingCredentials = {
  username?: string;
  sharedKey?: string;
  baseUrl?: string;
};

type EbillingResponse = {
  bill_id?: string;
  id?: string;
  data?: {
    bill_id?: string;
  };
  e_bill?: {
    bill_id?: string;
  };
  message?: string;
};

@Injectable()
export class EbillingProviderService implements PaymentProvider {
  private readonly logger = new Logger(EbillingProviderService.name);
  private readonly defaultUsername?: string;
  private readonly defaultSharedKey?: string;
  private readonly defaultBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly providerCredentialsService: ProviderCredentialsService,
  ) {
    this.defaultUsername = this.configService.get<string>('EBILLING_USERNAME');
    this.defaultSharedKey = this.configService.get<string>('EBILLING_SHARED_KEY');
    this.defaultBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>(
        'EBILLING_BASE_URL',
        'https://stg.billing-easy.com/api/v1/merchant',
      ),
    );
  }

  async createPayment({ dto, merchant_id }: CreatePaymentContext): Promise<CreatePaymentResult> {
    const phone = dto.customer?.phone ?? (dto.metadata?.phone as string | undefined);

    if (!phone) {
      this.logger.error(`Missing phone number for Mobile Money payment (order: ${dto.orderId})`);
      throw new Error(
        'Customer phone number is required for Mobile Money payments. Please provide a phone number in the customer field.'
      );
    }

    this.logger.debug(`Processing Mobile Money payment with phone: ${phone} for country: ${dto.countryCode}`);

    const { username, sharedKey, baseUrl } = await this.resolveCredentials(merchant_id);
    
    let normalizedMsisdn: string;
    let localMsisdn: string;
    let paymentSystem: 'airtelmoney' | 'moovmoney4';
    
    try {
      normalizedMsisdn = this.normalizeMsisdn(phone, dto.countryCode);
      this.logger.debug(`Normalized MSISDN: ${normalizedMsisdn} (from: ${phone})`);
      
      localMsisdn = this.toLocalMsisdn(normalizedMsisdn);
      this.logger.debug(`Local MSISDN: ${localMsisdn}`);
      
      paymentSystem = this.detectPaymentSystem(normalizedMsisdn);
      this.logger.debug(`Detected payment system: ${paymentSystem} for MSISDN: ${normalizedMsisdn}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`MSISDN processing failed for phone ${phone} in country ${dto.countryCode}: ${errorMessage}`);
      throw new Error(
        `Invalid phone number format: ${errorMessage}. For Gabon (GA), please use format 07XXXXXX or 06XXXXXX (8 digits starting with 06 or 07).`
      );
    }

    const amountMajor = formatAmountFromMinor(dto.amount, dto.currency);
    const shortDescription =
      (dto.metadata?.description as string | undefined) ?? `Commande ${dto.orderId}`;
    const payerName = (dto.metadata?.customerName as string | undefined) ?? 'Client BoohPay';

    this.logger.log(`Creating eBilling invoice for order ${dto.orderId} (system=${paymentSystem})`);

    const invoicePayload = {
      amount: amountMajor,
      payer_name: payerName,
      payer_email: dto.customer?.email ?? 'no-reply@boohpay.com',
      payer_msisdn: localMsisdn,
      short_description: shortDescription,
      external_reference: dto.orderId,
      expiry_period: (dto.metadata?.expiryPeriod as string | undefined) ?? '60',
    } satisfies Record<string, unknown>;

    const billResponse = await this.request<EbillingResponse>(
      `${baseUrl}/e_bills`,
      username,
      sharedKey,
      {
        method: 'POST',
        body: JSON.stringify(invoicePayload),
      },
    );

    const billId = this.extractBillId(billResponse);
    if (!billId) {
      this.logger.error(
        `Unable to retrieve eBilling bill id for order ${dto.orderId}`,
        billResponse,
      );
      throw new Error('Failed to create eBilling invoice');
    }

    await this.request<unknown>(`${baseUrl}/e_bills/${billId}/ussd_push`, username, sharedKey, {
      method: 'POST',
      body: JSON.stringify({
        payer_msisdn: localMsisdn,
        payment_system_name: paymentSystem,
      }),
    });

    const instructions =
      'Un push USSD vient d’être envoyé. Ouvre ton application Mobile Money pour valider le paiement.';

    return {
      providerReference: billId,
      status: PaymentStatus.PENDING,
      checkoutPayload: {
        type: 'INFO',
        billId,
        paymentSystem,
        instructions,
      },
      metadata: {
        provider: 'ebilling',
        paymentSystem,
        msisdn: normalizedMsisdn,
      },
    };
  }

  private async resolveCredentials(merchant_id: string): Promise<{
    username: string;
    sharedKey: string;
    baseUrl: string;
  }> {
    const credentials = await this.providerCredentialsService.getCredentials<EbillingCredentials>(
      merchant_id,
      'EBILLING',
    );

    const username = credentials?.username ?? this.defaultUsername;
    const sharedKey = credentials?.sharedKey ?? this.defaultSharedKey;
    const baseUrl = this.normalizeBaseUrl(credentials?.baseUrl ?? this.defaultBaseUrl);

    if (!username || !sharedKey) {
      this.logger.error(`eBilling credentials missing for merchant ${merchant_id}`);
      throw new Error(
        'eBilling credentials are not configured. Please configure eBilling credentials in the Dashboard > Integrations page.'
      );
    }

    return { username, sharedKey, baseUrl };
  }

  private detectPaymentSystem(msisdn: string): 'airtelmoney' | 'moovmoney4' {
    // Le MSISDN normalisé peut être au format:
    // - 241074398524 (12 chiffres avec 0) -> commence par 24107 ou 24106
    // - 24174398524 (11 chiffres sans 0) -> commence par 2417 ou 2416
    // - 24107439985 (11 chiffres avec 0 mais 8 chiffres après) -> commence par 24107 ou 24106
    
    if (msisdn.startsWith('24107') || msisdn.startsWith('2417')) {
      return 'airtelmoney';
    }
    if (msisdn.startsWith('24106') || msisdn.startsWith('2416')) {
      return 'moovmoney4';
    }

    // Si le MSISDN commence par 241 et a 11 ou 12 chiffres, essayer de détecter depuis le 4ème chiffre
    if (msisdn.startsWith('241') && msisdn.length >= 11) {
      const after241 = msisdn.slice(3); // Enlever "241"
      // Si après 241 on a un 0, regarder le chiffre suivant
      if (after241.startsWith('0')) {
        const firstDigit = after241[1]; // Le chiffre après le 0
        if (firstDigit === '7') {
          return 'airtelmoney';
        }
        if (firstDigit === '6') {
          return 'moovmoney4';
        }
      } else {
        // Pas de 0, le premier chiffre après 241 indique l'opérateur
        const firstDigit = after241[0];
        if (firstDigit === '7') {
          return 'airtelmoney';
        }
        if (firstDigit === '6') {
          return 'moovmoney4';
        }
      }
    }

    this.logger.error(`Cannot detect payment system for MSISDN: ${msisdn}`);
    throw new Error('Unsupported MSISDN prefix for eBilling (expected 06 ou 07 pour le Gabon)');
  }

  private normalizeMsisdn(msisdn: string, countryCode?: string): string {
    // Extraire tous les chiffres
    const digits = msisdn.replace(/\D/g, '');
    const upperCountry = countryCode?.toUpperCase();

    this.logger.debug(`Normalizing MSISDN: "${msisdn}" -> digits: "${digits}", country: ${upperCountry}, length: ${digits.length}`);

    // PRIORITÉ 1: Traitement pour les formats commençant par 241
    if (digits.startsWith('241')) {
      const subscriber = digits.slice(3); // Enlever "241"
      
      // Cas 1: Format 241 + 8 chiffres (24174399852) = 11 chiffres total - DÉJÀ BON FORMAT
      if (digits.length === 11 && subscriber.length === 8) {
        // Vérifier que le subscriber commence par 6 ou 7 (correspondant à 06 ou 07)
        if (subscriber.startsWith('6') || subscriber.startsWith('7')) {
          this.logger.debug(`MSISDN already in correct format: ${digits}`);
          return digits;
        }
      }
      
      // Cas 2: Format 241 + 9 chiffres avec 0 (241074398524) = 12 chiffres total
      // Le numéro local est 074398524 (9 chiffres), on doit enlever le 0 pour avoir 8 chiffres
      if (digits.length === 12) {
        // Vérifier que subscriber a 9 chiffres et commence par 0
        if (subscriber.length === 9 && subscriber.startsWith('0')) {
          // Vérifier que le numéro local commence par 06 ou 07 (avant d'enlever le 0)
          if (subscriber.startsWith('06') || subscriber.startsWith('07')) {
            const withoutZero = subscriber.slice(1); // Enlever le 0: 74398524 ou 62436087
            // Le numéro sans 0 doit avoir 8 chiffres et commencer par 6 ou 7
            if (withoutZero.length === 8 && (withoutZero.startsWith('6') || withoutZero.startsWith('7'))) {
              this.logger.debug(`Normalized 12-digit format: ${digits} (subscriber: ${subscriber}) -> 241${withoutZero}`);
              return `241${withoutZero}`; // 24174398524 ou 24162436087 (11 chiffres)
            }
          }
        }
        // Fallback pour 12 chiffres: si ça commence par 2410, extraire les 8 derniers chiffres
        if (digits.startsWith('2410')) {
          const last8 = digits.slice(4); // Enlever "2410" -> 74398524
          if (last8.length === 8 && (last8.startsWith('6') || last8.startsWith('7'))) {
            this.logger.debug(`Normalized 12-digit format (fallback): ${digits} -> 241${last8}`);
            return `241${last8}`; // 24174398524 (11 chiffres)
          }
        }
      }
    }

    // Format local avec 0 initial (07XXXXXXX ou 06XXXXXXX - 9 chiffres avec 0)
    // Pour le Gabon, le format local est 074398524 (9 chiffres)
    // EBILLING attend: 241 + 8 chiffres (sans le 0 initial) = 24174398524 (11 chiffres)
    if (digits.length === 9 && digits.startsWith('0')) {
      // Format 074398524 (9 chiffres) -> vérifier qu'il commence par 06 ou 07
      if (digits.startsWith('06') || digits.startsWith('07')) {
        const withoutZero = digits.slice(1); // Enlever le 0 -> 74398524 (pour 074398524) ou 62436087 (pour 062436087)
        // Le numéro sans 0 doit avoir 8 chiffres
        // Pour 074398524 -> 74398524 (commence par 7, pas 07, mais c'est valide car le 0 initial a été enlevé)
        // Pour 062436087 -> 62436087 (commence par 6, pas 06, mais c'est valide car le 0 initial a été enlevé)
        if (withoutZero.length === 8) {
          // Vérifier que le premier chiffre est 6 ou 7 (correspondant à 06 ou 07)
          if (withoutZero.startsWith('6') || withoutZero.startsWith('7')) {
            this.logger.debug(`Normalized 9-digit local format: ${digits} -> 241${withoutZero}`);
            return `241${withoutZero}`; // 24174398524 ou 24162436087 (11 chiffres)
          }
        }
      }
    }
    
    // Format local 10 chiffres (0743998524) -> enlever le 0 pour avoir 8 chiffres
    if (digits.length === 10 && digits.startsWith('0')) {
      const withoutZero = digits.slice(1); // Enlever le 0 initial -> 743998524
      if (withoutZero.length === 9 && (withoutZero.startsWith('06') || withoutZero.startsWith('07'))) {
        // Le numéro sans 0 a 9 chiffres et commence par 06 ou 07
        // Mais EBILLING attend 8 chiffres, donc on doit enlever un chiffre
        // C'est probablement un format incorrect, mais on peut essayer de prendre les 8 premiers après 06/07
        const subscriber = withoutZero.slice(0, 8); // Prendre 8 chiffres: 74399852
        if (subscriber.startsWith('06') || subscriber.startsWith('07')) {
          this.logger.debug(`Normalized 10-digit local format: ${digits} -> 241${subscriber}`);
          return `241${subscriber}`; // 24174399852 (11 chiffres)
        }
      }
    }

    // Format local 8 chiffres directement (07XXXXXX ou 06XXXXXX)
    if (digits.length === 8 && ['06', '07'].some((prefix) => digits.startsWith(prefix))) {
      return `241${digits}`;
    }

    // Si le country code est GA et qu'on a 8 chiffres commençant par 06 ou 07
    if (upperCountry === 'GA' && digits.length === 8 && ['06', '07'].some((prefix) => digits.startsWith(prefix))) {
      return `241${digits}`;
    }

    // Essayer de nettoyer les formats avec des caractères supplémentaires
    // Ex: +241 07 43 99 85 24 ou +241-07-43-99-85-24
    let cleaned = digits.replace(/^241/, '');
    
    // Si cleaned commence par 0 et a 9 chiffres, enlever le 0
    if (cleaned.startsWith('0') && cleaned.length === 9 && (cleaned.startsWith('06') || cleaned.startsWith('07'))) {
      cleaned = cleaned.slice(1); // Enlever le 0
    }
    
    if (cleaned.length === 8 && (cleaned.startsWith('6') || cleaned.startsWith('7'))) {
      this.logger.debug(`Normalized via fallback: ${msisdn} -> 241${cleaned}`);
      return `241${cleaned}`;
    }

    // Dernier essai : si on a 12 chiffres commençant par 2410, essayer d'extraire directement
    if (digits.length === 12 && digits.startsWith('2410')) {
      const last8 = digits.slice(4); // Enlever "2410" -> les 8 derniers chiffres
      if (last8.length === 8 && (last8.startsWith('6') || last8.startsWith('7'))) {
        this.logger.debug(`Normalized via last fallback: ${msisdn} -> 241${last8}`);
        return `241${last8}`;
      }
    }

    // Si on arrive ici, le format n'est pas supporté
    this.logger.error(`Failed to normalize MSISDN: "${msisdn}" -> digits: "${digits}", length: ${digits.length}, cleaned: "${cleaned}"`);
    throw new Error(
      `Invalid MSISDN format for Gabon. Expected format: 07XXXXXX or 06XXXXXX (8 digits starting with 06 or 07). ` +
      `Got: "${msisdn}" (extracted digits: "${digits}", length: ${digits.length}). ` +
      `Supported formats: +2410743998524, 2410743998524, 0743998524, 743998524`
    );
  }

  private toLocalMsisdn(normalized: string): string {
    if (normalized.startsWith('241')) {
      const subscriber = normalized.slice(3); // Enlever "241"
      // Si le subscriber commence déjà par 0 (ex: 074398524), le retourner tel quel
      // Sinon, ajouter 0 (ex: 743998524 -> 0743998524)
      if (subscriber.startsWith('0')) {
        return subscriber; // 074398524 (9 chiffres) ou 0743998524 (10 chiffres)
      }
      // Si le subscriber a 8 chiffres (ex: 74399852), ajouter 0
      if (subscriber.length === 8) {
        return `0${subscriber}`; // 074399852 (9 chiffres)
      }
      // Sinon, ajouter 0
      return `0${subscriber}`;
    }
    return normalized;
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/$/, '');
  }

  private async request<T>(
    url: string,
    username: string,
    sharedKey: string,
    init: RequestInit,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set(
      'Authorization',
      `Basic ${Buffer.from(`${username}:${sharedKey}`).toString('base64')}`,
    );
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`eBilling request failed (${response.status}): ${text}`);
      throw new Error(`eBilling API call failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json().catch(() => ({}))) as T;
  }

  private extractBillId(payload: EbillingResponse): string | undefined {
    return payload.bill_id ?? payload.id ?? payload.data?.bill_id ?? payload.e_bill?.bill_id;
  }
}
