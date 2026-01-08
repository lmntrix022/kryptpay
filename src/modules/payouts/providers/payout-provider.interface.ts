import { payouts as Payout, PayoutStatus } from '@prisma/client';

import { CreatePayoutDto } from '../dto/create-payout.dto';

export interface CreatePayoutContext {
  merchant_id: string;
  payout: Payout;
  dto: CreatePayoutDto;
}

export interface CreatePayoutResult {
  providerReference?: string;
  status?: PayoutStatus;
  metadata?: Record<string, unknown>;
  rawResponse?: unknown;
}

export interface PayoutProvider {
  createPayout(context: CreatePayoutContext): Promise<CreatePayoutResult>;
}

