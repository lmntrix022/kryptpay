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
    let useConnectAccount = Boolean(
      !merchantCredentials?.secretKey && merchantCredentials?.connectAccountId,
    );

    // Si on utilise un compte Connect, vérifier qu'il peut effectuer des charges
    if (useConnectAccount && merchantCredentials?.connectAccountId) {
      try {
        const account = await this.stripe.accounts.retrieve(merchantCredentials.connectAccountId);
        if (!account.charges_enabled) {
          this.logger.warn(
            `Stripe Connect account ${merchantCredentials.connectAccountId} cannot make charges. ` +
            `charges_enabled: ${account.charges_enabled}, details_submitted: ${account.details_submitted}. ` +
            `Falling back to platform account.`
          );
          // Ne pas utiliser le compte Connect si charges_enabled est false
          useConnectAccount = false;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to verify Stripe Connect account status: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Falling back to platform account.`
        );
        // En cas d'erreur, ne pas utiliser le compte Connect
        useConnectAccount = false;
      }
    }

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
      // Convertir XOF/XAF en EUR
      // Le montant reçu est déjà en unités mineures (FCFA)
      // On doit le convertir en centimes EUR
      try {
        const conversionResult = await this.currencyConverter.fcfaToCents(dto.amount);
        finalAmount = conversionResult;
        finalCurrency = 'eur';
        conversionRate = conversionResult / dto.amount;
        
        this.logger.log(
          `Converted ${dto.amount} ${originalCurrency} → ${finalAmount} EUR cents (rate: ${conversionRate.toFixed(6)})`,
        );
      } catch (error) {
        this.logger.error(
          `Currency conversion failed for ${dto.amount} ${originalCurrency} to EUR`,
          error as Error,
        );
        throw new ServiceUnavailableException('Currency conversion failed for Stripe payment');
      }
    }

    try {
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
