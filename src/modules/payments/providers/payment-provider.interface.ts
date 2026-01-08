import { PaymentStatus } from '@prisma/client';

import { CreatePaymentDto } from '../dto/create-payment.dto';

export interface CreatePaymentContext {
  dto: CreatePaymentDto;
  paymentId: string;
  merchant_id: string;
}

export interface CreatePaymentResult {
  providerReference: string;
  status: PaymentStatus;
  checkoutPayload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  createPayment(input: CreatePaymentContext): Promise<CreatePaymentResult>;
}
