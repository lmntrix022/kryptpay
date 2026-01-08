import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentStatus } from '@prisma/client';

import { PaymentsService } from '../payments/payments.service';
import { PayoutsService, ShapPayoutCallbackPayload, MonerooPayoutCallbackPayload } from '../payouts/payouts.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret?: string;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly payoutsService: PayoutsService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    this.stripe = new Stripe(apiKey ?? '', {
      apiVersion: '2023-08-16',
    });
  }

  @Post('stripe')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Webhook Stripe', description: 'Reçoit et traite les webhooks Stripe pour mettre à jour les statuts des paiements' })
  @ApiHeader({ name: 'stripe-signature', required: true, description: 'Signature Stripe pour vérification' })
  @ApiResponse({ status: 202, description: 'Webhook accepté et traité' })
  @ApiResponse({ status: 400, description: 'Requête invalide ou signature invalide' })
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!this.webhookSecret) {
      const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
      const message = 'Stripe webhook secret is not configured';
      if (isDevelopment) {
        // En développement, on log un warning mais on refuse quand même le webhook
        this.logger.warn(
          `Missing STRIPE_WEBHOOK_SECRET configuration. ${message}. ` +
          'Set STRIPE_WEBHOOK_SECRET in your .env file to enable webhook verification. ' +
          'For testing, you can use the Sandbox feature in the dashboard.'
        );
      } else {
        this.logger.error(`Missing STRIPE_WEBHOOK_SECRET configuration. ${message}`);
      }
      throw new BadRequestException(message);
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    const rawBody: Buffer =
      req.rawBody ??
      (req.body instanceof Buffer
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})));

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      this.logger.error('Stripe webhook signature verification failed', error as Error);
      throw new BadRequestException('Invalid Stripe signature');
    }

    if (!event.type.startsWith('payment_intent.')) {
      this.logger.debug(`Ignoring Stripe event ${event.type}`);
      return { received: true };
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const status = mapStripeStatus(paymentIntent.status, event.type);
    const paymentId = (paymentIntent.metadata?.boohpay_payment_id as string) ?? undefined;
    const orderId = (paymentIntent.metadata?.order_id as string) ?? undefined;

    await this.paymentsService.applyWebhookEvent({
      provider: 'STRIPE',
      type: event.type,
      providerEventId: event.id,
      paymentId,
      orderId,
      providerReference: paymentIntent.id,
      status,
      rawPayload: event,
    });

    return { received: true };
  }

  @Post('moneroo')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Webhook Moneroo', description: 'Reçoit et traite les webhooks Moneroo pour mettre à jour les statuts des paiements' })
  @ApiHeader({ name: 'x-moneroo-signature', required: false, description: 'Signature Moneroo pour vérification' })
  @ApiResponse({ status: 202, description: 'Webhook accepté et traité' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Signature invalide' })
  async handleMoneroo(
    @Body() payload: MonerooWebhookPayload,
    @Headers('x-moneroo-signature') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>('MONEROO_WEBHOOK_SECRET');

    // Verify signature if webhook secret is configured
    if (webhookSecret && signature) {
      const rawBody = req?.rawBody 
        ? (req.rawBody instanceof Buffer ? req.rawBody.toString() : String(req.rawBody))
        : JSON.stringify(payload);
      
      try {
        const computedSignature = createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex');

        const signatureBuffer = Buffer.from(signature);
        const computedBuffer = Buffer.from(computedSignature);

        if (signatureBuffer.length !== computedBuffer.length) {
          throw new UnauthorizedException('Invalid webhook signature');
        }

        if (!timingSafeEqual(signatureBuffer, computedBuffer)) {
          this.logger.warn('Invalid Moneroo webhook signature');
          throw new UnauthorizedException('Invalid webhook signature');
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        this.logger.error('Error verifying Moneroo webhook signature', error as Error);
        throw new UnauthorizedException('Webhook signature verification failed');
      }
    } else if (webhookSecret && !signature) {
      this.logger.warn('Moneroo webhook secret configured but no signature provided');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const data = payload?.data;

    if (!payload?.event || !data) {
      throw new BadRequestException('Invalid Moneroo webhook payload');
    }

    const status = mapMonerooStatus(data?.status, payload.event);
    const paymentId = data?.metadata?.boohpay_payment_id as string | undefined;

    if (!paymentId && !data?.id) {
      this.logger.warn('Moneroo webhook received without payment ID', payload);
      // Still accept the webhook, but log a warning
    }

    await this.paymentsService.applyWebhookEvent({
      provider: 'MONEROO',
      type: payload.event,
      providerEventId: data?.id ?? payload.event,
      paymentId,
      orderId: data?.metadata?.order_id as string | undefined,
      providerReference: data?.id,
      status,
      rawPayload: payload,
    });

    return { received: true };
  }

  @Post('ebilling')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Webhook eBilling', description: 'Reçoit et traite les webhooks eBilling pour mettre à jour les statuts des paiements' })
  @ApiHeader({ name: 'x-ebilling-signature', required: false, description: 'Signature eBilling pour vérification' })
  @ApiResponse({ status: 202, description: 'Webhook accepté et traité' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  async handleEbilling(
    @Body() payload: EbillingWebhookPayload,
    @Headers('x-webhook-token') token?: string,
  ) {
    const expectedToken = this.configService.get<string>('EBILLING_WEBHOOK_TOKEN');

    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    if (!payload || !payload.reference) {
      throw new BadRequestException('Invalid eBilling payload');
    }

    const status = mapEbillingStatus(payload.status);

    await this.paymentsService.applyWebhookEvent({
      provider: 'EBILLING',
      type: `ebilling.${(payload.status ?? 'unknown').toLowerCase()}`,
      providerEventId: payload.transaction_id ?? payload.bill_id,
      orderId: payload.reference,
      providerReference: payload.bill_id,
      status,
      rawPayload: payload,
    });

    return { received: true };
  }

  @Post('shap/payout')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Webhook SHAP Payout', description: 'Reçoit et traite les webhooks SHAP pour mettre à jour les statuts des payouts' })
  @ApiResponse({ status: 202, description: 'Webhook accepté et traité' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  async handleShapPayout(
    @Body() payload: ShapPayoutCallbackPayload,
    @Headers('x-webhook-token') token?: string,
  ) {
    const expectedToken = this.configService.get<string>('SHAP_WEBHOOK_TOKEN');

    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    if (!payload) {
      throw new BadRequestException('Missing SHAP payload');
    }

    await this.payoutsService.handleShapCallback(payload);

    return { received: true };
  }

  @Post('moneroo/payout')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleMonerooPayout(
    @Body() payload: MonerooPayoutCallbackPayload,
    @Headers('x-moneroo-signature') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>('MONEROO_WEBHOOK_SECRET');

    // Vérifier la signature si le secret est configuré
    if (webhookSecret && signature) {
      const rawBody = req?.rawBody 
        ? (req.rawBody instanceof Buffer ? req.rawBody.toString() : String(req.rawBody))
        : JSON.stringify(payload);
      
      try {
        const computedSignature = createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex');

        const signatureBuffer = Buffer.from(signature);
        const computedBuffer = Buffer.from(computedSignature);

        if (signatureBuffer.length !== computedBuffer.length) {
          throw new UnauthorizedException('Invalid webhook signature');
        }

        if (!timingSafeEqual(signatureBuffer, computedBuffer)) {
          this.logger.warn('Invalid Moneroo payout webhook signature');
          throw new UnauthorizedException('Invalid webhook signature');
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        this.logger.error('Error verifying Moneroo payout webhook signature', error as Error);
        throw new UnauthorizedException('Webhook signature verification failed');
      }
    } else if (webhookSecret && !signature) {
      this.logger.warn('Moneroo webhook secret configured but no signature provided');
      throw new UnauthorizedException('Missing webhook signature');
    }

    if (!payload) {
      throw new BadRequestException('Missing Moneroo payout payload');
    }

    // Vérifier que c'est bien un événement de payout
    const eventType = payload.event?.toLowerCase() ?? '';
    if (!eventType.startsWith('payout.')) {
      this.logger.debug(`Ignoring non-payout Moneroo event: ${eventType}`);
      return { received: true };
    }

    await this.payoutsService.handleMonerooCallback(payload);

    return { received: true };
  }
}

type MonerooWebhookPayload = {
  event: string; // payment.initiated, payment.success, payment.failed, payment.cancelled, etc.
  data: {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    customer?: {
      id?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    metadata?: Record<string, string | unknown>;
    [key: string]: unknown;
  };
};

type EbillingWebhookPayload = {
  bill_id: string;
  status?: string;
  reference: string;
  amount?: string | number;
  payer_msisdn?: string;
  transaction_id?: string;
  paid_at?: string;
  payment_system?: string;
  [key: string]: unknown;
};

function mapStripeStatus(status?: string, eventType?: string): PaymentStatus | undefined {
  if (!status && eventType === 'payment_intent.payment_failed') {
    return PaymentStatus.FAILED;
  }

  switch ((status ?? '').toLowerCase()) {
    case 'succeeded':
      return PaymentStatus.SUCCEEDED;
    case 'processing':
    case 'requires_capture':
      return PaymentStatus.AUTHORIZED;
    case 'requires_payment_method':
    case 'canceled':
    case 'requires_action':
      return PaymentStatus.FAILED;
    default:
      return undefined;
  }
}

function mapMonerooStatus(status?: string, eventType?: string): PaymentStatus | undefined {
  // Map by event type first (more reliable)
  const normalizedEvent = (eventType ?? '').toLowerCase();
  if (normalizedEvent === 'payment.success') {
    return PaymentStatus.SUCCEEDED;
  }
  if (normalizedEvent === 'payment.failed') {
    return PaymentStatus.FAILED;
  }
  if (normalizedEvent === 'payment.cancelled') {
    return PaymentStatus.FAILED;
  }
  if (normalizedEvent === 'payment.initiated') {
    return PaymentStatus.PENDING;
  }

  // Fallback to status field
  const normalized = (status ?? '').toLowerCase();
  switch (normalized) {
    case 'success':
    case 'succeeded':
      return PaymentStatus.SUCCEEDED;
    case 'pending':
    case 'processing':
      return PaymentStatus.PENDING;
    case 'failed':
    case 'error':
    case 'declined':
      return PaymentStatus.FAILED;
    default:
      return undefined;
  }
}

function mapEbillingStatus(status?: string): PaymentStatus | undefined {
  const normalized = (status ?? '').toLowerCase();

  switch (normalized) {
    case 'success':
    case 'succeeded':
      return PaymentStatus.SUCCEEDED;
    case 'processing':
    case 'pending':
      return PaymentStatus.PENDING;
    case 'failed':
    case 'error':
    case 'declined':
      return PaymentStatus.FAILED;
    default:
      return undefined;
  }
}
