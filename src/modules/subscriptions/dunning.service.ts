import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionBillingService } from './subscription-billing.service';
import { NotificationService } from '../notifications/services/notification.service';

const MAX_DUNNING_ATTEMPTS = 5;
const DUNNING_BACKOFF_DAYS = [1, 3, 7, 14, 30]; // Jours d'attente entre chaque tentative

@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);
  private readonly maxAttempts = MAX_DUNNING_ATTEMPTS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: SubscriptionBillingService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Job cron pour traiter les tentatives de dunning
   * Exécuté toutes les 6 heures
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async processDunning() {
    this.logger.log('Starting dunning process...');

    // Trouver les subscriptions avec des paiements échoués et des tentatives en attente
    const subscriptions = await this.findSubscriptionsNeedingDunning();

    this.logger.log(`Found ${subscriptions.length} subscriptions needing dunning`);

    for (const subscription of subscriptions) {
      try {
        await this.processSubscriptionDunning(subscription.id);
      } catch (error) {
        this.logger.error(
          `Failed to process dunning for subscription ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log('Dunning process completed');
  }

  /**
   * Traiter le dunning pour une subscription spécifique
   */
  async processSubscriptionDunning(subscriptionId: string) {
    const subscription = await this.prisma.subscriptions.findUnique({
      where: { id: subscriptionId },
      include: {
        transactions: {
          where: { status: 'FAILED' },
          orderBy: { createdAt: 'desc' as const },
          take: 1,
        },
        dunning_attempts: {
          orderBy: { attempt_number: 'desc' },
          take: 1,
        },
      },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      return;
    }

    const lastFailedPayment = (subscription as any).transactions?.[0];
    if (!lastFailedPayment) {
      return;
    }

    const lastAttempt = (subscription as any).dunning_attempts?.[0];
    const nextAttemptNumber = lastAttempt ? lastAttempt.attempt_number + 1 : 1;

    // Vérifier si on doit créer une nouvelle tentative
    if (lastAttempt) {
      if (lastAttempt.nextRetryAt && new Date() < lastAttempt.nextRetryAt) {
        // Pas encore le moment de réessayer
        return;
      }

      if (lastAttempt.status === 'succeeded') {
        // Dernière tentative réussie, pas besoin de continuer
        return;
      }
    }

    // Vérifier si on a atteint le maximum de tentatives
    if (nextAttemptNumber > this.maxAttempts) {
      this.logger.warn(
        `Max dunning attempts reached for subscription ${subscriptionId}, cancelling...`,
      );
      await this.prisma.subscriptions.update({
        where: { id: subscriptionId },
        data: { status: 'CANCELLED', cancelled_at: new Date() },
      });

      // Notifier le marchand
      await this.notificationService.notifySystem({
        merchantId: subscription.merchant_id,
        type: 'ALERT',
        message: `Subscription ${subscriptionId} was cancelled after ${this.maxAttempts} failed payment attempts`,
      });

      return;
    }

    // Créer une nouvelle tentative de dunning
    const backoffDays = DUNNING_BACKOFF_DAYS[nextAttemptNumber - 1] || 30;
    const nextRetryAt = new Date();
    nextRetryAt.setDate(nextRetryAt.getDate() + backoffDays);

    await this.prisma.dunning_attempts.create({
      data: {
        id: randomUUID(),
        subscription_id: subscriptionId,
        payment_id: lastFailedPayment.id,
        attempt_number: nextAttemptNumber,
        status: 'pending',
        next_retry_at: nextRetryAt,
      },
    });

    // Notifier le client
    await this.notificationService.notifyCustomer({
      customerEmail: subscription.customer_email,
      subject: `Payment Failed - Attempt ${nextAttemptNumber}`,
      message: `Your subscription payment failed. We will retry in ${backoffDays} day(s).`,
    });

    // Si c'est le moment de réessayer (backoff écoulé), tenter un nouveau paiement
    if (nextAttemptNumber === 1 || !lastAttempt?.next_retry_at || new Date() >= lastAttempt.next_retry_at) {
      try {
        await this.billingService.billSubscription(subscriptionId, subscription.merchant_id);

        // Mettre à jour la tentative
        await this.prisma.dunning_attempts.updateMany({
          where: { subscription_id: subscriptionId, attempt_number: nextAttemptNumber },
          data: { status: 'succeeded', next_retry_at: null },
        });
      } catch (error) {
        // La tentative échouera et sera retentée plus tard
        this.logger.warn(`Dunning retry failed for subscription ${subscriptionId}`);
      }
    }
  }

  /**
   * Trouver les subscriptions nécessitant du dunning
   */
  private async findSubscriptionsNeedingDunning() {
    // Trouver les subscriptions actives avec des paiements échoués récents
    const subscriptions = await this.prisma.subscriptions.findMany({
      where: {
        status: 'ACTIVE',
        transactions: {
          some: {
            status: 'FAILED',
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 derniers jours
            },
          },
        },
      },
      include: {
        dunning_attempts: {
          orderBy: { attempt_number: 'desc' },
          take: 1,
        },
      },
    });

    // Filtrer celles qui ont besoin d'une nouvelle tentative
    return subscriptions.filter((sub) => {
      const lastAttempt = (sub as any).dunning_attempts?.[0];
      if (!lastAttempt) {
        return true; // Pas encore de tentative, besoin de dunning
      }

      if (lastAttempt.status === 'succeeded') {
        return false; // Dernière tentative réussie
      }

      if (lastAttempt.next_retry_at && new Date() >= lastAttempt.next_retry_at) {
        return true; // Le backoff est écoulé
      }

      return false;
    });
  }
}


