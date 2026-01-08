import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../../prisma/prisma.service';

export interface PlatformRevenueStats {
  // Revenus totaux de la plateforme
  totalRevenue: number;
  totalCommissions: number;
  totalTransactions: number;
  pendingCommissions: number; // Commissions en attente (PENDING avec platformFee > 0)
  pendingTransactions: number; // Nombre de transactions en attente
  
  // Par période
  today: PeriodRevenue;
  thisWeek: PeriodRevenue;
  thisMonth: PeriodRevenue;
  lastMonth: PeriodRevenue;
  
  // Par gateway
  byGateway: GatewayRevenue[];
  
  // Par marchand (top 10)
  topMerchants: MerchantRevenue[];
  
  // Graphique des 30 derniers jours
  dailyRevenue: DailyRevenue[];
  
  // Taux de croissance
  growthRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface PeriodRevenue {
  revenue: number;
  commissions: number;
  transactions: number;
  volume: number;
  averageCommission: number;
  pendingCommissions?: number; // Commissions en attente pour cette période
  pendingTransactions?: number; // Transactions en attente pour cette période
}

export interface GatewayRevenue {
  gateway: string;
  revenue: number;
  commissions: number;
  transactions: number;
  percentage: number;
}

export interface MerchantRevenue {
  merchant_id: string;
  merchantName: string;
  revenue: number;
  commissions: number;
  transactions: number;
  percentage: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  commissions: number;
  transactions: number;
}

@Injectable()
export class PlatformRevenueService {
  private readonly logger = new Logger(PlatformRevenueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtenir les statistiques de revenus de la plateforme
   */
  async getPlatformRevenue(): Promise<PlatformRevenueStats> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const [
        totals,
        pendingTotals,
        todayStats,
        weekStats,
        monthStats,
        lastMonthStats,
        byGateway,
        topMerchants,
        dailyRevenue,
      ] = await Promise.all([
        this.getTotalRevenue(),
        this.getPendingRevenue(),
        this.getPeriodRevenue(startOfToday, now),
        this.getPeriodRevenue(startOfWeek, now),
        this.getPeriodRevenue(startOfMonth, now),
        this.getPeriodRevenue(startOfLastMonth, endOfLastMonth),
        this.getRevenueByGateway(),
        this.getTopMerchants(10),
        this.getDailyRevenue(30),
      ]);

      // Calculer les taux de croissance
      const yesterdayStart = new Date(startOfToday);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayStats = await this.getPeriodRevenue(yesterdayStart, startOfToday);

      const lastWeekStart = new Date(startOfWeek);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekStats = await this.getPeriodRevenue(lastWeekStart, startOfWeek);

      return {
        totalRevenue: totals.revenue || 0,
        totalCommissions: totals.commissions || 0,
        totalTransactions: totals.transactions || 0,
        pendingCommissions: pendingTotals.commissions || 0,
        pendingTransactions: pendingTotals.transactions || 0,
        today: todayStats,
        thisWeek: weekStats,
        thisMonth: monthStats,
        lastMonth: lastMonthStats,
        byGateway: byGateway || [],
        topMerchants: topMerchants || [],
        dailyRevenue: dailyRevenue || [],
        growthRate: {
          daily: this.calculateGrowth(todayStats.commissions, yesterdayStats.commissions),
          weekly: this.calculateGrowth(weekStats.commissions, lastWeekStats.commissions),
          monthly: this.calculateGrowth(monthStats.commissions, lastMonthStats.commissions),
        },
      };
    } catch (error) {
      this.logger.error('Error in getPlatformRevenue:', error);
      throw error;
    }
  }

