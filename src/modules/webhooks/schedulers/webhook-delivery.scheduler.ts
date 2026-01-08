import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhookDeliveryService } from '../services/webhook-delivery.service';

@Injectable()
export class WebhookDeliveryScheduler {
  private readonly logger = new Logger(WebhookDeliveryScheduler.name);

  constructor(private readonly webhookDeliveryService: WebhookDeliveryService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processPendingWebhooks() {
    try {
      await this.webhookDeliveryService.processPendingWebhooks(50);
    } catch (error) {
      this.logger.error('Error processing pending webhooks:', error);
    }
  }
}


