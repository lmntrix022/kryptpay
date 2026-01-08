import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PaymentStatus, PayoutStatus, Gateway } from '@prisma/client';
import { CacheService } from '../../common/services/cache.service';

export interface AnalyticsFilters {
  merchantId?: string;
  startDate?: Date;
  endDate?: Date;
  gateway?: Gateway;
  currency?: string;
  countryCode?: string;
  isTestMode?: boolean;
}

export interface PaymentAnalytics {
  total: {
    count: number;
    volumeMinor: number;
    succeeded: number;
    failed: number;
    pending: number;
  };
  byGateway: Record<Gateway, {
    count: number;
    volumeMinor: number;
    succeeded: number;
    failed: number;
  }>;
  byStatus: Record<PaymentStatus, {
    count: number;
    volumeMinor: number;
  }>;
  byCurrency: Record<string, {
    count: number;
    volumeMinor: number;
  }>;
  conversionRate: number; // Taux de conversion (succeeded / total)
  averageAmount: number;
  trends: {
    date: string;
    count: number;
    volumeMinor: number;
    succeeded: number;
  }[];
}

export interface PayoutAnalytics {
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
  byStatus: Record<PayoutStatus, {
    count: number;
    volumeMinor: number;
  }>;
  successRate: number;
  averageAmount: number;
}

export interface CombinedAnalytics {
  payments: PaymentAnalytics;
  payouts: PayoutAnalytics;
  period: {
    start: Date;
    end: Date;
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  /**
   * Obtenir les analytics pour les paiements
   */
  async getPaymentAnalytics(filters: AnalyticsFilters): Promise<PaymentAnalytics> {
    // Générer une clé de cache unique basée sur les filtres
    const cacheKey = this.cacheService
      ? CacheService.generateKey(
          'analytics:payments',
          filters.merchantId || 'all',
          filters.startDate?.toISOString() || 'all',
          filters.endDate?.toISOString() || 'all',
          filters.gateway || 'all',
          filters.currency || 'all',
          filters.countryCode || 'all',
          filters.isTestMode !== undefined ? String(filters.isTestMode) : 'all',
        )
      : null;

    // Essayer de récupérer depuis le cache
    if (this.cacheService && cacheKey) {
      const cached = await this.cacheService.get<PaymentAnalytics>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for payment analytics: ${cacheKey}`);
        return cached;
      }
    }

    const where = this.buildPaymentWhere(filters);

    // Totaux
    const [totalCount, totalVolume, statusCounts] = await Promise.all([
      this.prisma.transactions.count({ where }),
      this.prisma.transactions.aggregate({
        where,
        _sum: { amountMinor: true },
      }),
      this.prisma.transactions.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { amountMinor: true },
      }),
    ]);

    const totalVolumeMinor = totalVolume._sum?.amountMinor || 0;

    // Par gateway
    const gatewayStats = await this.prisma.transactions.groupBy({
      by: ['gatewayUsed'],
      where,
      _count: { id: true },
      _sum: { amountMinor: true },
    });

    const byGateway: Record<Gateway, any> = {} as any;
    for (const gateway of Object.values(Gateway)) {
      const stat = gatewayStats.find((s) => s.gatewayUsed === gateway);
      const succeeded = await this.prisma.transactions.count({
        where: { ...where, gatewayUsed: gateway, status: PaymentStatus.SUCCEEDED },
      });
      const failed = await this.prisma.transactions.count({
        where: { ...where, gatewayUsed: gateway, status: PaymentStatus.FAILED },
      });

      byGateway[gateway] = {
        count: (typeof stat?._count === 'object' && stat._count ? stat._count.id : 0) || 0,
        volumeMinor: stat?._sum?.amountMinor || 0,
        succeeded,
        failed,
      };
    }

    // Par statut
    const byStatus: Record<PaymentStatus, any> = {} as any;
    for (const status of Object.values(PaymentStatus)) {
      const stat = statusCounts.find((s) => s.status === status);
      byStatus[status] = {
        count: (typeof stat?._count === 'object' && stat._count ? stat._count.id : 0) || 0,
        volumeMinor: stat?._sum?.amountMinor || 0,
      };
    }

    // Par devise
    const currencyStats = await this.prisma.transactions.groupBy({
      by: ['currency'],
      where,
      _count: { id: true },
      _sum: { amountMinor: true },
    });

    const byCurrency: Record<string, any> = {};
    for (const stat of currencyStats) {
      byCurrency[stat.currency] = {
        count: typeof stat._count === 'object' && stat._count ? stat._count.id || 0 : 0,
        volumeMinor: stat._sum?.amountMinor || 0,
      };
    }

    // Taux de conversion
    const succeededCount = byStatus[PaymentStatus.SUCCEEDED]?.count || 0;
    const conversionRate = totalCount > 0 ? (succeededCount / totalCount) * 100 : 0;

    // Montant moyen
    const averageAmount = totalCount > 0 ? totalVolumeMinor / totalCount : 0;

    // Tendances (par jour)
    const trends = await this.getPaymentTrends(filters, where);

    const result: PaymentAnalytics = {
      total: {
        count: totalCount,
        volumeMinor: totalVolumeMinor,
        succeeded: succeededCount,
        failed: byStatus[PaymentStatus.FAILED]?.count || 0,
        pending: byStatus[PaymentStatus.PENDING]?.count || 0,
      },
      byGateway,
      byStatus,
      byCurrency,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageAmount: Math.round(averageAmount),
      trends,
    };

    // Mettre en cache la réponse (TTL de 5 minutes pour les analytics)
    if (this.cacheService && cacheKey) {
      await this.cacheService.set(cacheKey, result, CacheService.TTL.MEDIUM);
    }

    return result;
  }

  /**
   * Obtenir les analytics pour les payouts
   */
  async getPayoutAnalytics(filters: AnalyticsFilters): Promise<PayoutAnalytics> {
    // Générer une clé de cache unique basée sur les filtres
    const cacheKey = this.cacheService
      ? CacheService.generateKey(
          'analytics:payouts',
          filters.merchantId || 'all',
          filters.startDate?.toISOString() || 'all',
          filters.endDate?.toISOString() || 'all',
        )
      : null;

    // Essayer de récupérer depuis le cache
    if (this.cacheService && cacheKey) {
      const cached = await this.cacheService.get<PayoutAnalytics>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for payout analytics: ${cacheKey}`);
        return cached;
      }
    }

