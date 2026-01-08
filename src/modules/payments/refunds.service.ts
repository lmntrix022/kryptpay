import { Injectable, Logger, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RefundStatus, PaymentStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotFoundException } from '../../common/exceptions/boohpay.exception';
import { NotificationService } from '../notifications/services/notification.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundResponseDto } from './dto/refund-response.dto';
import { StripeProviderService } from './providers/stripe-provider.service';
import { MonerooProviderService } from './providers/moneroo-provider.service';
import { EbillingProviderService } from './providers/ebilling-provider.service';
import { VatCalculationService } from '../vat/vat-calculation.service';
import type { Gateway } from '@prisma/client';

type RefundWithEvents = Prisma.refundsGetPayload<{
  include: {
    refund_events: {
      orderBy: {
        occurred_at: 'asc';
      };
    };
  };
}>;

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProviderService,
    private readonly monerooProvider: MonerooProviderService,
    private readonly ebillingProvider: EbillingProviderService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => VatCalculationService))
    @Optional()
    private readonly vatCalculationService?: VatCalculationService,
  ) {}

  async createRefund(paymentId: string, merchant_id: string, dto: CreateRefundDto): Promise<RefundResponseDto> {
    // Récupérer le payment
    const payment = await this.prisma.transactions.findFirst({
      where: {
        id: paymentId,
        merchant_id: merchant_id,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found', { paymentId });
    }

    // Vérifier que le payment peut être remboursé
    if (payment.status !== PaymentStatus.SUCCEEDED && payment.status !== PaymentStatus.AUTHORIZED) {
      throw new BadRequestException(
        `Cannot refund payment with status ${payment.status}. Payment must be SUCCEEDED or AUTHORIZED.`,
      );
    }

    if (!payment.providerReference) {
      throw new BadRequestException('Payment does not have a provider reference');
    }

    // Calculer le montant du refund
    const refundAmountMinor = dto.amount ? Math.trunc(dto.amount) : payment.amountMinor;

    // Vérifier que le montant est valide
    if (refundAmountMinor <= 0) {
      throw new BadRequestException('Refund amount must be greater than 0');
    }

    if (refundAmountMinor > payment.amountMinor) {
      throw new BadRequestException(
        `Refund amount (${refundAmountMinor}) cannot exceed payment amount (${payment.amountMinor})`,
      );
    }

    // Vérifier les refunds existants pour éviter les remboursements multiples
    const existingRefunds = await this.prisma.refunds.findMany({
      where: {
        payment_id: paymentId,
        status: {
          in: [RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.SUCCEEDED],
        },
      },
    });

    const totalRefunded = existingRefunds.reduce((sum, refund) => sum + refund.amount_minor, 0);
    const remainingAmount = payment.amountMinor - totalRefunded;

    if (refundAmountMinor > remainingAmount) {
      throw new BadRequestException(
        `Refund amount (${refundAmountMinor}) exceeds remaining refundable amount (${remainingAmount})`,
      );
    }

    // Obtenir le provider pour le refund
    const refundProvider = this.getRefundProvider(payment.gatewayUsed);

    // Créer le refund dans une transaction
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refunds.create({
        data: {
          id: randomUUID(),
          payment_id: payment.id,
          merchant_id: payment.merchant_id,
          amount_minor: refundAmountMinor,
          currency: payment.currency,
          status: RefundStatus.PENDING,
          reason: dto.reason,
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
          updated_at: new Date(),
          refund_events: {
            create: {
              id: randomUUID(),
              type: 'REFUND_INITIATED',
              payload: {
                amount: refundAmountMinor,
                reason: dto.reason,
              },
            },
          },
        },
        include: {
          refund_events: {
            orderBy: {
              occurred_at: 'asc',
            },
          },
        },
      });

      try {
        // Appeler le provider pour créer le refund
        const providerResult = await refundProvider.createRefund({
          paymentId: payment.id,
          paymentProviderReference: payment.providerReference!,
          amountMinor: refundAmountMinor,
          currency: payment.currency,
          reason: dto.reason,
          metadata: dto.metadata,
          merchant_id: payment.merchant_id,
        });

        // Mettre à jour le refund avec le résultat du provider
        const updated = await tx.refunds.update({
          where: { id: refund.id },
          data: {
            provider_reference: providerResult.providerReference,
            status: providerResult.status,
            metadata: {
              ...((dto.metadata as Record<string, unknown>) || {}),
              ...(providerResult.metadata || {}),
            } as Prisma.InputJsonValue,
          },
          include: {
            refund_events: {
              orderBy: {
                occurred_at: 'asc',
              },
            },
          },
        });

        // Ajouter l'événement provider
        await tx.refund_events.create({
          data: {
            id: randomUUID(),
            refund_id: updated.id,
            type: 'REFUND_PROVIDER_RESPONSE',
            payload: {
              providerReference: providerResult.providerReference,
              status: providerResult.status,
            } as Prisma.InputJsonValue,
          },
        });

        // Ajuster la TVA si le remboursement est réussi et que le module TVA est activé
        if (updated.status === RefundStatus.SUCCEEDED && this.vatCalculationService) {
          const isFullRefund = updated.amount_minor === payment.amountMinor;
          this.vatCalculationService
            .adjustVatForRefund(paymentId, BigInt(updated.amount_minor), isFullRefund, updated.id)
            .catch((err: any) => {
              this.logger.error(`Failed to adjust VAT for refund ${updated.id}: ${err.message}`);
            });
        }

        return this.serialize(updated);
      } catch (error) {
        // En cas d'erreur, marquer le refund comme FAILED
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Refund failed for payment ${paymentId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

        const failedRefund = await tx.refunds.update({
          where: { id: refund.id },
          data: {
            status: RefundStatus.FAILED,
            failure_code: errorMessage.substring(0, 255),
          },
          include: {
            refund_events: {
              orderBy: {
                occurred_at: 'asc',
              },
            },
          },
        });

        await tx.refund_events.create({
          data: {
            id: randomUUID(),
            refund_id: failedRefund.id,
            type: 'REFUND_FAILED',
            payload: {
              error: errorMessage,
            } as Prisma.InputJsonValue,
          },
        });

        const serialized = this.serialize(failedRefund);

        // Notifier même en cas d'échec
        this.notifyRefundStatus(serialized, payment.orderId).catch((err) => {
          this.logger.error(`Failed to send refund failure notification: ${err.message}`);
        });

        return serialized;
      }
    });
  }

  private async notifyRefundStatus(
    refundData: {
      refundId: string;
      paymentId: string;
      amountMinor: number;
      currency: string;
      status: string;
      reason?: string;
    },
    orderId?: string,
  ): Promise<void> {
    try {
      await this.notificationService.notifyRefundStatus({
        ...refundData,
        orderId,
      });
    } catch (error) {
      // Logger mais ne pas throw
      this.logger.warn(`Refund notification failed for ${refundData.refundId}`, error);
    }
  }

  async getRefund(refundId: string, merchant_id: string): Promise<RefundResponseDto> {
    const refund = await this.prisma.refunds.findFirst({
      where: {
        id: refundId,
        merchant_id: merchant_id,
      },
      include: {
        refund_events: {
          orderBy: {
            occurred_at: 'asc',
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found', { refundId });
    }

    return this.serialize(refund);
  }

  async listRefunds(
    merchantId?: string,
    filters?: { paymentId?: string; status?: string; limit?: number },
  ) {
    const where: Prisma.refundsWhereInput = {};

    if (merchantId) {
      where.merchant_id = merchantId;
    }

    if (filters) {
      if (filters.paymentId) {
        where.payment_id = filters.paymentId;
      }
      if (filters.status) {
        where.status = filters.status.toUpperCase() as RefundStatus;
      }
    }

    const take = filters?.limit ? Math.min(Math.max(filters.limit, 1), 100) : 50;

    const refunds = await this.prisma.refunds.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take,
      include: {
        refund_events: {
          orderBy: {
            occurred_at: 'asc',
          },
        },
      },
    });

    const totals = refunds.reduce(
      (acc, item) => {
        acc.volumeMinor += item.amount_minor;
        acc.count += 1;

        const statusEntry = acc.byStatus[item.status] ?? { volumeMinor: 0, count: 0 };
        statusEntry.volumeMinor += item.amount_minor;
        statusEntry.count += 1;
        acc.byStatus[item.status] = statusEntry;
        return acc;
      },
      {
        volumeMinor: 0,
        count: 0,
        byStatus: {} as Record<RefundStatus, { volumeMinor: number; count: number }>,
      },
    );

    return {
      items: refunds.map((refund) => this.serialize(refund)),
      metadata: {
        limit: take,
        returned: refunds.length,
      },
      totals: {
        volumeMinor: totals.volumeMinor,
        transactions: totals.count,
        byStatus: totals.byStatus,
      },
    };
  }

  private getRefundProvider(gateway: Gateway) {
    if (gateway === 'STRIPE') {
      return this.stripeProvider;
    }

    if (gateway === 'MONEROO') {
      return this.monerooProvider;
    }

    // eBilling ne supporte pas les refunds directement
    throw new BadRequestException(`Refunds not supported for gateway ${gateway}`);
  }

  private serialize(entity: RefundWithEvents): RefundResponseDto {
    return {
      refundId: entity.id,
      paymentId: entity.payment_id,
      merchantId: entity.merchant_id,
      amountMinor: entity.amount_minor,
      currency: entity.currency,
      status: entity.status,
      reason: entity.reason ?? undefined,
      providerReference: entity.provider_reference ?? undefined,
      failureCode: entity.failure_code ?? undefined,
      metadata: (entity.metadata as Record<string, unknown>) ?? undefined,
      events: (entity.refund_events || []).map((event) => ({
        type: event.type,
        at: event.occurred_at.toISOString(),
        payload: event.payload ?? undefined,
      })),
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
    };
  }
}

