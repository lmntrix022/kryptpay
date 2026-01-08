import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus, SubscriptionBillingCycle, PaymentStatus, Prisma } from '@prisma/client';
import { CacheService } from '../../common/services/cache.service';
import { PaginationDto, createPaginatedResponse } from '../../common/dto/pagination.dto';
import { randomUUID } from 'crypto';

export interface CreateSubscriptionDto {
  merchant_id: string;
  customerEmail: string;
  customerPhone?: string;
  amountMinor: number;
  currency: string;
  billingCycle: SubscriptionBillingCycle;
  startDate?: Date;
  metadata?: Record<string, unknown>;
  isTestMode?: boolean;
}

export interface UpdateSubscriptionDto {
  customerEmail?: string;
  customerPhone?: string;
  amountMinor?: number;
  billingCycle?: SubscriptionBillingCycle;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  /**
   * Créer une nouvelle subscription
   */
  async createSubscription(dto: CreateSubscriptionDto) {
    const startDate = dto.startDate || new Date();
    const nextBillingDate = this.calculateNextBillingDate(startDate, dto.billingCycle);

    const subscription = await this.prisma.subscriptions.create({
      data: {
        id: randomUUID(),
        merchant_id: dto.merchant_id,
        customer_email: dto.customerEmail,
        customer_phone: dto.customerPhone,
        amount_minor: dto.amountMinor,
        currency: dto.currency,
        billing_cycle: dto.billingCycle,
        status: SubscriptionStatus.ACTIVE,
        start_date: startDate,
        next_billing_date: nextBillingDate,
        metadata: dto.metadata as Prisma.InputJsonValue,
        is_test_mode: dto.isTestMode || false,
        updated_at: new Date(),
      },
    });

    // Invalider le cache des listes de subscriptions pour ce merchant
    if (this.cacheService) {
      await this.cacheService.deletePattern(`subscriptions:list:${dto.merchant_id}:*`);
      await this.cacheService.deletePattern(`subscriptions:list:all:*`);
    }

    return subscription;
  }

