import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, PayoutStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CurrencyConverterService } from '../../common/services/currency-converter.service';

export interface SellerStats {
  // Résumé global
  overview: {
    totalRevenue: number;
    totalCommissions: number;
    netEarnings: number;
    pendingPayouts: number;
    completedPayouts: number;
    currency: string;
  };
  
  // Statistiques par période
  periods: {
    today: PeriodStats;
    thisWeek: PeriodStats;
    thisMonth: PeriodStats;
    lastMonth: PeriodStats;
    allTime: PeriodStats;
  };
  
  // Top produits/services
  topItems: TopItem[];
  
  // Graphique de revenus (30 derniers jours)
  revenueChart: ChartDataPoint[];
  
  // Taux de conversion
  conversionRates: {
    cartToPayment: number;
    paymentSuccess: number;
    refundRate: number;
  };
  
  // Statut des payouts
  payoutStatus: {
    pending: number;
    processing: number;
    succeeded: number;
    failed: number;
    nextScheduled?: Date;
  };
}

export interface PeriodStats {
  revenue: number;
  orders: number;
  averageOrder: number;
  growth: number; // % par rapport à la période précédente
}

export interface TopItem {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
  percentage: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
  payouts: number;
}

export interface RealtimeStats {
  activeOrders: number;
  pendingPayments: number;
  todayRevenue: number;
  lastPaymentAt?: Date;
  lastPayoutAt?: Date;
}

@Injectable()
export class SellerDashboardService {
  private readonly logger = new Logger(SellerDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyConverter: CurrencyConverterService,
  ) {}

  /**
   * Obtenir les statistiques complètes du vendeur
   */
  async getSellerStats(merchant_id: string, currency = 'EUR'): Promise<SellerStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Récupérer toutes les données en parallèle
    const [
      overview,
      todayStats,
      weekStats,
      monthStats,
      lastMonthStats,
      allTimeStats,
      topItems,
      revenueChart,
      conversionRates,
      payoutStatus,
    ] = await Promise.all([
      this.getOverview(merchant_id, currency),
      this.getPeriodStats(merchant_id, startOfToday, now),
      this.getPeriodStats(merchant_id, startOfWeek, now),
      this.getPeriodStats(merchant_id, startOfMonth, now),
      this.getPeriodStats(merchant_id, startOfLastMonth, endOfLastMonth),
      this.getPeriodStats(merchant_id), // All time
      this.getTopItems(merchant_id, 10),
      this.getRevenueChart(merchant_id, 30),
      this.getConversionRates(merchant_id),
      this.getPayoutStatus(merchant_id),
    ]);

    // Calculer la croissance
    todayStats.growth = this.calculateGrowth(todayStats.revenue, weekStats.revenue / 7);
    weekStats.growth = this.calculateGrowth(weekStats.revenue, monthStats.revenue / 4);
    monthStats.growth = this.calculateGrowth(monthStats.revenue, lastMonthStats.revenue);

