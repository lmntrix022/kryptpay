import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';

export interface WebhookDeliveryJob {
  merchant_id: string;
  eventType: string;
  payload: Record<string, unknown>;
}

@Processor('webhook-delivery')
export class WebhookDeliveryProcessor {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(private readonly webhookDeliveryService: WebhookDeliveryService) {}

  @Process('deliver')
  async handleDelivery(job: Job<WebhookDeliveryJob>) {
    this.logger.debug(`Processing webhook delivery job ${job.id} for merchant ${job.data.merchant_id}`);
    
    try {
      await this.webhookDeliveryService.queueWebhookDelivery(
        job.data.merchant_id,
        job.data.eventType,
        job.data.payload,
      );
    } catch (error) {
      this.logger.error(`Failed to queue webhook delivery job ${job.id}:`, error);
      throw error;
    }
  }
}