    const where = this.buildPayoutWhere(filters);

    // Totaux
    const [totalCount, totalVolume, statusCounts] = await Promise.all([
      this.prisma.payouts.count({ where }),
      this.prisma.payouts.aggregate({
        where,
        _sum: { amount_minor: true },
      }),
      this.prisma.payouts.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { amount_minor: true },
      }),
    ]);

    const totalVolumeMinor = Number(totalVolume._sum?.amount_minor) || 0;

    // Par provider
    const providerStats = await this.prisma.payouts.groupBy({
      by: ['provider'],
      where,
      _count: { id: true },
      _sum: { amount_minor: true },
    });

    const byProvider: Record<string, any> = {};
    for (const stat of providerStats) {
      const succeeded = await this.prisma.payouts.count({
        where: { ...where, provider: stat.provider, status: PayoutStatus.SUCCEEDED },
      });
      const failed = await this.prisma.payouts.count({
        where: { ...where, provider: stat.provider, status: PayoutStatus.FAILED },
      });

      byProvider[stat.provider] = {
        count: typeof stat._count === 'object' && stat._count ? stat._count.id || 0 : 0,
        volumeMinor: Number(stat._sum?.amount_minor) || 0,
        succeeded,
        failed,
      };
    }

    // Par statut
    const byStatus: Record<PayoutStatus, any> = {} as any;
    for (const status of Object.values(PayoutStatus)) {
      const stat = statusCounts.find((s) => s.status === status);
      byStatus[status] = {
        count: (typeof stat?._count === 'object' && stat._count ? stat._count.id : 0) || 0,
        volumeMinor: Number(stat?._sum?.amount_minor) || 0,
      };
    }

    // Taux de succès
    const succeededCount = byStatus[PayoutStatus.SUCCEEDED]?.count || 0;
    const successRate = totalCount > 0 ? (succeededCount / totalCount) * 100 : 0;

    // Montant moyen
    const averageAmount = totalCount > 0 ? totalVolumeMinor / totalCount : 0;

    const result: PayoutAnalytics = {
      total: {
        count: totalCount,
        volumeMinor: totalVolumeMinor,
        succeeded: succeededCount,
        failed: byStatus[PayoutStatus.FAILED]?.count || 0,
        pending: byStatus[PayoutStatus.PENDING]?.count || 0,
      },
      byProvider,
      byStatus,
      successRate: Math.round(successRate * 100) / 100,
      averageAmount: Math.round(averageAmount),
    };

    // Mettre en cache la réponse (TTL de 5 minutes pour les analytics)
    if (this.cacheService && cacheKey) {
      await this.cacheService.set(cacheKey, result, CacheService.TTL.MEDIUM);
    }

    return result;
  }

  /**
   * Obtenir les analytics combinés (paiements + payouts)
   */
  async getCombinedAnalytics(filters: AnalyticsFilters): Promise<CombinedAnalytics> {
    // Générer une clé de cache unique basée sur les filtres
    const cacheKey = this.cacheService
      ? CacheService.generateKey(
          'analytics:combined',
          filters.merchantId || 'all',
          filters.startDate?.toISOString() || 'all',
          filters.endDate?.toISOString() || 'all',
          filters.gateway || 'all',
          filters.currency || 'all',
          filters.countryCode || 'all',
          filters.isTestMode !== undefined ? String(filters.isTestMode) : 'all',
        )
      : null;

    // Essayer de récupérer depuis le cache
    if (this.cacheService && cacheKey) {
      const cached = await this.cacheService.get<CombinedAnalytics>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for combined analytics: ${cacheKey}`);
        return cached;
      }
    }

    const [payments, payouts] = await Promise.all([
      this.getPaymentAnalytics(filters),
      this.getPayoutAnalytics(filters),
    ]);

    const result: CombinedAnalytics = {
      payments,
      payouts,
      period: {
        start: filters.startDate || new Date(0),
        end: filters.endDate || new Date(),
      },
    };

    // Mettre en cache la réponse (TTL de 5 minutes pour les analytics)
    if (this.cacheService && cacheKey) {
      await this.cacheService.set(cacheKey, result, CacheService.TTL.MEDIUM);
    }

    return result;
  }

  /**
   * Obtenir les tendances des paiements par jour
   */
  private async getPaymentTrends(
    filters: AnalyticsFilters,
    where: Prisma.transactionsWhereInput,
  ): Promise<PaymentAnalytics['trends']> {
    // Utiliser une requête SQL brute pour grouper par jour
    const start = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 derniers jours par défaut
    const end = filters.endDate || new Date();

    const trends = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        count: bigint;
        volume_minor: bigint;
        succeeded: bigint;
      }>
    >`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::bigint as count,
        COALESCE(SUM("amount_minor"), 0)::bigint as volume_minor,
        COUNT(CASE WHEN status = 'SUCCEEDED' THEN 1 END)::bigint as succeeded
      FROM "transactions"
      WHERE "createdAt" >= ${start}::timestamp
        AND "createdAt" <= ${end}::timestamp
        ${filters.merchantId ? Prisma.sql`AND "merchant_id" = ${filters.merchantId}` : Prisma.empty}
        ${filters.isTestMode !== undefined ? Prisma.sql`AND "is_test_mode" = ${filters.isTestMode}` : Prisma.empty}
        ${filters.gateway ? Prisma.sql`AND "gatewayUsed" = ${filters.gateway}` : Prisma.empty}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return trends.map((t) => ({
      date: t.date.toISOString().split('T')[0],
      count: Number(t.count),
      volumeMinor: Number(t.volume_minor),
      succeeded: Number(t.succeeded),
    }));
  }

  private buildPaymentWhere(filters: AnalyticsFilters): Prisma.transactionsWhereInput {
    const where: Prisma.transactionsWhereInput = {};

    if (filters.merchantId) {
      where.merchant_id = filters.merchantId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters.gateway) {
      where.gatewayUsed = filters.gateway;
    }

    if (filters.currency) {
      where.currency = filters.currency;
    }

    if (filters.countryCode) {
      where.countryCode = filters.countryCode;
    }

    if (filters.isTestMode !== undefined) {
      where.is_test_mode = filters.isTestMode;
    }

    return where;
  }

  private buildPayoutWhere(filters: AnalyticsFilters): Prisma.payoutsWhereInput {
    const where: Prisma.payoutsWhereInput = {};

    if (filters.merchantId) {
      where.merchant_id = filters.merchantId;
    }

    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.created_at.lte = filters.endDate;
      }
    }

    if (filters.currency) {
      where.currency = filters.currency;
    }

    if (filters.isTestMode !== undefined) {
      where.is_test_mode = filters.isTestMode;
    }

    return where;
  }
}


