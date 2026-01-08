import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayoutStatus } from '@prisma/client';
import Stripe from 'stripe';

import { ProviderCredentialsService } from '../../provider-credentials/provider-credentials.service';
import {
  formatAmountFromMinor,
  isZeroDecimalCurrency,
} from '../../../shared/currency/currency.utils';
import { RetryService } from '../../../common/services/retry.service';

import {
  CreatePayoutContext,
  CreatePayoutResult,
  PayoutProvider,
} from './payout-provider.interface';

type StripeCredentials = {
  secretKey: string;
};

@Injectable()
export class StripePayoutProviderService implements PayoutProvider {
  private readonly logger = new Logger(StripePayoutProviderService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly providerCredentialsService: ProviderCredentialsService,
    private readonly retryService: RetryService,
  ) {}

  async createPayout(context: CreatePayoutContext): Promise<CreatePayoutResult> {
    const { payout, merchant_id, dto } = context;
    const credentials = await this.resolveCredentials(merchant_id);
    const stripe = new Stripe(credentials.secretKey, { apiVersion: '2023-08-16' });

    const amount = this.formatAmount(payout.amount_minor, payout.currency);

    try {
      // Pour Stripe, les payouts sont généralement des Transferts vers des comptes connectés
      // ou des Payouts vers des comptes bancaires externes
      // Ici, on va utiliser Transfer API pour transférer vers un compte Stripe Connect
      
      // Note: Stripe nécessite un compte connecté (Connect account) pour les transferts
      // Pour un payout direct vers une carte bancaire ou un compte, on utiliserait l'API Payouts
      
      // Vérifier si c'est un compte connecté (account_id dans metadata)
      const connectedAccountId = dto.metadata?.stripeAccountId as string | undefined;
      
      if (connectedAccountId) {
        // Transfer vers un compte connecté
        const transfer = await this.retryService.withRetry(
          () => stripe.transfers.create(
            {
              amount: amount,
              currency: payout.currency.toLowerCase(),
              destination: connectedAccountId,
              metadata: {
                boohpay_payout_id: payout.id,
                external_reference: payout.external_reference ?? payout.id,
                payout_type: payout.payout_type,
              },
            },
            { idempotencyKey: `boohpay_transfer_${payout.id}` },
          ),
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            retryableErrors: ['StripeConnectionError', 'StripeAPIError'],
          },
        );

        return {
          providerReference: transfer.id,
          status: PayoutStatus.PROCESSING,
          metadata: {
            transfer_id: transfer.id,
            destination: typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id,
            amount: transfer.amount,
            currency: transfer.currency,
          },
          rawResponse: transfer,
        };
      } else {
        // Pour un payout vers un compte bancaire externe, utiliser l'API Payouts
        // Stripe Payouts nécessite un compte bancaire pré-configuré (Bank Account)
        // Pour cet exemple, on va créer un Payout vers un compte externe
        
        // Note: En production, il faudrait vérifier que le compte Stripe a un compte bancaire configuré
        // et utiliser l'API des comptes bancaires externes
        
        throw new BadRequestException(
          'Stripe payouts require either a connected account ID (stripeAccountId) in metadata or a pre-configured external bank account. Please specify stripeAccountId for transfers to connected accounts.',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Stripe.errors.StripeError) {
        this.logger.error(`Stripe payout error: ${error.message}`, error);
        throw new ServiceUnavailableException(
          `Stripe payout failed: ${error.message}`,
        );
      }

      this.logger.error(
        `Unexpected error during Stripe payout: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Stripe payout failed');
    }
  }

  private formatAmount(amountMinor: number, currency: string): number {
    if (isZeroDecimalCurrency(currency)) {
      return amountMinor;
    }
    const amountStr = formatAmountFromMinor(amountMinor, currency);
    return Number.parseFloat(amountStr);
  }

  private async resolveCredentials(merchant_id: string): Promise<StripeCredentials> {
    // Essayer d'abord de récupérer les credentials stockés pour ce merchant
    const stored = await this.providerCredentialsService.getCredentials<StripeCredentials>(merchant_id, 'STRIPE');
    if (stored?.secretKey) {
      this.logger.debug(`Using stored Stripe credentials for merchant ${merchant_id}`);
      return stored;
    }

    // Sinon, utiliser les credentials par défaut de l'environnement
    const defaultSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (defaultSecretKey) {
      this.logger.debug(`Using system default Stripe credentials`);
      return { secretKey: defaultSecretKey };
    }

    throw new ServiceUnavailableException(
      'Stripe credentials are not configured. Please configure credentials either per merchant or set STRIPE_SECRET_KEY environment variable.',
    );
  }
}

