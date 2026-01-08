import type { PaymentStatus, Prisma } from '@prisma/client';

export type PaymentWithEvents = Prisma.transactionsGetPayload<{
  include: { transaction_events: true };
}>;

export interface PaymentWebhookEvent {
  provider: 'STRIPE' | 'MONEROO' | 'EBILLING';
  type: string;
  providerEventId?: string;
  paymentId?: string;
  orderId?: string;
  providerReference?: string;
  status?: PaymentStatus;
  rawPayload: unknown;
}

export type { PaymentStatus };