    return {
      overview,
      periods: {
        today: todayStats,
        thisWeek: weekStats,
        thisMonth: monthStats,
        lastMonth: lastMonthStats,
        allTime: allTimeStats,
      },
      topItems,
      revenueChart,
      conversionRates,
      payoutStatus,
    };
  }

  /**
   * Obtenir les statistiques en temps réel (pour les WebSockets)
   */
  async getRealtimeStats(merchant_id: string): Promise<RealtimeStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeOrders, pendingPayments, todayRevenue, lastPayment, lastPayout] = await Promise.all([
      // Paiements en cours
      this.prisma.transactions.count({
        where: {
          merchant_id: merchant_id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] },
        },
      }),
      
      // Paiements en attente de confirmation
      this.prisma.transactions.count({
        where: {
          merchant_id: merchant_id,
          status: PaymentStatus.PENDING,
        },
      }),
      
      // Revenus du jour
      this.prisma.transactions.aggregate({
        where: {
          merchant_id: merchant_id,
          status: PaymentStatus.SUCCEEDED,
          createdAt: { gte: startOfToday },
        },
        _sum: { amountMinor: true },
      }),
      
      // Dernier paiement
      this.prisma.transactions.findFirst({
        where: { merchant_id: merchant_id, status: PaymentStatus.SUCCEEDED },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      
      // Dernier payout
      this.prisma.payouts.findFirst({
        where: { merchant_id: merchant_id, status: PayoutStatus.SUCCEEDED },
        orderBy: { created_at: 'desc' },
        select: { created_at: true },
      }),
    ]);

    return {
      activeOrders,
      pendingPayments,
      todayRevenue: todayRevenue._sum.amountMinor || 0,
      lastPaymentAt: lastPayment?.createdAt,
      lastPayoutAt: lastPayout?.created_at,
    };
  }

  /**
   * Obtenir le résumé des revenus par gateway
   */
  async getRevenueByGateway(merchant_id: string, startDate?: Date, endDate?: Date): Promise<{
    gateway: string;
    revenue: number;
    transactions: number;
    percentage: number;
  }[]> {
    const where: Prisma.transactionsWhereInput = {
          merchant_id: merchant_id,
      status: PaymentStatus.SUCCEEDED,
    };

    if (startDate) where.createdAt = { gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt as any, lte: endDate };

    const results = await this.prisma.transactions.groupBy({
      by: ['gatewayUsed'],
      where,
      _sum: { amountMinor: true },
      _count: { id: true },
    });

    const total = results.reduce((sum, r) => sum + (r._sum.amountMinor || 0), 0);

    return results.map(r => ({
      gateway: r.gatewayUsed,
      revenue: r._sum.amountMinor || 0,
      transactions: r._count.id,
      percentage: total > 0 ? ((r._sum.amountMinor || 0) / total) * 100 : 0,
    }));
  }

  /**
   * Obtenir l'historique des payouts avec pagination
   */
  async getPayoutHistory(
    merchant_id: string,
    page = 1,
    limit = 20,
    status?: PayoutStatus
  ): Promise<{
    payouts: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: Prisma.payoutsWhereInput = { merchant_id: merchant_id };
    if (status) where.status = status;

    const [payouts, total] = await Promise.all([
      this.prisma.payouts.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          payout_events: {
            orderBy: { occurred_at: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.payouts.count({ where }),
    ]);

    return {
      payouts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtenir les prévisions de revenus
   */
  async getRevenueForecast(merchant_id: string): Promise<{
    predictedRevenue: number;
    confidence: number;
    basedOn: string;
  }> {
    // Utiliser les 3 derniers mois pour la prédiction
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const monthlyRevenues = await this.prisma.$queryRaw<{ month: Date; revenue: bigint }[]>`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM("amountMinor") as revenue
      FROM "transactions"
      WHERE "merchant_id" = ${merchant_id}
        AND status = 'SUCCEEDED'
        AND "createdAt" >= ${threeMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
      LIMIT 3
    `;

    if (monthlyRevenues.length < 2) {
      return {
        predictedRevenue: 0,
        confidence: 0,
        basedOn: 'Insufficient data',
      };
    }

    // Moyenne simple avec tendance
    const revenues = monthlyRevenues.map(r => Number(r.revenue));
    const average = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const trend = revenues.length >= 2 ? (revenues[0] - revenues[revenues.length - 1]) / revenues.length : 0;

    const predicted = Math.max(0, average + trend);
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - average, 2), 0) / revenues.length;
    const confidence = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / average) * 100));

    return {
      predictedRevenue: Math.round(predicted),
      confidence: Math.round(confidence),
      basedOn: `${revenues.length} months average with trend`,
    };
  }

  // ============ PRIVATE METHODS ============

  private async getOverview(merchant_id: string, currency: string) {
    const [payments, payouts, commissions] = await Promise.all([
      this.prisma.transactions.aggregate({
        where: { merchant_id: merchant_id, status: PaymentStatus.SUCCEEDED },
        _sum: { amountMinor: true },
      }),
      this.prisma.payouts.aggregate({
        where: { merchant_id: merchant_id },
        _sum: { amount_minor: true },
      }),
      this.prisma.transactions.aggregate({
        where: { merchant_id: merchant_id, status: PaymentStatus.SUCCEEDED },
        _sum: { platform_fee: true },
      }),
    ]);

    const pendingPayouts = await this.prisma.payouts.aggregate({
      where: { merchant_id: merchant_id, status: { in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING] } },
      _sum: { amount_minor: true },
    });

    const completedPayouts = await this.prisma.payouts.aggregate({
      where: { merchant_id: merchant_id, status: PayoutStatus.SUCCEEDED },
      _sum: { amount_minor: true },
    });

    return {
      totalRevenue: payments._sum.amountMinor || 0,
      totalCommissions: commissions._sum.platform_fee || 0,
      netEarnings: (payments._sum.amountMinor || 0) - (commissions._sum.platform_fee || 0),
      pendingPayouts: pendingPayouts._sum.amount_minor || 0,
      completedPayouts: completedPayouts._sum.amount_minor || 0,
      currency,
    };
  }

  private async getPeriodStats(
    merchant_id: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PeriodStats> {
    const where: Prisma.transactionsWhereInput = {
          merchant_id: merchant_id,
      status: PaymentStatus.SUCCEEDED,
    };

    if (startDate) where.createdAt = { gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt as any, lte: endDate };

    const [aggregate, count] = await Promise.all([
      this.prisma.transactions.aggregate({
        where,
        _sum: { amountMinor: true },
      }),
      this.prisma.transactions.count({ where }),
    ]);

    const revenue = aggregate._sum.amountMinor || 0;
    const orders = count;
    const averageOrder = orders > 0 ? Math.round(revenue / orders) : 0;

    return { revenue, orders, averageOrder, growth: 0 };
  }

  private async getTopItems(merchant_id: string, limit: number): Promise<TopItem[]> {
    const results = await this.prisma.$queryRaw<{ product_id: string; revenue: bigint; quantity: bigint }[]>`
      SELECT 
        metadata->>'productId' as product_id,
        SUM("amountMinor") as revenue,
        COUNT(*) as quantity
      FROM "transactions"
      WHERE "merchant_id" = ${merchant_id}
        AND status = 'SUCCEEDED'
        AND metadata->>'productId' IS NOT NULL
      GROUP BY metadata->>'productId'
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    const totalRevenue = results.reduce((sum, r) => sum + Number(r.revenue), 0);

    return results.map(r => ({
      id: r.product_id,
      name: r.product_id, // À enrichir avec les données produit
      revenue: Number(r.revenue),
      quantity: Number(r.quantity),
      percentage: totalRevenue > 0 ? (Number(r.revenue) / totalRevenue) * 100 : 0,
    }));
  }

  private async getRevenueChart(merchant_id: string, days: number): Promise<ChartDataPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await this.prisma.$queryRaw<{ date: Date; revenue: bigint; orders: bigint }[]>`
      SELECT 
        DATE("createdAt") as date,
        SUM("amountMinor") as revenue,
        COUNT(*) as orders
      FROM "transactions"
      WHERE "merchant_id" = ${merchant_id}
        AND status = 'SUCCEEDED'
        AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    const payoutResults = await this.prisma.$queryRaw<{ date: Date; payouts: bigint }[]>`
      SELECT 
        DATE("created_at") as date,
        SUM("amount_minor") as payouts
      FROM "payouts"
      WHERE "merchant_id" = ${merchant_id}
        AND status = 'SUCCEEDED'
        AND "created_at" >= ${startDate}
      GROUP BY DATE("created_at")
    `;

    const payoutsByDate = new Map(
      payoutResults.map(p => [p.date.toISOString().split('T')[0], Number(p.payouts)])
    );

    return results.map(r => ({
      date: r.date.toISOString().split('T')[0],
      revenue: Number(r.revenue),
      orders: Number(r.orders),
      payouts: payoutsByDate.get(r.date.toISOString().split('T')[0]) || 0,
    }));
  }

  private async getConversionRates(merchant_id: string): Promise<{
    cartToPayment: number;
    paymentSuccess: number;
    refundRate: number;
  }> {
    const [total, succeeded, refunded] = await Promise.all([
      this.prisma.transactions.count({ where: { merchant_id: merchant_id } }),
      this.prisma.transactions.count({ where: { merchant_id: merchant_id, status: PaymentStatus.SUCCEEDED } }),
      this.prisma.refunds.count({ where: { merchant_id: merchant_id } }),
    ]);

    return {
      cartToPayment: 100, // À implémenter avec les données de panier
      paymentSuccess: total > 0 ? (succeeded / total) * 100 : 0,
      refundRate: succeeded > 0 ? (refunded / succeeded) * 100 : 0,
    };
  }

  private async getPayoutStatus(merchant_id: string) {
    const [pending, processing, succeeded, failed] = await Promise.all([
      this.prisma.payouts.count({ where: { merchant_id: merchant_id, status: PayoutStatus.PENDING } }),
      this.prisma.payouts.count({ where: { merchant_id: merchant_id, status: PayoutStatus.PROCESSING } }),
      this.prisma.payouts.count({ where: { merchant_id: merchant_id, status: PayoutStatus.SUCCEEDED } }),
      this.prisma.payouts.count({ where: { merchant_id: merchant_id, status: PayoutStatus.FAILED } }),
    ]);

    return { pending, processing, succeeded, failed };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}

