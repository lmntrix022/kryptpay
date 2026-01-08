import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '@prisma/client';
import { PaymentMethod } from '../payments/dto/create-payment.dto';

@Injectable()
export class SubscriptionBillingService {
  private readonly logger = new Logger(SubscriptionBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Job cron pour facturer les subscriptions automatiquement
   * Exécuté toutes les heures
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processBilling() {
    this.logger.log('Starting subscription billing process...');

    const subscriptions = await this.subscriptionsService.findSubscriptionsToBill(100);

    this.logger.log(`Found ${subscriptions.length} subscriptions to bill`);

    for (const subscription of subscriptions) {
      try {
        await this.billSubscription(subscription.id, subscription.merchant_id);
      } catch (error) {
        this.logger.error(
          `Failed to bill subscription ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue avec les autres subscriptions
      }
    }

    this.logger.log('Subscription billing process completed');
  }

  /**
   * Facturer une subscription spécifique
   */
  async billSubscription(subscriptionId: string, merchant_id: string) {
    const subscription = await this.subscriptionsService.getSubscription(subscriptionId, merchant_id);

    if (subscription.status !== 'ACTIVE') {
      this.logger.debug(`Skipping subscription ${subscriptionId} with status ${subscription.status}`);
      return;
    }

    // Créer un paiement pour cette subscription
    const orderId = `sub_${subscriptionId}_${Date.now()}`;

    try {
      // Préparer les métadonnées avec isTestMode
      const metadata = {
        subscriptionId: subscription.id,
        subscriptionBillingCycle: subscription.billing_cycle,
        isTestMode: subscription.is_test_mode,
      };

      const payment = await this.paymentsService.createPayment(
        {
          orderId,
          amount: subscription.amount_minor, // Note: createPayment attend 'amount', pas 'amountMinor'
          currency: subscription.currency,
          countryCode: 'XX', // Pays par défaut, peut être amélioré
          paymentMethod: PaymentMethod.Card,
          metadata,
        },
        merchant_id,
      );

      // Attendre un peu pour que le paiement soit traité
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Vérifier le statut du paiement
      const updatedPayment = await this.prisma.transactions.findUnique({
        where: { id: payment.paymentId },
      });

      if (updatedPayment?.status === PaymentStatus.SUCCEEDED) {
        // Mettre à jour la subscription
        await this.prisma.subscriptions.update({
          where: { id: subscriptionId },
          data: {
            last_billing_date: new Date(),
            next_billing_date: this.subscriptionsService.calculateNextBillingDate(
              new Date(),
              subscription.billing_cycle,
            ),
          },
        });

        // Lier le paiement à la subscription
        await this.prisma.transactions.update({
          where: { id: payment.paymentId },
          data: { subscription_id: subscriptionId },
        });

        this.logger.log(`Successfully billed subscription ${subscriptionId}`);
      } else {
        // Paiement échoué, créer une tentative de dunning
        this.logger.warn(`Payment failed for subscription ${subscriptionId}`);
        // Le service de dunning s'occupera des relances
      }
    } catch (error) {
      this.logger.error(
        `Failed to create payment for subscription ${subscriptionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}