  /**
   * Obtenir une subscription par ID
   */
  async getSubscription(id: string, merchant_id: string) {
    const subscription = await this.prisma.subscriptions.findFirst({
      where: { id, merchant_id: merchant_id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        dunning_attempts: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    return subscription;
  }

  /**
   * Lister les subscriptions
   */
  async listSubscriptions(
    merchant_id: string | undefined,
    filters?: {
      status?: SubscriptionStatus;
      customerEmail?: string;
      limit?: number;
      offset?: number;
    },
    pagination?: PaginationDto,
  ) {
    const where: Prisma.subscriptionsWhereInput = {};
    
    // Si merchant_id est fourni, filtrer par merchant_id (pour les merchants ou admins filtrant)
    if (merchant_id) {
      where.merchant_id = merchant_id;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.customerEmail) {
      where.customer_email = { contains: filters.customerEmail, mode: 'insensitive' };
    }

    // Utiliser la pagination complète si disponible, sinon utiliser l'ancien format pour la compatibilité
    const paginationDto = pagination || new PaginationDto();
    if (filters?.limit && !paginationDto.limit) {
      paginationDto.limit = filters.limit;
    }
    if (filters?.offset !== undefined && paginationDto.offset === undefined) {
      paginationDto.offset = filters.offset;
    }
    const take = paginationDto.getLimit();
    const skip = paginationDto.getOffset();

    // Générer une clé de cache unique basée sur les filtres
    const cacheKey = this.cacheService
      ? CacheService.generateKey(
          'subscriptions:list',
          merchant_id || 'all',
          filters?.status || 'all',
          filters?.customerEmail || 'all',
          paginationDto.page || 1,
          take,
        )
      : null;

    // Essayer de récupérer depuis le cache
    if (this.cacheService && cacheKey) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for subscriptions list: ${cacheKey}`);
        return cached;
      }
    }

    // Exécuter les requêtes en parallèle pour le total et les données
    const [items, total] = await Promise.all([
      this.prisma.subscriptions.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip,
        include: {
          transactions: {
            where: { status: PaymentStatus.SUCCEEDED },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.subscriptions.count({ where }),
    ]);

    // Si pagination complète est demandée, retourner la réponse paginée
    if (pagination) {
      const paginatedResponse = createPaginatedResponse(items, total, paginationDto);

      // Mettre en cache la réponse (TTL de 5 minutes pour les listes)
      if (this.cacheService && cacheKey) {
        await this.cacheService.set(cacheKey, paginatedResponse, CacheService.TTL.MEDIUM);
      }

      return paginatedResponse;
    }

    // Format de réponse rétrocompatible (ancien format)
    const response = { items, total };

    // Mettre en cache la réponse (TTL de 5 minutes pour les listes)
    if (this.cacheService && cacheKey) {
      await this.cacheService.set(cacheKey, response, CacheService.TTL.MEDIUM);
    }

    return response;
  }

  /**
   * Mettre à jour une subscription
   */
  async updateSubscription(id: string, merchant_id: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.getSubscription(id, merchant_id);

    const updateData: Prisma.subscriptionsUpdateInput = {};

    if (dto.customerEmail) {
      updateData.customer_email = dto.customerEmail;
    }

    if (dto.customerPhone !== undefined) {
      updateData.customer_phone = dto.customerPhone;
    }

    if (dto.amountMinor) {
      updateData.amount_minor = dto.amountMinor;
    }

    if (dto.billingCycle) {
      updateData.billing_cycle = dto.billingCycle;
      // Recalculer nextBillingDate si le cycle change
      updateData.next_billing_date = this.calculateNextBillingDate(
        subscription.start_date,
        dto.billingCycle,
      );
    }

    if (dto.metadata) {
      updateData.metadata = dto.metadata as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.subscriptions.update({
      where: { id },
      data: updateData,
    });

    // Invalider le cache des listes de subscriptions pour ce merchant
    if (this.cacheService) {
      await this.cacheService.deletePattern(`subscriptions:list:${merchant_id}:*`);
      await this.cacheService.deletePattern(`subscriptions:list:all:*`);
    }

    return updated;
  }

  /**
   * Mettre en pause une subscription
   */
  async pauseSubscription(id: string, merchant_id: string) {
    const subscription = await this.getSubscription(id, merchant_id);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new Error(`Cannot pause subscription with status ${subscription.status}`);
    }

    const updated = await this.prisma.subscriptions.update({
      where: { id },
      data: { status: SubscriptionStatus.PAUSED },
    });

    // Invalider le cache des listes de subscriptions pour ce merchant
    if (this.cacheService) {
      await this.cacheService.deletePattern(`subscriptions:list:${merchant_id}:*`);
      await this.cacheService.deletePattern(`subscriptions:list:all:*`);
    }

    return updated;
  }

  /**
   * Reprendre une subscription
   */
  async resumeSubscription(id: string, merchant_id: string) {
    const subscription = await this.getSubscription(id, merchant_id);

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new Error(`Cannot resume subscription with status ${subscription.status}`);
    }

    // Recalculer nextBillingDate depuis maintenant
    const nextBillingDate = this.calculateNextBillingDate(new Date(), subscription.billing_cycle);

    const updated = await this.prisma.subscriptions.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        next_billing_date: nextBillingDate,
      },
    });

    // Invalider le cache des listes de subscriptions pour ce merchant
    if (this.cacheService) {
      await this.cacheService.deletePattern(`subscriptions:list:${merchant_id}:*`);
      await this.cacheService.deletePattern(`subscriptions:list:all:*`);
    }

    return updated;
  }

  /**
   * Annuler une subscription
   */
  async cancelSubscription(id: string, merchant_id: string, cancelAt?: Date) {
    const subscription = await this.getSubscription(id, merchant_id);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      return subscription;
    }

    const updated = await this.prisma.subscriptions.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancel_at: cancelAt || new Date(),
        cancelled_at: cancelAt || new Date(),
      },
    });

    // Invalider le cache des listes de subscriptions pour ce merchant
    if (this.cacheService) {
      await this.cacheService.deletePattern(`subscriptions:list:${merchant_id}:*`);
      await this.cacheService.deletePattern(`subscriptions:list:all:*`);
    }

    return updated;
  }

  /**
   * Calculer la prochaine date de facturation
   */
  calculateNextBillingDate(startDate: Date, billingCycle: SubscriptionBillingCycle): Date {
    const next = new Date(startDate);

    switch (billingCycle) {
      case SubscriptionBillingCycle.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case SubscriptionBillingCycle.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case SubscriptionBillingCycle.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case SubscriptionBillingCycle.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case SubscriptionBillingCycle.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  /**
   * Trouver les subscriptions à facturer (nextBillingDate <= maintenant)
   */
  async findSubscriptionsToBill(limit = 100) {
    return this.prisma.subscriptions.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        next_billing_date: { lte: new Date() },
        OR: [{ cancel_at: null }, { cancel_at: { gt: new Date() } }],
      },
      take: limit,
      orderBy: { next_billing_date: 'asc' },
    });
  }

  /**
   * Mettre à jour nextBillingDate après facturation réussie
   */
  async updateNextBillingDate(subscriptionId: string, lastBillingDate: Date) {
    const subscription = await this.prisma.subscriptions.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return;
    }

    const nextBillingDate = this.calculateNextBillingDate(
      lastBillingDate,
      subscription.billing_cycle,
    );

    return this.prisma.subscriptions.update({
      where: { id: subscriptionId },
      data: {
        next_billing_date: nextBillingDate,
        last_billing_date: lastBillingDate,
      },
    });
  }
}


