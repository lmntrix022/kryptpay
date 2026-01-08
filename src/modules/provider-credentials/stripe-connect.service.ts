import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { ProviderCredentialsService } from './provider-credentials.service';
import { StripeConnectLinkDto } from './dto/stripe-connect-link.dto';

type StripeCredentialPayload = {
  secretKey?: string;
  publishableKey?: string;
  connectAccountId?: string;
  connectAccountCompleted?: boolean;
};

@Injectable()
export class StripeConnectService {
  private readonly stripe: Stripe;
  private readonly defaultRefreshUrl: string;
  private readonly defaultReturnUrl: string;

  constructor(
    private readonly providerCredentialsService: ProviderCredentialsService,
    configService: ConfigService,
  ) {
    const secretKey = configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required for Stripe Connect');
    }

    this.defaultRefreshUrl = configService.get<string>(
      'STRIPE_CONNECT_REFRESH_URL',
      'https://dashboard.stripe.com/',
    );
    this.defaultReturnUrl = configService.get<string>(
      'STRIPE_CONNECT_RETURN_URL',
      'https://dashboard.stripe.com/',
    );

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-08-16',
    });
  }

  async createOnboardingLink(merchant_id: string, dto: StripeConnectLinkDto) {
    try {
      const credentials =
        await this.providerCredentialsService.getCredentials<StripeCredentialPayload>(
          merchant_id,
          'STRIPE',
        );

      const accountId =
        credentials?.connectAccountId ?? (await this.createExpressAccount(merchant_id));

      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: dto.refreshUrl ?? this.defaultRefreshUrl,
        return_url: dto.returnUrl ?? this.defaultReturnUrl,
        type: 'account_onboarding',
      });

      if (!credentials?.connectAccountId) {
        await this.providerCredentialsService.setCredentials(merchant_id, 'STRIPE', 'production', {
          connectAccountId: accountId,
          connectAccountCompleted: false,
        });
      }

      return {
        accountId,
        url: accountLink.url,
        expiresAt: accountLink.expires_at,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (error instanceof Stripe.errors.StripeError) {
        throw new ServiceUnavailableException(
          `Unable to create Stripe Connect onboarding link: ${error.message}`,
        );
      }
      throw new ServiceUnavailableException('Unable to create Stripe Connect onboarding link');
    }
  }

  async getAccountStatus(merchant_id: string) {
    const credentials =
      await this.providerCredentialsService.getCredentials<StripeCredentialPayload>(
          merchant_id,
        'STRIPE',
      );

    if (!credentials?.connectAccountId) {
      return {
        connected: false,
      };
    }

    const account = await this.stripe.accounts.retrieve(credentials.connectAccountId);

    const completed = Boolean(account.details_submitted && account.charges_enabled);

    if (completed && !credentials.connectAccountCompleted) {
      await this.providerCredentialsService.setCredentials(merchant_id, 'STRIPE', 'production', {
        connectAccountCompleted: true,
      });
    }

    return {
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  /**
   * Vérifie s'il y a au moins un merchant connecté à Stripe (pour les admins)
   */
  async getAnyConnectionStatus(): Promise<{
    connected: boolean;
  }> {
    const hasAnyCredentials = await this.providerCredentialsService.hasAnyCredentials('STRIPE');
    return {
      connected: hasAnyCredentials,
    };
  }

  private async createExpressAccount(merchant_id: string): Promise<string> {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          boohpay_merchant_id: merchant_id,
        },
      });

      return account.id;
    } catch (error) {
      throw new ServiceUnavailableException('Unable to create Stripe Connect account');
    }
  }
}