  /**
   * Obtenir le résumé rapide pour le dashboard
   */
  async getQuickStats(): Promise<{
    todayCommissions: number;
    weekCommissions: number;
    monthCommissions: number;
    totalCommissions: number;
    pendingPayouts: number;
  }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, week, month, total, pendingPayouts] = await Promise.all([
      this.prisma.transactions.aggregate({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: { gte: startOfToday },
        },
        _sum: { platform_fee: true },
      }),
      this.prisma.transactions.aggregate({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: { gte: startOfWeek },
        },
        _sum: { platform_fee: true },
      }),
      this.prisma.transactions.aggregate({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: { gte: startOfMonth },
        },
        _sum: { platform_fee: true },
      }),
      this.prisma.transactions.aggregate({
        where: { status: PaymentStatus.SUCCEEDED },
        _sum: { platform_fee: true },
      }),
      this.prisma.payouts.aggregate({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
        _sum: { amount_minor: true },
      }),
    ]);

    return {
      todayCommissions: Number(today._sum.platform_fee) || 0,
      weekCommissions: Number(week._sum.platform_fee) || 0,
      monthCommissions: Number(month._sum.platform_fee) || 0,
      totalCommissions: Number(total._sum.platform_fee) || 0,
      pendingPayouts: Number(pendingPayouts._sum.amount_minor) || 0,
    };
  }

  // ============ PRIVATE METHODS ============

  private async getTotalRevenue(): Promise<{ revenue: number; commissions: number; transactions: number }> {
    const result = await this.prisma.transactions.aggregate({
      where: { status: PaymentStatus.SUCCEEDED },
      _sum: {
        amountMinor: true,
        platform_fee: true,
      },
      _count: { id: true },
    });

    return {
      revenue: Number(result._sum.amountMinor) || 0,
      commissions: Number(result._sum.platform_fee) || 0,
      transactions: result._count.id,
    };
  }

  /**
   * Obtenir les commissions en attente (transactions PENDING avec platformFee > 0)
   */
  private async getPendingRevenue(): Promise<{ commissions: number; transactions: number }> {
    const result = await this.prisma.transactions.aggregate({
      where: { 
        status: PaymentStatus.PENDING,
        platform_fee: { gt: 0 },
      },
      _sum: {
        platform_fee: true,
      },
      _count: { id: true },
    });

    return {
      commissions: Number(result._sum.platform_fee) || 0,
      transactions: result._count.id,
    };
  }

  private async getPeriodRevenue(startDate: Date, endDate: Date): Promise<PeriodRevenue> {
    const [succeededResult, pendingResult] = await Promise.all([
      this.prisma.transactions.aggregate({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: {
          amountMinor: true,
          platform_fee: true,
        },
        _count: { id: true },
      }),
      this.prisma.transactions.aggregate({
        where: {
          status: PaymentStatus.PENDING,
          platform_fee: { gt: 0 },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: {
          platform_fee: true,
        },
        _count: { id: true },
      }),
    ]);

    const volume = Number(succeededResult._sum.amountMinor) || 0;
    const commissions = Number(succeededResult._sum.platform_fee) || 0;
    const transactions = succeededResult._count.id;
    const pendingCommissions = Number(pendingResult._sum.platform_fee) || 0;
    const pendingTransactions = pendingResult._count.id;

    return {
      revenue: volume,
      commissions,
      transactions,
      volume,
      averageCommission: transactions > 0 ? Math.round(commissions / transactions) : 0,
      pendingCommissions,
      pendingTransactions,
    };
  }

  private async getRevenueByGateway(): Promise<GatewayRevenue[]> {
    const results = await this.prisma.$queryRaw<{ gateway: string; revenue: bigint; commissions: bigint; transactions: bigint }[]>`
      SELECT 
        "gatewayUsed" as gateway,
        COALESCE(SUM("amountMinor"), 0)::bigint as revenue,
        COALESCE(SUM(platform_fee), 0)::bigint as commissions,
        COUNT(*)::bigint as transactions
      FROM transactions
      WHERE "status" = 'SUCCEEDED'
      GROUP BY "gatewayUsed"
    `;

    const totalCommissions = results.reduce((sum, r) => sum + Number(r.commissions), 0);

    return results.map(r => ({
      gateway: r.gateway,
      revenue: Number(r.revenue),
      commissions: Number(r.commissions),
      transactions: Number(r.transactions),
      percentage: totalCommissions > 0 ? (Number(r.commissions) / totalCommissions) * 100 : 0,
    }));
  }

  private async getTopMerchants(limit: number): Promise<MerchantRevenue[]> {
    const results = await this.prisma.$queryRaw<{ merchant_id: string; revenue: bigint; commissions: bigint; transactions: bigint }[]>`
      SELECT 
        merchant_id,
        COALESCE(SUM("amountMinor"), 0)::bigint as revenue,
        COALESCE(SUM(platform_fee), 0)::bigint as commissions,
        COUNT(*)::bigint as transactions
      FROM transactions
      WHERE "status" = 'SUCCEEDED'
      GROUP BY merchant_id
      ORDER BY commissions DESC
      LIMIT ${limit}
    `;

    const totalCommissions = results.reduce((sum, r) => sum + Number(r.commissions), 0);

    // Récupérer les noms des marchands
    const merchantIds = results.map(r => r.merchant_id);
    const merchants = await this.prisma.merchants.findMany({
      where: { id: { in: merchantIds } },
      select: { id: true, name: true },
    });
    const merchantMap = new Map(merchants.map(m => [m.id, m.name]));

    return results.map(r => ({
      merchant_id: r.merchant_id,
      merchantName: merchantMap.get(r.merchant_id) || 'Unknown',
      revenue: Number(r.revenue),
      commissions: Number(r.commissions),
      transactions: Number(r.transactions),
      percentage: totalCommissions > 0 ? (Number(r.commissions) / totalCommissions) * 100 : 0,
    }));
  }

  private async getDailyRevenue(days: number): Promise<DailyRevenue[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await this.prisma.$queryRaw<{ date: Date; revenue: bigint; commissions: bigint; transactions: bigint }[]>`
      SELECT 
        DATE("createdAt") as date,
        COALESCE(SUM("amountMinor"), 0)::bigint as revenue,
        COALESCE(SUM(platform_fee), 0)::bigint as commissions,
        COUNT(*)::bigint as transactions
      FROM transactions
      WHERE "status" = 'SUCCEEDED'
        AND "createdAt" >= ${startDate}::timestamp
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return results.map(r => ({
      date: r.date.toISOString().split('T')[0],
      revenue: Number(r.revenue),
      commissions: Number(r.commissions),
      transactions: Number(r.transactions),
    }));
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}

