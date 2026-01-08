import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: Registry;

  // HTTP Metrics
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestErrors: Counter<string>;

  // Payment Metrics
  public readonly paymentsTotal: Counter<string>;
  public readonly paymentsByGateway: Counter<string>;
  public readonly paymentsByStatus: Counter<string>;
  public readonly paymentAmount: Histogram<string>;

  // Payout Metrics
  public readonly payoutsTotal: Counter<string>;
  public readonly payoutsByStatus: Counter<string>;

  // Webhook Metrics
  public readonly webhooksReceived: Counter<string>;
  public readonly webhookDeliveries: Counter<string>;
  public readonly webhookDeliveryErrors: Counter<string>;
  public readonly webhookDeliveryDuration: Histogram<string>;

  // System Metrics
  public readonly activeConnections: Gauge<string>;
  public readonly queueSize: Gauge<string>;

  constructor() {
    this.register = new Registry();
    this.register.setDefaultLabels({ app: 'boohpay' });

    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });

    // Payment Metrics
    this.paymentsTotal = new Counter({
      name: 'payments_total',
      help: 'Total number of payments',
      labelNames: ['gateway', 'status'],
      registers: [this.register],
    });

    this.paymentsByGateway = new Counter({
      name: 'payments_by_gateway_total',
      help: 'Total number of payments by gateway',
      labelNames: ['gateway'],
      registers: [this.register],
    });

    this.paymentsByStatus = new Counter({
      name: 'payments_by_status_total',
      help: 'Total number of payments by status',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.paymentAmount = new Histogram({
      name: 'payment_amount',
      help: 'Payment amounts',
      labelNames: ['gateway', 'currency'],
      registers: [this.register],
      buckets: [1000, 5000, 10000, 50000, 100000, 500000, 1000000],
    });

    // Payout Metrics
    this.payoutsTotal = new Counter({
      name: 'payouts_total',
      help: 'Total number of payouts',
      labelNames: ['provider', 'status'],
      registers: [this.register],
    });

    this.payoutsByStatus = new Counter({
      name: 'payouts_by_status_total',
      help: 'Total number of payouts by status',
      labelNames: ['status'],
      registers: [this.register],
    });

    // Webhook Metrics
    this.webhooksReceived = new Counter({
      name: 'webhooks_received_total',
      help: 'Total number of webhooks received from providers',
      labelNames: ['provider', 'type'],
      registers: [this.register],
    });

    this.webhookDeliveries = new Counter({
      name: 'webhook_deliveries_total',
      help: 'Total number of webhook deliveries to merchants',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.webhookDeliveryErrors = new Counter({
      name: 'webhook_delivery_errors_total',
      help: 'Total number of webhook delivery errors',
      labelNames: ['merchant_id', 'error_type'],
      registers: [this.register],
    });

    this.webhookDeliveryDuration = new Histogram({
      name: 'webhook_delivery_duration_seconds',
      help: 'Duration of webhook deliveries in seconds',
      labelNames: ['merchant_id'],
      registers: [this.register],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    // System Metrics
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    this.queueSize = new Gauge({
      name: 'queue_size',
      help: 'Number of jobs in queue',
      labelNames: ['queue_name'],
      registers: [this.register],
    });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    this.httpRequestDuration.observe({ method, route, status: status.toString() }, duration);
    this.httpRequestsTotal.inc({ method, route, status: status.toString() });
    if (status >= 400) {
      this.httpRequestErrors.inc({ method, route, status: status.toString() });
    }
  }

  recordPayment(gateway: string, status: string, amount: number, currency: string): void {
    this.paymentsTotal.inc({ gateway, status });
    this.paymentsByGateway.inc({ gateway });
    this.paymentsByStatus.inc({ status });
    this.paymentAmount.observe({ gateway, currency }, amount);
  }

  recordPayout(provider: string, status: string): void {
    this.payoutsTotal.inc({ provider, status });
    this.payoutsByStatus.inc({ status });
  }

  recordWebhookReceived(provider: string, type: string): void {
    this.webhooksReceived.inc({ provider, type });
  }

  recordWebhookDelivery(status: string, merchant_id: string, duration?: number, errorType?: string): void {
    this.webhookDeliveries.inc({ status });
    if (duration !== undefined) {
      this.webhookDeliveryDuration.observe({ merchant_id }, duration);
    }
    if (errorType) {
      this.webhookDeliveryErrors.inc({ merchant_id, error_type: errorType });
    }
  }

  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  setQueueSize(queueName: string, size: number): void {
    this.queueSize.set({ queue_name: queueName }, size);
  }
}

