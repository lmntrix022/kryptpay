import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateVatReportDto, ReportFormat } from './dto/vat-report.dto';
import { VatAuditService } from './vat-audit.service';

@Injectable()
export class VatReportsService {
  private readonly logger = new Logger(VatReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: VatAuditService,
  ) {}

  /**
   * Génère un rapport TVA pour une période
   */
  async generateReport(merchant_id: string, dto: GenerateVatReportDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    periodEnd.setHours(23, 59, 59, 999); // Fin de journée

    // Agréger les transactions
    const transactions = await this.prisma.vat_transactions.findMany({
      where: {
        merchant_id: merchant_id,
        created_at: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    // Calculer les totaux
    const totalVat = transactions.reduce((sum, t) => sum + t.vat_amount, BigInt(0));
    const totalSales = transactions.reduce((sum, t) => sum + t.amount_gross, BigInt(0));
    const totalNet = transactions.reduce((sum, t) => sum + t.amount_net, BigInt(0));

    // Créer le rapport
    const report = await this.prisma.vat_reports.create({
      data: {
        id: randomUUID(),
        merchant_id: merchant_id,
        period_start: periodStart,
        period_end: periodEnd,
        total_vat: totalVat,
        total_sales: totalSales,
        total_net: totalNet,
        transaction_count: transactions.length,
        status: 'DRAFT',
        metadata: {
          format: dto.format || ReportFormat.CSV,
          includeRefunds: dto.includeRefunds ?? true,
        },
        updated_at: new Date(),
      },
    });

    // Audit log
    await this.auditService.logCalculation({
      reportId: report.id,
      action: 'report_generated',
      payload: {
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        transactionCount: transactions.length,
        totalVat: Number(totalVat),
      },
    });

    this.logger.log(`Generated VAT report ${report.id} for merchant ${merchant_id}`);

    // TODO: Générer le fichier (CSV/XLSX/PDF) et stocker l'URL
    // Pour l'instant, on retourne juste le rapport

    return report;
  }

  /**
   * Récupère un rapport
   */
  async getReport(reportId: string, merchant_id: string) {
    const report = await this.prisma.vat_reports.findFirst({
      where: {
        id: reportId,
        merchant_id: merchant_id,
      },
    });
    
    if (!report) {
      return null;
    }
    
    // Récupérer les paiements liés manuellement
    const payments = await this.prisma.vat_payments.findMany({
      where: { report_id: reportId },
    });
    
    return { ...report, vat_payments: payments };
  }

  /**
   * Liste les rapports d'un marchand
   */
  async listReports(merchant_id: string, limit = 50) {
    return this.prisma.vat_reports.findMany({
      where: { merchant_id: merchant_id },
      orderBy: { period_end: 'desc' },
      take: limit,
    });
  }

  /**
   * Soumet un rapport (change le statut)
   */
  async submitReport(reportId: string, merchant_id: string) {
    const report = await this.getReport(reportId, merchant_id);
    if (!report) {
      throw new Error('Report not found');
    }

    return this.prisma.vat_reports.update({
      where: { id: reportId },
      data: {
        status: 'SUBMITTED',
        submitted_at: new Date(),
      },
    });
  }
}

