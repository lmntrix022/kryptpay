import { RefundStatus } from '@prisma/client';

export interface CreateRefundContext {
  paymentId: string;
  paymentProviderReference: string;
  amountMinor: number;
  currency: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  merchant_id: string;
}

export interface CreateRefundResult {
  providerReference: string;
  status: RefundStatus;
  metadata?: Record<string, unknown>;
}

export interface RefundProvider {
  createRefund(input: CreateRefundContext): Promise<CreateRefundResult>;
}


