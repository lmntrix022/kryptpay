import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueStalled } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Job } from 'bull';
import { PayoutStatus, PayoutProvider } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PayoutJobData, PayoutJobResult } from './payout-queue.service';
import { ShapPayoutProviderService } from '../providers/shap-payout-provider.service';
import { MonerooPayoutProviderService } from '../providers/moneroo-payout-provider.service';
import { StripePayoutProviderService } from '../providers/stripe-payout-provider.service';
import { NotificationService } from '../../notifications/services/notification.service';

@Injectable()
@Processor('payouts')
export class PayoutProcessor {
  private readonly logger = new Logger(PayoutProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shapProvider: ShapPayoutProviderService,
    private readonly monerooProvider: MonerooPayoutProviderService,
    private readonly stripeProvider: StripePayoutProviderService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process('process-payout')
  async handlePayoutJob(job: Job<PayoutJobData>): Promise<PayoutJobResult> {
    const { payoutId, merchant_id, provider } = job.data;
    
    this.logger.log(`Processing payout ${payoutId} via ${provider} (attempt ${job.attemptsMade + 1})`);
    
    try {
      // Mettre à jour le progress
      await job.progress(10);

      // Récupérer le payout de la base
      // Ne pas inclure merchants car webhook_secret n'existe pas encore dans Render
      const payout = await this.prisma.payouts.findUnique({
        where: { id: payoutId },
        select: {
          id: true,
          merchant_id: true,
          provider: true,
          status: true,
          payment_system: true,
          payout_type: true,
          amount_minor: true,
          currency: true,
          msisdn: true,
          external_reference: true,
          provider_reference: true,
          metadata: true,
          created_at: true,
          updated_at: true,
          is_test_mode: true,
        },
      });

      if (!payout) {
        throw new Error(`Payout ${payoutId} not found`);
      }

      if (payout.status === PayoutStatus.SUCCEEDED) {
        return {
          success: true,
          payoutId,
          status: 'already_completed',
          processedAt: new Date(),
        };
      }

      await job.progress(20);

      // Mettre à jour le statut en PROCESSING
      await this.prisma.payouts.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.PROCESSING,
          payout_events: {
            create: {
              id: randomUUID(),
              type: 'PAYOUT_PROCESSING',
              payload: { attemptNumber: job.attemptsMade + 1 },
            },
          },
        },
      });

      await job.progress(40);

      // Exécuter le payout via le provider approprié
      const providerService = this.getProviderService(provider);
      const dto = {
        amount: job.data.amount,
        currency: job.data.currency,
        payeeMsisdn: job.data.payeeMsisdn,
        paymentSystemName: job.data.paymentSystemName,
        externalReference: job.data.externalReference,
        metadata: job.data.metadata,
      };

      const result = await providerService.createPayout({
        merchant_id,
        payout,
        dto: dto as any,
      });

      await job.progress(80);

      // Mettre à jour le payout avec le résultat
      const updatedPayout = await this.prisma.payouts.update({
        where: { id: payoutId },
        data: {
          status: result.status ?? PayoutStatus.PROCESSING,
          provider_reference: result.providerReference,
          metadata: {
            ...(payout.metadata as object || {}),
            providerResponse: result.metadata,
            processedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          payout_events: {
            create: {
              id: randomUUID(),
              type: 'PAYOUT_PROVIDER_RESPONSE',
              payload: (result.rawResponse ?? result.metadata ?? {}) as Prisma.InputJsonValue,
            },
          },
        },
      });

      await job.progress(100);

      this.logger.log(`Payout ${payoutId} processed successfully via ${provider}`);

      return {
        success: true,
        payoutId,
        providerReference: result.providerReference,
        status: updatedPayout.status,
        processedAt: new Date(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Payout ${payoutId} failed: ${errorMessage}`);

      // Mettre à jour le payout en cas d'échec sur la dernière tentative
      if (job.attemptsMade >= (job.opts.attempts ?? 5) - 1) {
        await this.prisma.payouts.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.FAILED,
            metadata: {
              ...(job.data.metadata as object || {}),
              error: errorMessage,
              failedAt: new Date().toISOString(),
              totalAttempts: job.attemptsMade + 1,
            } as Prisma.InputJsonValue,
            payout_events: {
              create: {
                id: randomUUID(),
                type: 'PAYOUT_FAILED',
                payload: { error: errorMessage, attempt: job.attemptsMade + 1 } as Prisma.InputJsonValue,
              },
            },
          },
        });
      }

      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job<PayoutJobData>) {
    this.logger.debug(`Processing job ${job.id} for payout ${job.data.payoutId}`);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<PayoutJobData>, result: PayoutJobResult) {
    this.logger.log(`Job ${job.id} completed for payout ${result.payoutId}: ${result.status}`);
    
    // Envoyer une notification de succès
    try {
      await this.notificationService.notifyPayoutStatus({
        merchantId: job.data.merchant_id,
        payoutId: result.payoutId,
        status: 'SUCCEEDED',
        amountMinor: job.data.amount,
        currency: job.data.currency,
        paymentSystem: job.data.paymentSystemName || 'unknown',
        payoutType: 'mobile_money',
      });
    } catch (error) {
      this.logger.warn(`Failed to send success notification for payout ${result.payoutId}`);
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job<PayoutJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed for payout ${job.data.payoutId}: ${error.message}`);
    
    // Si c'est la dernière tentative, envoyer une notification d'échec
    if (job.attemptsMade >= (job.opts.attempts ?? 5)) {
      try {
        await this.notificationService.notifyPayoutStatus({
          merchantId: job.data.merchant_id,
          payoutId: job.data.payoutId,
          status: 'FAILED',
          amountMinor: job.data.amount,
          currency: job.data.currency,
          paymentSystem: job.data.paymentSystemName || 'unknown',
          payoutType: 'mobile_money',
          failureCode: error.message,
        });
      } catch (notifError) {
        this.logger.warn(`Failed to send failure notification for payout ${job.data.payoutId}`);
      }
    }
  }

  @OnQueueStalled()
  onStalled(job: Job<PayoutJobData>) {
    this.logger.warn(`Job ${job.id} stalled for payout ${job.data.payoutId}`);
  }

  private getProviderService(provider: PayoutProvider) {
    switch (provider) {
      case PayoutProvider.SHAP:
        return this.shapProvider;
      case PayoutProvider.MONEROO:
        return this.monerooProvider;
      case PayoutProvider.STRIPE:
        return this.stripeProvider;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

