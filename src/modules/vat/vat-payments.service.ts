import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VatAuditService } from './vat-audit.service';
import { VatMonetizationService } from './vat-monetization.service';
import { randomUUID } from 'crypto';

@Injectable()
export class VatPaymentsService {
  private readonly logger = new Logger(VatPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: VatAuditService,
    private readonly monetizationService: VatMonetizationService,
  ) {}

  /**
   * Crée un paiement TVA (reversement)
   * Calcule automatiquement le reversementFee si non fourni
   */
  async createVatPayment(data: {
    reportId?: string;
    merchant_id: string;
    amount: bigint;
    currency: string;
    recipientAccount?: string;
    recipientName?: string;
    reversementFee?: bigint;
  }) {
    // Calculer le fee automatiquement si non fourni
    const reversementFee =
      data.reversementFee !== undefined
        ? data.reversementFee
        : this.monetizationService.calculateReversementFee(data.amount);

    const payment = await this.prisma.vat_payments.create({
      data: {
        id: randomUUID(),
        report_id: data.reportId,
        merchant_id: data.merchant_id,
        amount: data.amount,
        currency: data.currency,
        recipient_account: data.recipientAccount,
        recipient_name: data.recipientName,
        reversement_fee: reversementFee,
        status: 'PENDING',
        updated_at: new Date(),
      },
    });

    await this.auditService.logCalculation({
      action: 'vat_payment_created',
      payload: {
        paymentId: payment.id,
        amount: Number(data.amount),
        reportId: data.reportId,
      },
    });

    return payment;
  }

  /**
   * Exécute un paiement TVA
   */
  async executePayment(paymentId: string, externalPaymentId: string) {
    const payment = await this.prisma.vat_payments.update({
      where: { id: paymentId },
      data: {
        status: 'EXECUTED',
        external_payment_id: externalPaymentId,
        executed_at: new Date(),
      },
    });

    await this.auditService.logCalculation({
      action: 'vat_payment_executed',
      payload: {
        paymentId,
        externalPaymentId,
      },
    });

    // Si le paiement est lié à un rapport, mettre à jour le statut
    if (payment.report_id) {
      await this.prisma.vat_reports.update({
        where: { id: payment.report_id },
        data: { status: 'PAID', paid_at: new Date() },
      });
    }

    return payment;
  }

  /**
   * Liste les paiements TVA d'un marchand
   */
  async listPayments(merchant_id: string, status?: string) {
    return this.prisma.vat_payments.findMany({
      where: {
        merchant_id: merchant_id,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }
}

