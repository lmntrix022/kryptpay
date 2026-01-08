import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Response } from 'express';
import { ReportFormat } from './dto/vat-report.dto';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

interface VatReportData {
  report: any;
  transactions: any[];
  merchant: any;
}

@Injectable()
export class VatReportExportService {
  private readonly logger = new Logger(VatReportExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère les données complètes d'un rapport pour l'export
   */
  async getReportData(reportId: string, merchant_id: string): Promise<VatReportData> {
    const report = await this.prisma.vat_reports.findFirst({
      where: {
        id: reportId,
        merchant_id: merchant_id,
      },
    });

    if (!report) {
      throw new NotFoundException(`VAT report ${reportId} not found`);
    }

    // Récupérer les transactions de la période
    const transactions = await this.prisma.vat_transactions.findMany({
      where: {
        merchant_id: merchant_id,
        created_at: {
          gte: report.period_start,
          lte: report.period_end,
        },
      },
      include: {
        vat_rates: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // Récupérer les informations du marchand
    const merchant = await this.prisma.merchants.findUnique({
      where: { id: merchant_id },
      select: { id: true, name: true },
    });

    return {
      report,
      transactions,
      merchant: merchant || { id: merchant_id, name: 'Unknown' },
    };
  }

  /**
   * Exporte un rapport TVA au format CSV
   */
  async exportToCSV(
    reportId: string,
    merchant_id: string,
    res: Response,
  ): Promise<void> {
    const data = await this.getReportData(reportId, merchant_id);
    const csv = this.generateCSV(data);

    const filename = this.generateFilename(data.report, 'csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csv); // BOM UTF-8 pour Excel
  }

  /**
   * Exporte un rapport TVA au format XLSX
   */
  async exportToXLSX(
    reportId: string,
    merchant_id: string,
    res: Response,
  ): Promise<void> {
    const data = await this.getReportData(reportId, merchant_id);
    const workbook = await this.generateXLSX(data);

    const filename = this.generateFilename(data.report, 'xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Exporte un rapport TVA au format PDF
   */
  async exportToPDF(
    reportId: string,
    merchant_id: string,
    res: Response,
  ): Promise<void> {
    const data = await this.getReportData(reportId, merchant_id);

    const filename = this.generateFilename(data.report, 'pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = this.generatePDF(data);
    doc.pipe(res);
    doc.end();
  }

  /**
   * Génère le nom de fichier pour l'export
   */
  private generateFilename(report: any, format: string): string {
    const periodStart = new Date(report.period_start)
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');
    const periodEnd = new Date(report.period_end)
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');
    return `vat-report-${periodStart}-${periodEnd}.${format}`;
  }

  /**
   * Génère le contenu CSV
   */
  private generateCSV(data: VatReportData): string {
    const lines: string[] = [];
    const { report, transactions, merchant } = data;

    // En-tête
    lines.push('RAPPORT TVA - BÖÖHPAY');
    lines.push(`Marchand,${this.escapeCSV(merchant.name || merchant.id)}`);
    lines.push(
      `Période,${this.formatDate(report.period_start)} - ${this.formatDate(report.period_end)}`,
    );
    lines.push(`Date de génération,${this.formatDate(report.generated_at)}`);
    lines.push(`Statut,${report.status}`);
    lines.push('');

    // Résumé
    lines.push('=== RÉSUMÉ ===');
    lines.push('Métrique,Valeur');
    lines.push(`Nombre de transactions,${report.transaction_count}`);
    lines.push(
      `Ventes totales TTC,${this.formatAmount(Number(report.total_sales))}`,
    );
    lines.push(
      `Ventes totales HT,${this.formatAmount(Number(report.total_net))}`,
    );
    lines.push(`TVA totale,${this.formatAmount(Number(report.total_vat))}`);
    lines.push('');

    // Détail des transactions
    if (transactions.length > 0) {
      lines.push('=== DÉTAIL DES TRANSACTIONS ===');
      lines.push(
        'Date,ID Transaction,Pays Vendeur,Pays Acheteur,Devise,Montant TTC,Montant HT,TVA,Taux TVA,Règle,B2B',
      );

      for (const txn of transactions) {
        const date = this.formatDate(txn.created_at);
        const gross = this.formatAmount(Number(txn.amount_gross));
        const net = this.formatAmount(Number(txn.amount_net));
        const vat = this.formatAmount(Number(txn.vat_amount));
        const rate = txn.vat_rates
          ? `${(Number(txn.vat_rates.rate) * 100).toFixed(2)}%`
          : 'N/A';
        const rule = txn.applied_rule || 'N/A';
        const isB2B = txn.is_b2b ? 'Oui' : 'Non';

        lines.push(
          `${date},${txn.payment_id},${txn.seller_country},${txn.buyer_country || 'N/A'},${txn.currency},${gross},${net},${vat},${rate},${rule},${isB2B}`,
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Génère un fichier XLSX
   */
  private async generateXLSX(data: VatReportData): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const { report, transactions, merchant } = data;

    // Feuille 1: Résumé
    const summarySheet = workbook.addWorksheet('Résumé');
    summarySheet.columns = [
      { header: 'Métrique', key: 'metric', width: 30 },
      { header: 'Valeur', key: 'value', width: 30 },
    ];

    summarySheet.addRow({ metric: 'Marchand', value: merchant.name || merchant.id });
    summarySheet.addRow({
      metric: 'Période',
      value: `${this.formatDate(report.period_start)} - ${this.formatDate(report.period_end)}`,
    });
    summarySheet.addRow({
      metric: 'Date de génération',
      value: this.formatDate(report.generated_at),
    });
    summarySheet.addRow({ metric: 'Statut', value: report.status });
    summarySheet.addRow({ metric: '', value: '' });
    summarySheet.addRow({
      metric: 'Nombre de transactions',
      value: report.transaction_count,
    });
    summarySheet.addRow({
      metric: 'Ventes totales TTC',
      value: Number(report.total_sales) / 100,
    });
    summarySheet.addRow({
      metric: 'Ventes totales HT',
      value: Number(report.total_net) / 100,
    });
    summarySheet.addRow({
      metric: 'TVA totale',
      value: Number(report.total_vat) / 100,
    });

    // Style de l'en-tête
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Feuille 2: Transactions
    if (transactions.length > 0) {
      const transactionsSheet = workbook.addWorksheet('Transactions');
      transactionsSheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'ID Transaction', key: 'payment_id', width: 30 },
        { header: 'Pays Vendeur', key: 'seller_country', width: 12 },
        { header: 'Pays Acheteur', key: 'buyer_country', width: 12 },
        { header: 'Devise', key: 'currency', width: 8 },
        { header: 'Montant TTC', key: 'amount_gross', width: 15 },
        { header: 'Montant HT', key: 'amount_net', width: 15 },
        { header: 'TVA', key: 'vat_amount', width: 15 },
        { header: 'Taux TVA', key: 'vat_rate', width: 12 },
        { header: 'Règle', key: 'applied_rule', width: 20 },
        { header: 'B2B', key: 'is_b2b', width: 8 },
      ];

      for (const txn of transactions) {
        transactionsSheet.addRow({
          date: new Date(txn.created_at),
          payment_id: txn.payment_id,
          seller_country: txn.seller_country,
          buyer_country: txn.buyer_country || 'N/A',
          currency: txn.currency,
          amount_gross: Number(txn.amount_gross) / 100,
          amount_net: Number(txn.amount_net) / 100,
          vat_amount: Number(txn.vat_amount) / 100,
          vat_rate: txn.vat_rates
            ? `${(Number(txn.vat_rates.rate) * 100).toFixed(2)}%`
            : 'N/A',
          applied_rule: txn.applied_rule || 'N/A',
          is_b2b: txn.is_b2b ? 'Oui' : 'Non',
        });
      }

      // Style de l'en-tête
      transactionsSheet.getRow(1).font = { bold: true };
      transactionsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Format des montants
      transactionsSheet.getColumn('amount_gross').numFmt = '#,##0.00';
      transactionsSheet.getColumn('amount_net').numFmt = '#,##0.00';
      transactionsSheet.getColumn('vat_amount').numFmt = '#,##0.00';
    }

    return workbook;
  }

  /**
   * Génère un document PDF
   */
  private generatePDF(data: VatReportData): typeof PDFDocument {
    const doc = new (PDFDocument as any)({ margin: 50 });
    const { report, transactions, merchant } = data;

    // En-tête
    doc.fontSize(20).text('RAPPORT TVA - BÖÖHPAY', { align: 'center' });
    doc.moveDown();

    // Informations du marchand
    doc.fontSize(12).text(`Marchand: ${merchant.name || merchant.id}`);
    doc.text(
      `Période: ${this.formatDate(report.period_start)} - ${this.formatDate(report.period_end)}`,
    );
    doc.text(`Date de génération: ${this.formatDate(report.generated_at)}`);
    doc.text(`Statut: ${report.status}`);
    doc.moveDown();

    // Résumé
    doc.fontSize(14).text('RÉSUMÉ', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Nombre de transactions: ${report.transaction_count}`);
    doc.text(
      `Ventes totales TTC: ${this.formatAmount(Number(report.total_sales))}`,
    );
    doc.text(
      `Ventes totales HT: ${this.formatAmount(Number(report.total_net))}`,
    );
    doc.text(`TVA totale: ${this.formatAmount(Number(report.total_vat))}`);
    doc.moveDown();

    // Détail des transactions
    if (transactions.length > 0) {
      doc.fontSize(14).text('DÉTAIL DES TRANSACTIONS', { underline: true });
      doc.moveDown(0.5);

      // Tableau
      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [80, 100, 60, 60, 50, 70, 70, 70, 60, 80, 40];
      const headers = [
        'Date',
        'ID',
        'Vendeur',
        'Acheteur',
        'Devise',
        'TTC',
        'HT',
        'TVA',
        'Taux',
        'Règle',
        'B2B',
      ];

      // En-tête du tableau
      doc.fontSize(8).font('Helvetica-Bold');
      let x = 50;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });

      // Lignes de données
      doc.font('Helvetica').fontSize(7);
      let y = tableTop + rowHeight;
      transactions.slice(0, 30).forEach((txn) => {
        // Limiter à 30 transactions pour éviter les PDF trop longs
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        const row = [
          this.formatDateShort(txn.created_at),
          txn.payment_id.substring(0, 12) + '...',
          txn.seller_country,
          txn.buyer_country || 'N/A',
          txn.currency,
          this.formatAmountShort(Number(txn.amount_gross)),
          this.formatAmountShort(Number(txn.amount_net)),
          this.formatAmountShort(Number(txn.vat_amount)),
          txn.vat_rates
            ? `${(Number(txn.vat_rates.rate) * 100).toFixed(1)}%`
            : 'N/A',
          txn.applied_rule || 'N/A',
          txn.is_b2b ? 'Oui' : 'Non',
        ];

        x = 50;
        row.forEach((cell, i) => {
          doc.text(String(cell), x, y, { width: colWidths[i], align: 'left' });
          x += colWidths[i];
        });

        y += rowHeight;
      });

      if (transactions.length > 30) {
        doc.moveDown();
        doc.fontSize(8).text(
          `... et ${transactions.length - 30} autres transactions`,
        );
      }
    }

    // Pied de page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Page ${i + 1} sur ${pageCount}`,
        50,
        doc.page.height - 30,
        { align: 'center' },
      );
    }

    return doc;
  }

  /**
   * Utilitaires de formatage
   */
  private escapeCSV(value: string | number): string {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private formatDateShort(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      month: '2-digit',
      day: '2-digit',
    });
  }

  private formatAmount(amountMinor: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountMinor / 100);
  }

  private formatAmountShort(amountMinor: number): string {
    const amount = amountMinor / 100;
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  }
}

