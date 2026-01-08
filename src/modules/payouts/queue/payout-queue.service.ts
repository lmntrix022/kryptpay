import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { PayoutProvider } from '@prisma/client';

export interface PayoutJobData {
  merchant_id: string;
  payoutId: string;
  amount: number;
  currency: string;
  payeeMsisdn: string;
  paymentSystemName: string;
  provider: PayoutProvider;
  externalReference?: string;
  metadata?: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
  scheduledFor?: Date;
}

export interface PayoutJobResult {
  success: boolean;
  payoutId: string;
  providerReference?: string;
  status: string;
  error?: string;
  processedAt: Date;
}

export interface PayoutQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

@Injectable()
export class PayoutQueueService {
  private readonly logger = new Logger(PayoutQueueService.name);

  constructor(
    @InjectQueue('payouts') private readonly payoutQueue: Queue<PayoutJobData>,
  ) {}

  /**
   * Ajouter un payout à la queue pour traitement asynchrone
   */
  async queuePayout(data: PayoutJobData): Promise<Job<PayoutJobData>> {
    const priority = this.getPriorityValue(data.priority);
    const delay = data.scheduledFor 
      ? Math.max(0, new Date(data.scheduledFor).getTime() - Date.now())
      : 0;

    try {
      const job = await this.payoutQueue.add('process-payout', data, {
        priority,
        delay,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s, 40s, 80s
        },
        removeOnComplete: {
          age: 86400, // Garder 24h
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // Garder 7 jours pour debug
        },
        jobId: `payout-${data.payoutId}`,
      });

      this.logger.log(`Payout queued: ${data.payoutId} (Job ID: ${job.id}, Priority: ${data.priority || 'normal'})`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to queue payout ${data.payoutId}:`, error);
      throw error;
    }
  }

  /**
   * Ajouter plusieurs payouts en batch
   */
  async queueBatchPayouts(payouts: PayoutJobData[]): Promise<Job<PayoutJobData>[]> {
    const jobs: Job<PayoutJobData>[] = [];

    for (const payout of payouts) {
      try {
        const job = await this.queuePayout(payout);
        jobs.push(job);
      } catch (error) {
        this.logger.error(`Failed to queue batch payout ${payout.payoutId}:`, error);
      }
    }

    this.logger.log(`Batch queued: ${jobs.length}/${payouts.length} payouts`);
    return jobs;
  }

  /**
   * Récupérer le statut d'un job de payout
   */
  async getJobStatus(payoutId: string): Promise<{
    status: string;
    progress: number;
    attemptsMade: number;
    failedReason?: string;
    processedOn?: Date;
    finishedOn?: Date;
  } | null> {
    const job = await this.payoutQueue.getJob(`payout-${payoutId}`);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();
    
    return {
      status: state,
      progress: job.progress() as number,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }

  /**
   * Annuler un payout en attente
   */
  async cancelPayout(payoutId: string): Promise<boolean> {
    const job = await this.payoutQueue.getJob(`payout-${payoutId}`);
    
    if (!job) {
      return false;
    }

    const state = await job.getState();
    
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      this.logger.log(`Payout cancelled: ${payoutId}`);
      return true;
    }

    this.logger.warn(`Cannot cancel payout ${payoutId} in state: ${state}`);
    return false;
  }

  /**
   * Réessayer un payout échoué
   */
  async retryPayout(payoutId: string): Promise<boolean> {
    const job = await this.payoutQueue.getJob(`payout-${payoutId}`);
    
    if (!job) {
      return false;
    }

    const state = await job.getState();
    
    if (state === 'failed') {
      await job.retry();
      this.logger.log(`Payout retry queued: ${payoutId}`);
      return true;
    }

    return false;
  }

  /**
   * Obtenir les statistiques de la queue
   */
  async getQueueStats(): Promise<PayoutQueueStats> {
    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      this.payoutQueue.getWaitingCount(),
      this.payoutQueue.getActiveCount(),
      this.payoutQueue.getCompletedCount(),
      this.payoutQueue.getFailedCount(),
      this.payoutQueue.getDelayedCount(),
      this.payoutQueue.isPaused(),
    ]);

    return { waiting, active, completed, failed, delayed, paused: isPaused };
  }

  /**
   * Obtenir les jobs en attente
   */
  async getPendingJobs(limit = 50): Promise<Job<PayoutJobData>[]> {
    return this.payoutQueue.getJobs(['waiting', 'delayed'], 0, limit);
  }

  /**
   * Obtenir les jobs échoués
   */
  async getFailedJobs(limit = 50): Promise<Job<PayoutJobData>[]> {
    return this.payoutQueue.getJobs(['failed'], 0, limit);
  }

  /**
   * Pause la queue (maintenance)
   */
  async pauseQueue(): Promise<void> {
    await this.payoutQueue.pause();
    this.logger.warn('Payout queue PAUSED');
  }

  /**
   * Reprendre la queue
   */
  async resumeQueue(): Promise<void> {
    await this.payoutQueue.resume();
    this.logger.log('Payout queue RESUMED');
  }

  /**
   * Nettoyer les jobs terminés
   */
  async cleanCompletedJobs(olderThanMs = 86400000): Promise<number> {
    const jobs = await this.payoutQueue.clean(olderThanMs, 'completed');
    return Array.isArray(jobs) ? jobs.length : 0;
  }

  private getPriorityValue(priority?: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'low':
        return 10;
      default:
        return 5;
    }
  }
}

