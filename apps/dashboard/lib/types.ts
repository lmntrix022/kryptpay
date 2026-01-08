export type DashboardItem = {
  paymentId: string;
  merchantId: string;
  orderId: string;
  gatewayUsed: 'STRIPE' | 'MONEROO' | 'EBILLING';
  status: 'PENDING' | 'AUTHORIZED' | 'SUCCEEDED' | 'FAILED';
  amount: number;
  currency: string;
  providerReference?: string;
  subscriptionId?: string | null;
  isTestMode?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardTotals = {
  volumeMinor: number;
  transactions: number;
  byGateway: Record<string, { volumeMinor: number; count: number }>;
  byStatus: Record<string, { volumeMinor: number; count: number }>;
};

export type DashboardResponse = {
  items: DashboardItem[];
  metadata?: {
    limit?: number;
    returned?: number;
  };
  totals: DashboardTotals;
};

export type DashboardFilters = {
  gateway?: string;
  status?: string;
  limit?: number;
};

export type PayoutItem = {
  payoutId: string;
  merchantId: string;
  provider: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  amount: number;
  currency: string;
  paymentSystem: string;
  payoutType: 'REFUND' | 'CASHBACK' | 'WITHDRAWAL';
  msisdn: string;
  providerReference?: string | null;
  externalReference?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  events: Array<{ type: string; at: string }>;
};

export type PayoutTotals = {
  volumeMinor: number;
  count: number;
  byStatus: Record<string, { volumeMinor: number; count: number }>;
  byProvider: Record<string, { volumeMinor: number; count: number }>;
};

export type PayoutResponse = {
  payouts: PayoutItem[];
  totals: PayoutTotals;
};

export type PayoutFilters = {
  status?: string;
  provider?: string;
  limit?: number;
};

export type CreatePayoutDto = {
  paymentSystemName: string;
  payeeMsisdn: string;
  amount: number;
  currency: string;
  payoutType?: 'REFUND' | 'CASHBACK' | 'WITHDRAWAL';
  externalReference?: string;
  metadata?: Record<string, unknown>;
  provider?: 'STRIPE' | 'MONEROO' | 'SHAP';
};

export type MerchantItem = {
  id: string;
  name: string;
  createdAt: string;
  stats: {
    paymentsCount: number;
    payoutsCount: number;
    paymentsVolumeMinor: number;
    payoutsVolumeMinor: number;
    usersCount: number;
    byGateway: Record<string, { volumeMinor: number; count: number }>;
    byStatus: Record<string, { volumeMinor: number; count: number }>;
  };
};

export type UserItem = {
  id: string;
  email: string;
  role: string;
  merchantId: string | null;
  merchantName: string | null;
  createdAt: string;
};

export type RefundItem = {
  refundId: string;
  paymentId: string;
  merchantId: string;
  amountMinor: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  reason?: string;
  providerReference?: string;
  failureCode?: string;
  metadata?: Record<string, unknown>;
  events?: Array<{ type: string; at: string; payload?: unknown }>;
  createdAt: string;
  updatedAt: string;
};

export type RefundTotals = {
  volumeMinor: number;
  transactions: number;
  byStatus: Record<string, { volumeMinor: number; count: number }>;
};

export type RefundResponse = {
  items: RefundItem[];
  metadata?: {
    limit?: number;
    returned?: number;
  };
  totals: RefundTotals;
};

export type WebhookDeliveryItem = {
  id: string;
  merchantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  attempts: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  httpStatusCode?: number | null;
  errorMessage?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebhookDeliveriesResponse = {
  items: WebhookDeliveryItem[];
  metadata?: {
    limit?: number;
    returned?: number;
  };
};

export type WebhookConfig = {
  webhookUrl?: string;
  hasSecret: boolean;
};

// Analytics Types
export type PaymentAnalytics = {
  total: {
    count: number;
    volumeMinor: number;
    succeeded: number;
    failed: number;
    pending: number;
  };
  byGateway: Record<string, {
    count: number;
    volumeMinor: number;
    succeeded: number;
    failed: number;
  }>;
  byStatus: Record<string, {
    count: number;
    volumeMinor: number;
  }>;
  byCurrency: Record<string, {
    count: number;
    volumeMinor: number;
  }>;
  conversionRate: number;
  averageAmount: number;
  trends: {
    date: string;
    count: number;
    volumeMinor: number;
    succeeded: number;
  }[];
};

export type PayoutAnalytics = {
  total: {
    count: number;
    volumeMinor: number;
    succeeded: number;
    failed: number;
    pending: number;
  };
  byProvider: Record<string, {
    count: number;
    volumeMinor: number;
    succeeded: number;
    failed: number;
  }>;
  byStatus: Record<string, {
    count: number;
    volumeMinor: number;
  }>;
  successRate: number;
  averageAmount: number;
};

export type CombinedAnalytics = {
  payments: PaymentAnalytics;
  payouts: PayoutAnalytics;
  period: {
    start: string;
    end: string;
  };
};

// Subscription Types
export type SubscriptionItem = {
  subscriptionId: string;
  merchantId: string;
  customerEmail: string;
  customerPhone?: string | null;
  amountMinor: number;
  currency: string;
  billingCycle: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'TRIALING';
  startDate: string;
  nextBillingDate: string;
  lastBillingDate?: string | null;
  cancelAt?: string | null;
  cancelledAt?: string | null;
  metadata?: Record<string, unknown> | null;
  isTestMode: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedFilterItem = {
  id: string;
  merchantId: string;
  name: string;
  type: 'payment' | 'payout' | 'refund';
  filters: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};


