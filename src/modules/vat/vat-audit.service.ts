import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

interface AuditLogData {
  transactionId?: string;
  reportId?: string;
  action: string;
  payload?: Record<string, unknown>;
  actorId?: string;
  actorType?: 'user' | 'system' | 'webhook';
}

@Injectable()
export class VatAuditService {
  private readonly logger = new Logger(VatAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre un log d'audit
   */
  async logCalculation(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.vat_audit_logs.create({
        data: {
          id: randomUUID(),
          transaction_id: data.transactionId,
          report_id: data.reportId,
          action: data.action,
          payload: data.payload as any,
          actor_id: data.actorId,
          actor_type: data.actorType || 'system',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error}`, error);
      // Ne pas faire échouer l'opération principale si l'audit échoue
    }
  }

  /**
   * Récupère les logs d'audit pour une transaction
   */
  async getTransactionLogs(transactionId: string) {
    return this.prisma.vat_audit_logs.findMany({
      where: { transaction_id: transactionId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Récupère les logs d'audit pour un rapport
   */
  async getReportLogs(reportId: string) {
    return this.prisma.vat_audit_logs.findMany({
      where: { report_id: reportId },
      orderBy: { created_at: 'desc' },
    });
  }
}

