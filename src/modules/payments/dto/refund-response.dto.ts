import { RefundStatus } from '@prisma/client';

export class RefundResponseDto {
  refundId!: string;
  paymentId!: string;
  merchantId!: string;
  amountMinor!: number;
  currency!: string;
  status!: RefundStatus;
  reason?: string;
  providerReference?: string;
  failureCode?: string;
  metadata?: Record<string, unknown>;
  events?: Array<{
    type: string;
    at: string;
    payload?: unknown;
  }>;
  createdAt!: string;
  updatedAt!: string;
}


