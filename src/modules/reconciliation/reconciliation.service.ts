import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentStatus, PayoutStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/services/notification.service';

export interface ReconciliationResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  merchantId?: string;
  
  payments: {
    total: number;
    matched: number;
    unmatched: number;
    discrepancies: number;
  };
  
  payouts: {
    total: number;
    matched: number;
    pending: number;
    failed: number;
  };
  
  balances: {
    expectedBalance: number;
    actualBalance: number;
    discrepancy: number;
    currency: string;
  }[];
  
  issues: ReconciliationIssue[];
}

export interface ReconciliationIssue {
  type: 'PAYMENT_MISMATCH' | 'PAYOUT_MISMATCH' | 'BALANCE_DISCREPANCY' | 'ORPHAN_TRANSACTION' | 'DUPLICATE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityType: 'PAYMENT' | 'PAYOUT';
  entityId: string;
  description: string;
  expectedValue?: number;
  actualValue?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface DailyReconciliationSummary {
  date: string;
  merchantsProcessed: number;
  totalPayments: number;
  totalPayouts: number;
  totalVolume: number;
  totalCommissions: number;
  issues: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Réconciliation quotidienne automatique (tous les jours à 2h du matin)
   */
  @Cron('0 2 * * *', { timeZone: 'Europe/Paris' })
  async runDailyReconciliation(): Promise<DailyReconciliationSummary> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    this.logger.log(`Starting daily reconciliation for ${yesterday.toISOString().split('T')[0]}`);

    const summary: DailyReconciliationSummary = {
      date: yesterday.toISOString().split('T')[0],
      merchantsProcessed: 0,
      totalPayments: 0,
      totalPayouts: 0,
      totalVolume: 0,
      totalCommissions: 0,
      issues: 0,
      status: 'SUCCESS',
    };

    try {
      // Récupérer tous les merchants actifs
      const merchants = await this.prisma.merchants.findMany({
        where: { 
          transactions: { some: { createdAt: { gte: yesterday, lte: endOfYesterday } } }
        },
        select: { id: true, name: true },
      });

      for (const merchant of merchants) {
        try {
          const result = await this.reconcileMerchant(merchant.id, yesterday, endOfYesterday);
          
          summary.merchantsProcessed++;
          summary.totalPayments += result.payments.total;
          summary.totalPayouts += result.payouts.total;
          summary.issues += result.issues.length;
          
          for (const balance of result.balances) {
            summary.totalVolume += balance.expectedBalance;
          }

          // Notifier en cas de problèmes critiques
          const criticalIssues = result.issues.filter(i => i.severity === 'CRITICAL');
          if (criticalIssues.length > 0) {
            await this.notifyReconciliationIssues(merchant.id, criticalIssues);
          }
        } catch (error) {
          this.logger.error(`Reconciliation failed for merchant ${merchant.id}:`, error);
          summary.status = 'PARTIAL';
        }
      }

      // Sauvegarder le résumé en base
      await this.saveReconciliationSummary(summary);

      this.logger.log(`Daily reconciliation completed: ${summary.merchantsProcessed} merchants, ${summary.issues} issues`);

    } catch (error) {
      this.logger.error('Daily reconciliation failed:', error);
      summary.status = 'FAILED';
    }

    return summary;
  }

