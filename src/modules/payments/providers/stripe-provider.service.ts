import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, RefundStatus } from '@prisma/client';
import Stripe from 'stripe';

import { ProviderCredentialsService } from '../../provider-credentials/provider-credentials.service';
import { RetryService } from '../../../common/services/retry.service';
import { CurrencyConverterService } from '../../../common/services/currency-converter.service';

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

@Injectable()
export class StripeProviderService implements PaymentProvider, RefundProvider {
  private readonly logger = new Logger(StripeProviderService.name);
  private readonly secretKey: string;
  private readonly publishableKey: string;
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly providerCredentialsService: ProviderCredentialsService,
    private readonly retryService: RetryService,
    private readonly currencyConverter: CurrencyConverterService,
  ) {
    this.secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    this.publishableKey = this.configService.get<string>('STRIPE_PUBLISHABLE_KEY', '');

    if (!this.secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not configured, provider will be disabled');
    }

    this.stripe = new Stripe(this.secretKey || 'sk_test_mock', {
      apiVersion: '2023-08-16',
    });
  }

  async createPayment({
    dto,
    paymentId,
    merchant_id,
  }: CreatePaymentContext): Promise<CreatePaymentResult> {
    const merchantCredentials = await this.providerCredentialsService.getCredentials<{
      secretKey?: string;
      publishableKey?: string;
      connectAccountId?: string;
    }>(merchant_id, 'STRIPE');

    const effectiveSecret = merchantCredentials?.secretKey ?? this.secretKey;
    
    // IMPORTANT: Pour le checkout, toujours utiliser la clé publique du compte principal BoohPay
    // car c'est le compte qui crée les PaymentIntents (même pour Stripe Connect)
    // Les credentials du marchand ne stockent que le connectAccountId, pas les clés
    const effectivePublishable = this.publishableKey;

    if (!effectiveSecret || !effectivePublishable) {
      throw new ServiceUnavailableException('Stripe provider not configured');
    }

    this.logger.debug(`Creating Stripe payment intent for order ${dto.orderId}`);

    // Vérifier si on peut utiliser le compte Connect
    // OPTIMISATION: Ne pas vérifier le statut en temps réel pour éviter la latence
    // On utilisera le compte Connect si disponible, et Stripe retournera une erreur claire si nécessaire
    const useConnectAccount = Boolean(
      !merchantCredentials?.secretKey && merchantCredentials?.connectAccountId,
    );

    const stripeClient = merchantCredentials?.secretKey
      ? new Stripe(effectiveSecret, {
          apiVersion: '2023-08-16',
        })
      : this.stripe;

    // Stripe ne supporte pas XOF/XAF directement, conversion automatique en EUR
    const originalCurrency = dto.currency.toUpperCase();
    const isCfaCurrency = ['XOF', 'XAF', 'CFA', 'FCFA'].includes(originalCurrency);
    
    let finalAmount = dto.amount;
    let finalCurrency = dto.currency.toLowerCase();
    let conversionRate = 1;
    let originalAmount = dto.amount;
    let originalAmountCurrency = originalCurrency;

    if (isCfaCurrency) {
      // OPTIMISATION: Conversion XOF/XAF → EUR avec taux fixe (instantané, pas d'appel API)
      // Taux fixe: 1 EUR = 655.957 XOF/XAF
      const FIXED_CFA_RATE = 655.957;
      // Le montant est en FCFA (unités mineures), on le convertit directement en centimes EUR
      // FCFA / 655.957 = EUR, puis * 100 pour avoir les centimes
      finalAmount = Math.round((dto.amount / FIXED_CFA_RATE) * 100);
      finalCurrency = 'eur';
      conversionRate = 100 / FIXED_CFA_RATE;
      
      this.logger.debug(
        `Converted ${dto.amount} ${originalCurrency} → ${finalAmount} EUR cents (rate: ${conversionRate.toFixed(6)})`,
      );
    }

    try {
      const stripeStart = Date.now();
      this.logger.log(`[PERF] Creating Stripe PaymentIntent for ${dto.orderId}`);
      const intent = await this.retryService.withRetry(
        () =>
          stripeClient.paymentIntents.create(
            {
              amount: Math.trunc(finalAmount),
              currency: finalCurrency,
              description: `Order ${dto.orderId}`,
              metadata: {
                boohpay_payment_id: paymentId,
                order_id: dto.orderId,
                original_currency: originalAmountCurrency,
                original_amount: originalAmount.toString(),
                conversion_rate: conversionRate.toString(),
                ...Object.entries(dto.metadata ?? {}).reduce<Record<string, string>>(
                  (acc, [key, value]) => {
                    if (typeof value === 'string') {
                      acc[key] = value;
                    } else {
                      acc[key] = JSON.stringify(value);
                    }
                    return acc;
                  },
                  {},
                ),
              },
              automatic_payment_methods: { enabled: true },
              receipt_email: dto.customer?.email,
            },
            useConnectAccount
              ? {
                  stripeAccount: merchantCredentials?.connectAccountId,
                }
              : undefined,
          ),
        {
          maxRetries: 3,
          retryableStatusCodes: [429, 500, 502, 503, 504],
        },
      );
      this.logger.log(`[PERF] Stripe PaymentIntent created in ${Date.now() - stripeStart}ms`);

      const checkoutPayload: Record<string, unknown> = {
        type: 'CLIENT_SECRET',
        clientSecret: intent.client_secret,
        publishableKey: effectivePublishable,
        stripeAccount: useConnectAccount ? merchantCredentials?.connectAccountId : undefined,
      };

      const status = mapPaymentIntentStatus(intent.status);

      return {
        providerReference: intent.id,
        status,
        checkoutPayload,
        metadata: {
          provider: 'stripe',
          paymentIntentStatus: intent.status,
          merchantSpecific: Boolean(merchantCredentials?.secretKey),
          connectAccountId: merchantCredentials?.connectAccountId,
        },
      };
    } catch (error) {
      this.logger.error('Stripe payment intent creation failed', error as Error);
      throw new ServiceUnavailableException('Stripe provider error');
    }
  }

  async createRefund({
    paymentProviderReference,
    amountMinor,
    currency,
    reason,
    merchant_id,
  }: CreateRefundContext): Promise<CreateRefundResult> {
    const merchantCredentials = await this.providerCredentialsService.getCredentials<{
      secretKey?: string;
      connectAccountId?: string;
    }>(merchant_id, 'STRIPE');

    const effectiveSecret = merchantCredentials?.secretKey ?? this.secretKey;

    if (!effectiveSecret) {
      throw new ServiceUnavailableException('Stripe provider not configured');
    }

    const stripeClient = merchantCredentials?.secretKey
      ? new Stripe(effectiveSecret, {
          apiVersion: '2023-08-16',
        })
      : this.stripe;

    const useConnectAccount = Boolean(
      !merchantCredentials?.secretKey && merchantCredentials?.connectAccountId,
    );

    try {
      // Stripe nécessite d'abord de récupérer le PaymentIntent pour obtenir le charge_id
      const paymentIntent = await stripeClient.paymentIntents.retrieve(
        paymentProviderReference,
        {},
        useConnectAccount
          ? {
              stripeAccount: merchantCredentials?.connectAccountId,
            }
          : undefined,
      );

      // Créer le refund sur la charge
      const chargeId = typeof paymentIntent.latest_charge === 'string' 
        ? paymentIntent.latest_charge 
        : paymentIntent.latest_charge?.id;

      if (!chargeId) {
        throw new ServiceUnavailableException('No charge found for this payment intent');
      }

      const refund = await stripeClient.refunds.create(
        {
          charge: chargeId,
          amount: amountMinor,
          reason: reason ? (reason as Stripe.RefundCreateParams.Reason) : undefined,
        },
        useConnectAccount
          ? {
              stripeAccount: merchantCredentials?.connectAccountId,
            }
          : undefined,
      );

      const status =
        refund.status === 'succeeded'
          ? RefundStatus.SUCCEEDED
          : refund.status === 'pending'
            ? RefundStatus.PENDING
            : refund.status === 'failed'
              ? RefundStatus.FAILED
              : RefundStatus.PROCESSING;

      return {
        providerReference: refund.id,
        status,
        metadata: {
          provider: 'stripe',
          refundStatus: refund.status,
          chargeId,
        },
      };
    } catch (error) {
      this.logger.error('Stripe refund creation failed', error as Error);
      throw new ServiceUnavailableException('Stripe refund error');
    }
  }
}

function mapPaymentIntentStatus(status?: Stripe.PaymentIntent.Status): PaymentStatus {
  switch (status) {
    case 'succeeded':
      return PaymentStatus.SUCCEEDED;
    case 'processing':
    case 'requires_capture':
      return PaymentStatus.AUTHORIZED;
    case 'requires_payment_method':
    case 'requires_action':
    case 'canceled':
    case 'requires_confirmation':
    default:
      return PaymentStatus.PENDING;
  }
}
