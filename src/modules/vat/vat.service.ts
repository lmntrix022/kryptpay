import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VatCalculationService } from './vat-calculation.service';
import { CalculateVatDto } from './dto/calculate-vat.dto';

@Injectable()
export class VatService {
  private readonly logger = new Logger(VatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculationService: VatCalculationService,
  ) {}

  /**
   * Calcule et enregistre la TVA pour un paiement
   */
  async calculateAndStoreVat(dto: CalculateVatDto) {
    return this.calculationService.calculateVat(dto);
  }

  /**
   * Récupère la transaction TVA pour un paiement
   */
  async getVatTransaction(paymentId: string, merchant_id: string) {
    const vatTransaction = await this.prisma.vat_transactions.findUnique({
      where: { payment_id: paymentId },
      include: {
        vat_rates: true,
      },
    });

    if (!vatTransaction || vatTransaction.merchant_id !== merchant_id) {
      return null;
    }

    return vatTransaction;
  }

  /**
   * Liste les transactions TVA pour un marchand
   */
  async listVatTransactions(
    merchant_id: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      countryCode?: string;
      status?: string;
    },
  ) {
    return this.prisma.vat_transactions.findMany({
      where: {
        merchant_id: merchant_id,
        ...(filters?.startDate || filters?.endDate
          ? {
              created_at: {
                ...(filters.startDate ? { gte: filters.startDate } : {}),
                ...(filters.endDate ? { lte: filters.endDate } : {}),
              },
            }
          : {}),
        ...(filters?.countryCode
          ? {
              OR: [
                { buyer_country: filters.countryCode },
                { seller_country: filters.countryCode },
              ],
            }
          : {}),
      },
      include: {
        vat_rates: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 100,
    });
  }
}

