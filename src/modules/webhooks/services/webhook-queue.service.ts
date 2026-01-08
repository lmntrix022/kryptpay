import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface WebhookDeliveryJobData {
  merchant_id: string;
  eventType: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class WebhookQueueService {
  private readonly logger = new Logger(WebhookQueueService.name);

  constructor(@InjectQueue('webhook-delivery') private readonly webhookQueue: Queue<WebhookDeliveryJobData>) {}

  async queueWebhook(merchant_id: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.webhookQueue.add(
        'deliver',
        {
          merchant_id: merchant_id,
          eventType,
          payload,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
      this.logger.debug(`Queued webhook for merchant ${merchant_id}, event: ${eventType}`);
    } catch (error) {
      this.logger.error(`Failed to queue webhook for merchant ${merchant_id}:`, error);
      throw error;
    }
  }

  async getQueueStats(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.webhookQueue.getWaitingCount(),
      this.webhookQueue.getActiveCount(),
      this.webhookQueue.getCompletedCount(),
      this.webhookQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}


