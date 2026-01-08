import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface AdvancedSearchFilters {
  merchant_id: string;
  type: 'payment' | 'payout' | 'refund';
  search?: string;
  status?: string | string[];
  gateway?: string | string[];
  provider?: string | string[];
  currency?: string | string[];
  countryCode?: string | string[];
  amountMin?: number;
  amountMax?: number;
  startDate?: Date;
  endDate?: Date;
  isTestMode?: boolean;
  limit?: number;
  offset?: number;
}

export interface SavedFilterDto {
  name: string;
  type: string;
  filters: Record<string, unknown>;
  isDefault?: boolean;
}

@Injectable()
export class FiltersService {
  private readonly logger = new Logger(FiltersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche avancée multi-critères
   */
  async advancedSearch(filters: AdvancedSearchFilters) {
    const where = this.buildWhereClause(filters);

    switch (filters.type) {
      case 'payment':
        return this.searchPayments(where as Prisma.transactionsWhereInput, filters);
      case 'payout':
        return this.searchPayouts(where as Prisma.payoutsWhereInput, filters);
      case 'refund':
        return this.searchRefunds(where as Prisma.refundsWhereInput, filters);
      default:
        throw new Error(`Unsupported search type: ${filters.type}`);
    }
  }

  /**
   * Recherche dans les paiements
   */
  private async searchPayments(where: Prisma.transactionsWhereInput, filters: AdvancedSearchFilters) {
    const [items, total] = await Promise.all([
      this.prisma.transactions.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          transaction_events: {
            orderBy: { occurredAt: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.transactions.count({ where }),
    ]);

    return { items, total, type: 'payment' };
  }

  /**
   * Recherche dans les payouts
   */
  private async searchPayouts(where: Prisma.payoutsWhereInput, filters: AdvancedSearchFilters) {
    const [items, total] = await Promise.all([
      this.prisma.payouts.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          payout_events: {
            orderBy: { occurred_at: 'asc' },
          },
        },
      }),
      this.prisma.payouts.count({ where }),
    ]);

    return { items, total, type: 'payout' };
  }

  /**
   * Recherche dans les refunds
   */
  private async searchRefunds(where: Prisma.refundsWhereInput, filters: AdvancedSearchFilters) {
    const [items, total] = await Promise.all([
      this.prisma.refunds.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          transactions: true,
          refund_events: {
            orderBy: { occurred_at: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.refunds.count({ where }),
    ]);

    return { items, total, type: 'refund' };
  }

  /**
   * Construire la clause WHERE Prisma
   */
  private buildWhereClause(filters: AdvancedSearchFilters): Prisma.transactionsWhereInput | Prisma.payoutsWhereInput | Prisma.refundsWhereInput {
    const where: any = {
      merchant_id: filters.merchant_id,
    };

    // Recherche textuelle (dans orderId, paymentId, etc.)
    if (filters.search) {
      if (filters.type === 'payment') {
        where.OR = [
          { orderId: { contains: filters.search, mode: 'insensitive' } },
          { id: { contains: filters.search, mode: 'insensitive' } },
          { providerReference: { contains: filters.search, mode: 'insensitive' } },
        ];
      } else if (filters.type === 'payout') {
        where.OR = [
          { externalReference: { contains: filters.search, mode: 'insensitive' } },
          { id: { contains: filters.search, mode: 'insensitive' } },
          { msisdn: { contains: filters.search, mode: 'insensitive' } },
        ];
      } else if (filters.type === 'refund') {
        where.OR = [
          { id: { contains: filters.search, mode: 'insensitive' } },
          { payment: { orderId: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }
    }

    // Filtres par statut
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    // Filtres par gateway (payments uniquement)
    if (filters.gateway && filters.type === 'payment') {
      if (Array.isArray(filters.gateway)) {
        where.gatewayUsed = { in: filters.gateway };
      } else {
        where.gatewayUsed = filters.gateway;
      }
    }

    // Filtres par provider (payouts uniquement)
    if (filters.provider && filters.type === 'payout') {
      if (Array.isArray(filters.provider)) {
        where.provider = { in: filters.provider };
      } else {
        where.provider = filters.provider;
      }
    }

    // Filtres par devise
    if (filters.currency) {
      if (Array.isArray(filters.currency)) {
        where.currency = { in: filters.currency };
      } else {
        where.currency = filters.currency;
      }
    }

    // Filtres par pays (payments uniquement)
    if (filters.countryCode && filters.type === 'payment') {
      if (Array.isArray(filters.countryCode)) {
        where.countryCode = { in: filters.countryCode };
      } else {
        where.countryCode = filters.countryCode;
      }
    }

    // Filtres par montant
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      const amountField = filters.type === 'payment' ? 'amountMinor' : 'amountMinor';
      where[amountField] = {};
      if (filters.amountMin !== undefined) {
        where[amountField].gte = filters.amountMin;
      }
      if (filters.amountMax !== undefined) {
        where[amountField].lte = filters.amountMax;
      }
    }

    // Filtres par date
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Filtre mode test
    if (filters.isTestMode !== undefined) {
      where.isTestMode = filters.isTestMode;
    }

    return where;
  }

  /**
   * Sauvegarder un filtre
   */
  async saveFilter(merchant_id: string, dto: SavedFilterDto) {
    // Si isDefault, désactiver les autres filtres par défaut du même type
    if (dto.isDefault) {
      await this.prisma.saved_filters.updateMany({
        where: {
          merchant_id: merchant_id,
          type: dto.type,
          is_default: true,
        },
        data: { is_default: false },
      });
    }

    return this.prisma.saved_filters.create({
      data: {
        id: randomUUID(),
        merchant_id: merchant_id,
        name: dto.name,
        type: dto.type,
        filters: dto.filters as Prisma.InputJsonValue,
        is_default: dto.isDefault || false,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Lister les filtres sauvegardés
   */
  async listSavedFilters(merchant_id: string, type?: string) {
    const where: any = { merchant_id: merchant_id };
    if (type) {
      where.type = type;
    }

    return this.prisma.saved_filters.findMany({
      where,
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });
  }

  /**
   * Obtenir un filtre sauvegardé
   */
  async getSavedFilter(id: string, merchant_id: string) {
    const filter = await this.prisma.saved_filters.findFirst({
      where: { id, merchant_id: merchant_id },
    });

    if (!filter) {
      throw new NotFoundException(`Filter ${id} not found`);
    }

    return filter;
  }

  /**
   * Mettre à jour un filtre sauvegardé
   */
  async updateSavedFilter(id: string, merchant_id: string, dto: Partial<SavedFilterDto>) {
    const filter = await this.getSavedFilter(id, merchant_id);

    // Si on définit isDefault, désactiver les autres
    if (dto.isDefault === true) {
      await this.prisma.saved_filters.updateMany({
        where: {
          merchant_id: merchant_id,
          type: filter.type,
          is_default: true,
          id: { not: id },
        },
        data: { is_default: false },
      });
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.filters) updateData.filters = dto.filters as Prisma.InputJsonValue;
    if (dto.isDefault !== undefined) updateData.is_default = dto.isDefault;

    return this.prisma.saved_filters.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Supprimer un filtre sauvegardé
   */
  async deleteSavedFilter(id: string, merchant_id: string) {
    await this.getSavedFilter(id, merchant_id);
    return this.prisma.saved_filters.delete({ where: { id } });
  }

  /**
   * Obtenir le filtre par défaut
   */
  async getDefaultFilter(merchant_id: string, type: string) {
    return this.prisma.saved_filters.findFirst({
      where: {
        merchant_id: merchant_id,
        type,
        is_default: true,
      },
    });
  }
}


