import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebhookDeliveryStatus, Prisma } from '@prisma/client';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private readonly maxAttempts = 5;
  private readonly baseDelay = 1000; // 1 second

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async queueWebhookDelivery(merchant_id: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const merchant = await this.prisma.merchants.findUnique({
      where: { id: merchant_id },
      select: { id: true, webhook_url: true, webhook_secret: true },
    });

    if (!merchant || !merchant.webhook_url) {
      this.logger.debug(`Merchant ${merchant_id} does not have a webhook URL configured`);
      return;
    }

    await this.prisma.webhook_deliveries.create({
      data: {
        id: randomUUID(),
        merchant_id: merchant_id,
        event_type: eventType,
        payload: payload as Prisma.InputJsonValue,
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
        next_retry_at: new Date(),
      },
    });

    this.logger.log(`Queued webhook delivery for merchant ${merchant_id}, event: ${eventType}`);
  }

  async processPendingWebhooks(limit: number = 50): Promise<void> {
    const now = new Date();
    const pendingWebhooks = await this.prisma.webhook_deliveries.findMany({
      where: {
        status: WebhookDeliveryStatus.PENDING,
        OR: [{ next_retry_at: null }, { next_retry_at: { lte: now } }],
      },
      include: {
        merchants: {
          select: { id: true, webhook_url: true, webhook_secret: true },
        },
      },
      take: limit,
      orderBy: { created_at: 'asc' },
    });

    for (const delivery of pendingWebhooks) {
      if (!delivery.merchants.webhook_url) {
        await this.markAsFailed(delivery.id, 'Merchant webhook URL not configured');
        continue;
      }

      await this.deliverWebhook(delivery);
    }
  }

  private async deliverWebhook(
    delivery: {
      id: string;
      merchant_id: string;
      event_type: string;
      payload: Prisma.JsonValue;
      attempts: number;
      merchants: { webhook_url: string | null; webhook_secret: string | null };
    },
  ): Promise<void> {
    const { id, merchant_id: merchant_id, event_type: eventType, payload, attempts, merchants: merchant } = delivery;

    if (attempts >= this.maxAttempts) {
      await this.markAsFailed(id, `Max attempts (${this.maxAttempts}) reached`);
      return;
    }

    await this.prisma.webhook_deliveries.update({
      where: { id },
      data: {
        status: WebhookDeliveryStatus.PROCESSING,
        attempts: attempts + 1,
        last_attempt_at: new Date(),
      },
    });

    const startTime = Date.now();

    try {
      const body = JSON.stringify({
        event: eventType,
        data: payload,
        timestamp: new Date().toISOString(),
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'BoohPay-Webhooks/1.0',
      };

      // Sign the payload if webhook secret is configured
      if (merchant.webhook_secret) {
        const signature = createHmac('sha256', merchant.webhook_secret).update(body).digest('hex');
        headers['X-BoohPay-Signature'] = `sha256=${signature}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(merchant.webhook_url!, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = (Date.now() - startTime) / 1000;

      if (response.ok) {
        await this.markAsSucceeded(id, response.status);
        this.logger.log(`Webhook delivered successfully to merchant ${merchant_id} (${duration}s)`);
      } else {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        await this.scheduleRetry(id, attempts + 1, response.status, errorMessage);
        this.logger.warn(`Webhook delivery failed for merchant ${merchant_id}: ${errorMessage}`);
      }
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.scheduleRetry(id, attempts + 1, undefined, errorMessage);
      this.logger.error(`Webhook delivery error for merchant ${merchant_id}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }
  }

  private async markAsSucceeded(id: string, httpStatusCode: number): Promise<void> {
    await this.prisma.webhook_deliveries.update({
      where: { id },
      data: {
        status: WebhookDeliveryStatus.SUCCEEDED,
        http_status_code: httpStatusCode,
        delivered_at: new Date(),
        next_retry_at: null,
      },
    });
  }

  private async markAsFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.webhook_deliveries.update({
      where: { id },
      data: {
        status: WebhookDeliveryStatus.FAILED,
        error_message: errorMessage.substring(0, 500),
        next_retry_at: null,
      },
    });
  }

  private async scheduleRetry(id: string, attempts: number, httpStatusCode: number | undefined, errorMessage: string): Promise<void> {
    const delay = this.calculateRetryDelay(attempts);
    const nextRetryAt = new Date(Date.now() + delay);

    await this.prisma.webhook_deliveries.update({
      where: { id },
      data: {
        status: WebhookDeliveryStatus.PENDING,
        http_status_code: httpStatusCode ?? null,
        error_message: errorMessage.substring(0, 500),
        next_retry_at: nextRetryAt,
      },
    });
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(this.baseDelay * Math.pow(2, attempt - 1), 60000); // Max 60 seconds
  }

  async listWebhookDeliveries(
    merchant_id: string,
    filters?: { status?: string; limit?: number },
  ) {
    const where: any = {
      merchant_id: merchant_id,
    };

    if (filters?.status) {
      where.status = filters.status.toUpperCase() as WebhookDeliveryStatus;
    }

    const take = filters?.limit ? Math.min(Math.max(filters.limit, 1), 100) : 50;

    const deliveries = await this.prisma.webhook_deliveries.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take,
    });

    return {
      items: deliveries,
      metadata: {
        limit: take,
        returned: deliveries.length,
      },
    };
  }

  async getMerchantWebhookConfig(merchant_id: string) {
    const merchant = await this.prisma.merchants.findUnique({
      where: { id: merchant_id },
      select: {
        id: true,
        webhook_url: true,
        webhook_secret: true,
      },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    return {
      webhookUrl: merchant.webhook_url ?? undefined,
      hasSecret: !!merchant.webhook_secret,
    };
  }

  async updateMerchantWebhookConfig(
    merchant_id: string,
    webhookUrl?: string,
    webhookSecret?: string,
  ) {
    return this.prisma.merchants.update({
      where: { id: merchant_id },
      data: {
        webhook_url: webhookUrl ?? null,
        webhook_secret: webhookSecret ?? null,
      },
      select: {
        id: true,
        webhook_url: true,
        webhook_secret: true,
      },
    });
  }
}

