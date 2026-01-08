import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface SimulateWebhookDto {
  merchant_id: string;
  endpoint: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface WebhookSimulationResult {
  id: string;
  endpoint: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  response?: {
    status: number;
    statusText: string;
    body?: unknown;
  };
  simulatedAt: Date;
}

@Injectable()
export class SandboxWebhooksService {
  private readonly logger = new Logger(SandboxWebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Simuler l'envoi d'un webhook
   */
  async simulateWebhook(dto: SimulateWebhookDto): Promise<WebhookSimulationResult> {
    this.logger.log(`Simulating webhook to ${dto.endpoint} for merchant ${dto.merchant_id}`);

    // Générer une signature HMAC pour simuler la signature réelle
    const merchant = await this.prisma.merchants.findUnique({
      where: { id: dto.merchant_id },
      select: { webhook_secret: true },
    });

    const webhookSecret = merchant?.webhook_secret || 'sandbox-test-secret';
    const signature = this.generateWebhookSignature(JSON.stringify(dto.payload), webhookSecret);

    // Préparer les headers
    const headers = {
      ...dto.headers,
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': dto.eventType,
      'X-BoohPay-Sandbox': 'true',
    };

    let response: WebhookSimulationResult['response'] | undefined;

    try {
      // Simuler l'envoi HTTP (sans vraiment envoyer)
      const simulatedResponse = await this.sendWebhookSimulation(
        dto.endpoint,
        dto.payload,
        headers,
      );

      response = simulatedResponse;
    } catch (error) {
      this.logger.error(`Webhook simulation failed: ${error instanceof Error ? error.message : String(error)}`);
      response = {
        status: 500,
        statusText: 'Simulation Error',
        body: { error: error instanceof Error ? error.message : String(error) },
      };
    }

    // Enregistrer dans les logs sandbox
    const log = await this.prisma.sandbox_webhook_logs.create({
      data: {
        id: randomUUID(),
        merchant_id: dto.merchant_id,
        endpoint: dto.endpoint,
        payload: dto.payload as any,
        headers: headers as any,
        response: response as any,
      },
    });

    return {
      id: log.id,
      endpoint: dto.endpoint,
      payload: dto.payload,
      headers,
      response,
      simulatedAt: log.simulated_at,
    };
  }

  /**
   * Envoyer le webhook (simulation - en mode sandbox, on peut choisir de ne pas vraiment envoyer)
   */
  private async sendWebhookSimulation(
    endpoint: string,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<WebhookSimulationResult['response']> {
    // En mode sandbox, on simule juste la réponse
    // En production, on pourrait vraiment envoyer le webhook si nécessaire
    
    // Vérifier si l'endpoint est valide (optionnel)
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      throw new Error('Invalid webhook endpoint URL');
    }

    // Simuler différents scénarios
    const random = Math.random();
    if (random < 0.8) {
      // 80% de succès
      return {
        status: 200,
        statusText: 'OK',
        body: { received: true, timestamp: new Date().toISOString() },
      };
    } else if (random < 0.95) {
      // 15% d'erreur temporaire
      return {
        status: 503,
        statusText: 'Service Unavailable',
        body: { error: 'Temporary server error (simulated)' },
      };
    } else {
      // 5% d'erreur permanente
      return {
        status: 400,
        statusText: 'Bad Request',
        body: { error: 'Invalid payload (simulated)' },
      };
    }
  }

  /**
   * Générer une signature HMAC pour le webhook
   */
  private generateWebhookSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Obtenir l'historique des webhooks simulés
   */
  async getSimulationHistory(merchant_id: string, limit = 50) {
    return this.prisma.sandbox_webhook_logs.findMany({
      where: { merchant_id: merchant_id },
      orderBy: { simulated_at: 'desc' },
      take: limit,
    });
  }

  /**
   * Créer des exemples de payloads pour différents événements
   */
  getExamplePayloads(): Record<string, Record<string, unknown>> {
    return {
      payment_succeeded: {
        id: 'pay_test_123',
        type: 'payment.succeeded',
        data: {
          payment_id: 'pay_test_123',
          order_id: 'order_123',
          amount: 10000,
          currency: 'XAF',
          status: 'SUCCEEDED',
          gateway: 'MONEROO',
        },
        created_at: new Date().toISOString(),
      },
      payment_failed: {
        id: 'pay_test_456',
        type: 'payment.failed',
        data: {
          payment_id: 'pay_test_456',
          order_id: 'order_456',
          amount: 5000,
          currency: 'XAF',
          status: 'FAILED',
          failure_code: 'INSUFFICIENT_FUNDS',
          gateway: 'STRIPE',
        },
        created_at: new Date().toISOString(),
      },
      payout_succeeded: {
        id: 'payout_test_123',
        type: 'payout.succeeded',
        data: {
          payout_id: 'payout_test_123',
          amount: 25000,
          currency: 'XAF',
          status: 'SUCCEEDED',
          provider: 'SHAP',
        },
        created_at: new Date().toISOString(),
      },
      refund_created: {
        id: 'refund_test_123',
        type: 'refund.created',
        data: {
          refund_id: 'refund_test_123',
          payment_id: 'pay_test_123',
          amount: 5000,
          currency: 'XAF',
          status: 'PENDING',
        },
        created_at: new Date().toISOString(),
      },
    };
  }
}