  /**
   * Réconcilier un merchant spécifique
   */
  async reconcileMerchant(
    merchant_id: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReconciliationResult> {
    const runId = `recon-${merchant_id}-${Date.now()}`;
    const startedAt = new Date();
    const issues: ReconciliationIssue[] = [];

    // 1. Récupérer tous les paiements de la période
    const payments = await this.prisma.transactions.findMany({
      where: {
        merchant_id: merchant_id,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { transaction_events: true },
    });

    // 2. Récupérer tous les payouts de la période
    const payouts = await this.prisma.payouts.findMany({
      where: {
        merchant_id: merchant_id,
        created_at: { gte: startDate, lte: endDate },
      },
      include: { payout_events: true },
    });

    // 3. Vérifier les paiements
    const paymentStats = await this.reconcilePayments(payments, issues);

    // 4. Vérifier les payouts
    const payoutStats = await this.reconcilePayouts(payouts, issues);

    // 5. Vérifier les balances par devise
    const balances = await this.reconcileBalances(merchant_id, payments, payouts, issues);

    // 6. Détecter les doublons
    await this.detectDuplicates(payments, payouts, issues);

    // 7. Vérifier les transactions orphelines
    await this.detectOrphanTransactions(merchant_id, startDate, endDate, issues);

    const result: ReconciliationResult = {
      runId,
      startedAt,
      completedAt: new Date(),
      merchantId: merchant_id,
      payments: paymentStats,
      payouts: payoutStats,
      balances,
      issues,
    };

    // Sauvegarder le résultat
    await this.saveReconciliationResult(result);

    return result;
  }

  /**
   * Réconcilier les paiements avec les providers
   */
  private async reconcilePayments(
    payments: any[],
    issues: ReconciliationIssue[]
  ): Promise<{ total: number; matched: number; unmatched: number; discrepancies: number }> {
    let matched = 0;
    let unmatched = 0;
    let discrepancies = 0;

    for (const payment of payments) {
      // Vérifier que le paiement a une référence provider
      if (!payment.provider_reference) {
        if (payment.status === PaymentStatus.SUCCEEDED) {
          issues.push({
            type: 'PAYMENT_MISMATCH',
            severity: 'HIGH',
            entityType: 'PAYMENT',
            entityId: payment.id,
            description: 'Payment succeeded without provider reference',
            metadata: { orderId: payment.orderId },
          });
          discrepancies++;
        } else {
          unmatched++;
        }
        continue;
      }

      // Vérifier la cohérence des événements
      const events = payment.events || [];
      const hasSuccessEvent = events.some((e: any) => 
        e.type === 'PAYMENT_SUCCEEDED' || e.type === 'payment.succeeded'
      );

      if (payment.status === PaymentStatus.SUCCEEDED && !hasSuccessEvent) {
        issues.push({
          type: 'PAYMENT_MISMATCH',
          severity: 'MEDIUM',
          entityType: 'PAYMENT',
          entityId: payment.id,
          description: 'Payment marked as succeeded but no success event found',
        });
        discrepancies++;
      }

      matched++;
    }

    return {
      total: payments.length,
      matched,
      unmatched,
      discrepancies,
    };
  }

  /**
   * Réconcilier les payouts
   */
  private async reconcilePayouts(
    payouts: any[],
    issues: ReconciliationIssue[]
  ): Promise<{ total: number; matched: number; pending: number; failed: number }> {
    let matched = 0;
    let pending = 0;
    let failed = 0;

    for (const payout of payouts) {
      switch (payout.status) {
        case PayoutStatus.SUCCEEDED:
          if (!payout.provider_reference) {
            issues.push({
              type: 'PAYOUT_MISMATCH',
              severity: 'HIGH',
              entityType: 'PAYOUT',
              entityId: payout.id,
              description: 'Payout succeeded without provider reference',
            });
          }
          matched++;
          break;
          
        case PayoutStatus.PENDING:
        case PayoutStatus.PROCESSING:
          // Vérifier si le payout est bloqué depuis trop longtemps
          const hoursSinceCreation = (Date.now() - new Date(payout.createdAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceCreation > 24) {
            issues.push({
              type: 'PAYOUT_MISMATCH',
              severity: 'MEDIUM',
              entityType: 'PAYOUT',
              entityId: payout.id,
              description: `Payout stuck in ${payout.status} for ${Math.round(hoursSinceCreation)} hours`,
            });
          }
          pending++;
          break;
          
        case PayoutStatus.FAILED:
          failed++;
          break;
      }
    }

    return { total: payouts.length, matched, pending, failed };
  }

  /**
   * Réconcilier les balances par devise
   */
  private async reconcileBalances(
    merchant_id: string,
    payments: any[],
    payouts: any[],
    issues: ReconciliationIssue[]
  ): Promise<{ expectedBalance: number; actualBalance: number; discrepancy: number; currency: string }[]> {
    const balances: Map<string, { expected: number; actual: number }> = new Map();

    // Calculer le total des paiements réussis par devise
    for (const payment of payments) {
      if (payment.status !== PaymentStatus.SUCCEEDED) continue;
      
      const currency = payment.currency;
      const current = balances.get(currency) || { expected: 0, actual: 0 };
      current.expected += payment.amount_minor;
      balances.set(currency, current);
    }

    // Soustraire les payouts réussis
    for (const payout of payouts) {
      if (payout.status !== PayoutStatus.SUCCEEDED) continue;
      
      const currency = payout.currency;
      const current = balances.get(currency) || { expected: 0, actual: 0 };
      current.expected -= payout.amount_minor;
      balances.set(currency, current);
    }

    // Vérifier les balances stockées
    // Récupérer les balances stockées via raw query (table créée manuellement)
    const storedBalances = await this.prisma.$queryRaw<{ merchant_id: string; currency: string; balance: bigint }[]>`
      SELECT * FROM merchant_balances WHERE merchant_id = ${merchant_id}
    `.catch(() => []);

    const result: { expectedBalance: number; actualBalance: number; discrepancy: number; currency: string }[] = [];

    for (const [currency, balance] of balances) {
      const stored = (storedBalances as any[])?.find((b: any) => b.currency === currency);
      const actualBalance = stored ? Number(stored.balance) : 0;
      const discrepancy = Math.abs(balance.expected - actualBalance);

      result.push({
        expectedBalance: balance.expected,
        actualBalance,
        discrepancy,
        currency,
      });

      // Signaler les écarts significatifs (> 1€ ou 1000 FCFA)
      const threshold = currency === 'XOF' || currency === 'XAF' ? 1000 : 100;
      if (discrepancy > threshold) {
        issues.push({
          type: 'BALANCE_DISCREPANCY',
          severity: discrepancy > threshold * 10 ? 'CRITICAL' : 'HIGH',
          entityType: 'PAYMENT',
          entityId: merchant_id,
          description: `Balance discrepancy of ${discrepancy} ${currency}`,
          expectedValue: balance.expected,
          actualValue: actualBalance,
          currency,
        });
      }
    }

    return result;
  }

  /**
   * Détecter les transactions en double
   */
  private async detectDuplicates(
    payments: any[],
    payouts: any[],
    issues: ReconciliationIssue[]
  ): Promise<void> {
    // Détecter les paiements avec le même orderId
    const orderIds = new Map<string, string[]>();
    for (const payment of payments) {
      const ids = orderIds.get(payment.orderId) || [];
      ids.push(payment.id);
      orderIds.set(payment.orderId, ids);
    }

    for (const [orderId, ids] of orderIds) {
      if (ids.length > 1) {
        issues.push({
          type: 'DUPLICATE',
          severity: 'HIGH',
          entityType: 'PAYMENT',
          entityId: ids[0],
          description: `Duplicate payments for orderId ${orderId}`,
          metadata: { allIds: ids },
        });
      }
    }

    // Détecter les payouts avec la même référence externe
    const externalRefs = new Map<string, string[]>();
    for (const payout of payouts) {
      if (!payout.external_reference) continue;
      const ids = externalRefs.get(payout.external_reference) || [];
      ids.push(payout.id);
      externalRefs.set(payout.external_reference, ids);
    }

    for (const [ref, ids] of externalRefs) {
      if (ids.length > 1) {
        issues.push({
          type: 'DUPLICATE',
          severity: 'HIGH',
          entityType: 'PAYOUT',
          entityId: ids[0],
          description: `Duplicate payouts for external reference ${ref}`,
          metadata: { allIds: ids },
        });
      }
    }
  }

  /**
   * Détecter les transactions orphelines
   */
  private async detectOrphanTransactions(
    merchant_id: string,
    startDate: Date,
    endDate: Date,
    issues: ReconciliationIssue[]
  ): Promise<void> {
    // Chercher les événements de paiement sans paiement correspondant
    const orphanPaymentEvents = await this.prisma.transaction_events.findMany({
      where: {
        occurredAt: { gte: startDate, lte: endDate },
        paymentId: {
          in: (await this.prisma.transactions.findMany({
            where: { merchant_id: merchant_id },
            select: { id: true },
          })).map(p => p.id),
        },
      },
    });

    for (const event of orphanPaymentEvents) {
      const payment = await this.prisma.transactions.findUnique({
        where: { id: event.paymentId },
      });
      if (!payment) {
        issues.push({
          type: 'ORPHAN_TRANSACTION',
          severity: 'MEDIUM',
          entityType: 'PAYMENT',
          entityId: event.id,
          description: 'Payment event without associated payment',
        });
      }
    }
  }

  /**
   * Sauvegarder le résultat de réconciliation
   */
  private async saveReconciliationResult(result: ReconciliationResult): Promise<void> {
    try {
      // Sauvegarder dans une table de logs (à créer si nécessaire)
      await this.prisma.$executeRaw`
        INSERT INTO reconciliation_logs (run_id, merchant_id, started_at, completed_at, result, issues_count)
        VALUES (${result.runId}, ${result.merchantId}, ${result.startedAt}, ${result.completedAt}, ${JSON.stringify(result)}::jsonb, ${result.issues.length})
        ON CONFLICT (run_id) DO UPDATE SET result = ${JSON.stringify(result)}::jsonb
      `.catch(() => {
        // Table n'existe pas encore, logger seulement
        this.logger.debug('Reconciliation logs table not found, skipping save');
      });
    } catch (error) {
      this.logger.warn('Failed to save reconciliation result:', error);
    }
  }

  /**
   * Sauvegarder le résumé quotidien
   */
  private async saveReconciliationSummary(summary: DailyReconciliationSummary): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO reconciliation_summaries (date, merchants_processed, total_payments, total_payouts, total_volume, issues_count, status)
        VALUES (${summary.date}::date, ${summary.merchantsProcessed}, ${summary.totalPayments}, ${summary.totalPayouts}, ${summary.totalVolume}, ${summary.issues}, ${summary.status})
        ON CONFLICT (date) DO UPDATE SET 
          merchants_processed = ${summary.merchantsProcessed},
          total_payments = ${summary.totalPayments},
          total_payouts = ${summary.totalPayouts},
          total_volume = ${summary.totalVolume},
          issues_count = ${summary.issues},
          status = ${summary.status}
      `.catch(() => {
        this.logger.debug('Reconciliation summaries table not found, skipping save');
      });
    } catch (error) {
      this.logger.warn('Failed to save reconciliation summary:', error);
    }
  }

  /**
   * Notifier les problèmes de réconciliation
   */
  private async notifyReconciliationIssues(
    merchant_id: string,
    issues: ReconciliationIssue[]
  ): Promise<void> {
    try {
      // Récupérer les infos du merchant
      const merchant = await this.prisma.merchants.findUnique({
        where: { id: merchant_id },
        include: { users: { take: 1 } },
      });

      if (!merchant) return;

      const issuesSummary = issues
        .map(i => `- ${i.severity}: ${i.description}`)
        .join('\n');

      await this.notificationService.notifySystem({
        merchantId: merchant.id ?? undefined,
        type: 'ALERT',
        message: `Problèmes de réconciliation détectés pour ${merchant.name || 'marchand inconnu'}`,
        details: {
          merchantId: merchant.id,
          merchantName: merchant.name || 'marchand inconnu',
          issuesCount: issues.length,
          issuesSummary,
          date: new Date().toLocaleDateString('fr-FR'),
        },
      });
    } catch (error) {
      this.logger.error('Failed to send reconciliation notification:', error);
    }
  }

  /**
   * Lancer une réconciliation manuelle
   */
  async triggerManualReconciliation(
    merchantId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ReconciliationResult | DailyReconciliationSummary> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

    if (merchantId) {
      return this.reconcileMerchant(merchantId, start, end);
    }

    return this.runDailyReconciliation();
  }

  /**
   * Obtenir l'historique des réconciliations
   */
  async getReconciliationHistory(
    merchantId?: string,
    limit = 30
  ): Promise<any[]> {
    try {
      const where = merchantId ? Prisma.sql`WHERE merchant_id = ${merchantId}` : Prisma.sql``;
      
      const results = await this.prisma.$queryRaw`
        SELECT * FROM reconciliation_logs
        ${where}
        ORDER BY started_at DESC
        LIMIT ${limit}
      `;
      
      return results as any[];
    } catch (error) {
      return [];
    }
  }
}

