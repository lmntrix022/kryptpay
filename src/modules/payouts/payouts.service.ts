import { Injectable, Logger, NotFoundException, Optional, Inject } from '@nestjs/common';
import { PayoutStatus, PayoutType, PayoutProvider as PayoutProviderEnum, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService, PayoutNotificationData } from '../notifications/services/notification.service';
import { CacheService } from '../../common/services/cache.service';
import { PaginationDto, createPaginatedResponse } from '../../common/dto/pagination.dto';

import { CreatePayoutDto } from './dto/create-payout.dto';
import { PayoutResponseDto } from './dto/payout-response.dto';
import { ShapPayoutProviderService } from './providers/shap-payout-provider.service';
import { MonerooPayoutProviderService } from './providers/moneroo-payout-provider.service';
import { StripePayoutProviderService } from './providers/stripe-payout-provider.service';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shapProvider: ShapPayoutProviderService,
    private readonly monerooProvider: MonerooPayoutProviderService,
    private readonly stripeProvider: StripePayoutProviderService,
    private readonly notificationService: NotificationService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async createPayout(merchant_id: string, dto: CreatePayoutDto, provider?: PayoutProviderEnum): Promise<PayoutResponseDto> {
    const payoutType = dto.payoutType ?? PayoutType.WITHDRAWAL;
    // Déterminer le provider : utilise celui passé en paramètre, ou dto.provider, ou détermine via metadata
    const selectedProvider = provider ?? (dto.provider as PayoutProviderEnum | undefined) ?? this.determineProvider(dto);
    
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payouts.create({
        data: {
          id: randomUUID(),
          merchant_id: merchant_id,
          provider: selectedProvider,
          status: PayoutStatus.PENDING,
          payment_system: dto.paymentSystemName,
          payout_type: payoutType,
          amount_minor: dto.amount,
          currency: dto.currency.toUpperCase(),
          msisdn: dto.payeeMsisdn,
          external_reference: dto.externalReference,
          metadata: this.toJsonValue(dto.metadata),
          updated_at: new Date(),
        },
      });

      await tx.payout_events.create({
        data: {
          id: randomUUID(),
          payout_id: payout.id,
          type: 'PAYOUT_INITIATED',
          payload: {
            amount: dto.amount,
            currency: dto.currency,
            paymentSystem: dto.paymentSystemName,
            payoutType,
            provider: selectedProvider,
          },
        },
      });

      try {
        // Sélectionner le provider approprié
        const providerService = this.getProviderService(selectedProvider);
        
        const providerResult = await providerService.createPayout({ merchant_id, payout, dto });

        const updated = await tx.payouts.update({
          where: { id: payout.id },
          data: {
            status: providerResult.status ?? PayoutStatus.PROCESSING,
            provider_reference: providerResult.providerReference ?? payout.provider_reference,
            metadata: this.toJsonValue(
              this.mergeMetadata(payout.metadata, {
                shap: providerResult.metadata,
              }),
            ),
            payout_events: {
              create: [
                {
                  id: randomUUID(),
                  type: 'PAYOUT_PROVIDER_RESPONSE',
                  payload: (providerResult.rawResponse ??
                    providerResult.metadata ??
                    {}) as Prisma.InputJsonValue,
                },
              ],
            },
          },
          include: {
            payout_events: {
              orderBy: { occurred_at: 'asc' },
            },
          },
        });

        // Envoyer notification de succès/traitement
        this.notifyPayoutStatus(updated, merchant_id).catch((err) => {
          this.logger.error(`Failed to send payout notification: ${err.message}`);
        });

        // Invalider le cache des listes de payouts pour ce merchant
        if (this.cacheService) {
          await this.cacheService.deletePattern(`payouts:list:${merchant_id}:*`);
          await this.cacheService.deletePattern(`payouts:list:all:*`);
          // Invalider le cache analytics
          await this.cacheService.deletePattern(`analytics:payouts:*`);
          await this.cacheService.deletePattern(`analytics:combined:*`);
        }

        return this.toDto(updated);
      } catch (error) {
        this.logger.error(`Failed to execute ${selectedProvider} payout ${payout.id}`, error as Error);

        const failedPayout = await tx.payouts.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.FAILED,
            metadata: this.toJsonValue(
            this.mergeMetadata(payout.metadata, {
              error: this.normalizeError(error),
              failureCode: (error instanceof Error ? error.message : String(error)).substring(0, 255),
            }),
          ),
          payout_events: {
            create: [
              {
                id: randomUUID(),
                type: 'PAYOUT_FAILED',
                payload: this.normalizeError(error) as Prisma.InputJsonValue,
              },
            ],
          },
        },
        include: {
          payout_events: {
            orderBy: { occurred_at: 'asc' },
          },
        },
      });

        // Envoyer notification d'échec
        this.notifyPayoutStatus(failedPayout, merchant_id).catch((err) => {
          this.logger.error(`Failed to send payout failure notification: ${err.message}`);
        });

        // Invalider le cache des listes de payouts pour ce merchant
        if (this.cacheService) {
          await this.cacheService.deletePattern(`payouts:list:${merchant_id}:*`);
          await this.cacheService.deletePattern(`payouts:list:all:*`);
          // Invalider le cache analytics
          await this.cacheService.deletePattern(`analytics:payouts:*`);
          await this.cacheService.deletePattern(`analytics:combined:*`);
        }

        return this.toDto(failedPayout);
      }
    });
  }

  /**
   * Détermine le provider à utiliser basé sur les métadonnées ou la méthode de paiement
   * Par défaut, utilise SHAP pour la compatibilité avec l'existant
   */
  private determineProvider(dto: CreatePayoutDto): PayoutProviderEnum {
    // Si un provider est spécifié dans les métadonnées
    const metadataProvider = dto.metadata?.provider as string | undefined;
    if (metadataProvider && (metadataProvider === 'MONEROO' || metadataProvider === 'SHAP' || metadataProvider === 'STRIPE')) {
      return metadataProvider as PayoutProviderEnum;
    }

    // Par défaut SHAP pour maintenir la compatibilité
    return 'SHAP';
  }

  /**
   * Retourne le service provider approprié
   */
  private getProviderService(provider: PayoutProviderEnum) {
    switch (provider) {
      case 'MONEROO':
        return this.monerooProvider;
      case 'STRIPE':
        return this.stripeProvider;
      case 'SHAP':
      default:
        return this.shapProvider;
    }
  }

  async getPayout(merchant_id: string, payoutId: string): Promise<PayoutResponseDto> {
    const payout = await this.prisma.payouts.findFirst({
      where: {
        id: payoutId,
        merchant_id: merchant_id,
      },
      include: {
        payout_events: {
          orderBy: { occurred_at: 'asc' },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return this.toDto(payout);
  }

  async listPayouts(
    merchantId?: string,
    filters?: { status?: string; provider?: string; limit?: number },
    pagination?: PaginationDto,
  ) {
    try {
      const where: Prisma.payoutsWhereInput = {};

      if (merchantId) {
        where.merchant_id = merchantId;
      }

      if (filters?.status) {
        where.status = filters.status.toUpperCase() as PayoutStatus;
      }

      if (filters?.provider) {
        where.provider = filters.provider.toUpperCase() as PayoutProviderEnum;
      }

      // Utiliser la pagination complète si disponible, sinon utiliser l'ancien format pour la compatibilité
      const paginationDto = pagination || new PaginationDto();
      if (filters?.limit && !paginationDto.limit) {
        paginationDto.limit = filters.limit;
      }
      const take = paginationDto.getLimit();
      const skip = paginationDto.getOffset();

      // Générer une clé de cache unique basée sur les filtres
      const cacheKey = this.cacheService
        ? CacheService.generateKey(
            'payouts:list',
            merchantId || 'all',
            filters?.status || 'all',
            filters?.provider || 'all',
            paginationDto.page || 1,
            take,
          )
        : null;

      // Essayer de récupérer depuis le cache
      if (this.cacheService && cacheKey) {
        const cached = await this.cacheService.get<any>(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for payouts list: ${cacheKey}`);
          return cached;
        }
      }

      // Exécuter les requêtes en parallèle pour le total et les données
      const [payouts, total] = await Promise.all([
        this.prisma.payouts.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take,
          skip,
          include: {
            payout_events: {
              orderBy: { occurred_at: 'asc' },
            },
          },
        }),
        this.prisma.payouts.count({ where }),
      ]);

      // Calculer les totaux (sur les résultats paginés, pour la compatibilité avec l'ancien format)
      const totals = payouts.reduce(
        (acc, item) => {
          acc.volumeMinor += item.amount_minor;
          acc.count += 1;

          const statusKey = item.status as string;
          const statusEntry = acc.byStatus[statusKey] ?? { volumeMinor: 0, count: 0 };
          statusEntry.volumeMinor += item.amount_minor;
          statusEntry.count += 1;
          acc.byStatus[statusKey] = statusEntry;

          const providerKey = item.provider as string;
          const providerEntry = acc.byProvider[providerKey] ?? { volumeMinor: 0, count: 0 };
          providerEntry.volumeMinor += item.amount_minor;
          providerEntry.count += 1;
          acc.byProvider[providerKey] = providerEntry;

          return acc;
        },
        {
          volumeMinor: 0,
          count: 0,
          byStatus: {} as Record<string, { volumeMinor: number; count: number }>,
          byProvider: {} as Record<string, { volumeMinor: number; count: number }>,
        },
      );

      const serializedPayouts = payouts.map((p) => this.toDto(p));

      // Si pagination complète est demandée, retourner la réponse paginée
      if (pagination) {
        const paginatedResponse = {
          ...createPaginatedResponse(serializedPayouts, total, paginationDto),
          totals: {
            volumeMinor: totals.volumeMinor,
            count: totals.count,
            byStatus: totals.byStatus,
            byProvider: totals.byProvider,
          },
        };

        // Mettre en cache la réponse (TTL de 5 minutes pour les listes)
        if (this.cacheService && cacheKey) {
          await this.cacheService.set(cacheKey, paginatedResponse, CacheService.TTL.MEDIUM);
        }

        return paginatedResponse;
      }

      // Format de réponse rétrocompatible (ancien format)
      const response = {
        payouts: serializedPayouts,
        totals: {
          volumeMinor: totals.volumeMinor,
          count: totals.count,
          byStatus: totals.byStatus,
          byProvider: totals.byProvider,
        },
      };

      // Mettre en cache la réponse (TTL de 5 minutes pour les listes)
      if (this.cacheService && cacheKey) {
        await this.cacheService.set(cacheKey, response, CacheService.TTL.MEDIUM);
      }

      return response;
    } catch (error) {
      this.logger.error('Error listing payouts', error as Error);
      throw error;
    }
  }

  async handleShapCallback(payload: ShapPayoutCallbackPayload): Promise<void> {
    const { external_reference: externalReference } = payload;

    if (!externalReference) {
      this.logger.warn('Received SHAP payout callback without external_reference', payload);
      return;
    }

    const payout = await this.prisma.payouts.findFirst({
      where: {
        external_reference: externalReference,
      },
      include: {
        payout_events: {
          orderBy: { occurred_at: 'asc' },
        },
      },
    });

    if (!payout) {
      this.logger.warn(`No payout found for SHAP external reference ${externalReference}`);
      return;
    }

    const status = this.mapStatus(payload.status);

    const eventPayloads: Prisma.payout_eventsCreateWithoutPayoutsInput[] = [
      {
        id: randomUUID(),
        type: 'PAYOUT_CALLBACK',
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    ];

    if (status) {
      eventPayloads.push({
        id: randomUUID(),
        type: `PAYOUT_STATUS_${status}`,
        payload: { shapStatus: payload.status } as Prisma.InputJsonValue,
      });
    }

    await this.prisma.payouts.update({
      where: { id: payout.id },
      data: {
        status: status ?? payout.status,
        provider_reference: payout.provider_reference ?? payload.shap_reference,
        metadata: this.toJsonValue(
          this.mergeMetadata(payout.metadata, {
            shapCallback: payload,
          }),
        ),
        payout_events: {
          create: eventPayloads,
        },
      },
    });
  }

  async handleMonerooCallback(payload: MonerooPayoutCallbackPayload): Promise<void> {
    const data = payload?.data;
    if (!data) {
      this.logger.warn('Received Moneroo payout callback without data', payload);
      return;
    }

    // Récupérer le payout ID depuis les métadonnées
    const payoutId = data.metadata?.boohpay_payout_id as string | undefined;
    const externalReference = data.metadata?.external_reference as string | undefined;

    if (!payoutId && !externalReference) {
      this.logger.warn('Received Moneroo payout callback without payout ID or external reference', payload);
      return;
    }

    // Chercher le payout par ID ou external reference
    const where: Prisma.payoutsWhereInput = {};
    if (payoutId) {
      where.id = payoutId;
    } else if (externalReference) {
      where.external_reference = externalReference;
    }

    const payout = await this.prisma.payouts.findFirst({
      where: {
        ...where,
        provider: 'MONEROO',
      },
      include: {
        payout_events: {
          orderBy: { occurred_at: 'asc' },
        },
      },
    });

    if (!payout) {
      this.logger.warn(`No MONEROO payout found for callback`, { payoutId, externalReference });
      return;
    }

    // Mapper le statut depuis l'événement ou le statut
    const eventType = payload.event?.toLowerCase() ?? '';
    let status: PayoutStatus | undefined;

    if (eventType === 'payout.success') {
      status = PayoutStatus.SUCCEEDED;
    } else if (eventType === 'payout.failed') {
      status = PayoutStatus.FAILED;
    } else if (eventType === 'payout.initiated') {
      status = PayoutStatus.PENDING;
    } else {
      // Fallback sur le statut dans data
      status = this.mapStatus(data.status);
    }

    const eventPayloads: Prisma.payout_eventsCreateWithoutPayoutsInput[] = [
      {
        id: randomUUID(),
        type: 'PAYOUT_CALLBACK',
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    ];

    if (status) {
      eventPayloads.push({
        id: randomUUID(),
        type: `PAYOUT_STATUS_${status}`,
        payload: { monerooStatus: data.status, event: payload.event } as Prisma.InputJsonValue,
      });
    }

    await this.prisma.payouts.update({
      where: { id: payout.id },
      data: {
        status: status ?? payout.status,
        provider_reference: payout.provider_reference ?? data.id,
        metadata: this.toJsonValue(
          this.mergeMetadata(payout.metadata, {
            monerooCallback: payload,
          }),
        ),
        payout_events: {
          create: eventPayloads,
        },
      },
    });
  }

  private mapStatus(status?: string): PayoutStatus | undefined {
    switch ((status ?? '').toLowerCase()) {
      case 'success':
      case 'successful':
        return PayoutStatus.SUCCEEDED;
      case 'pending':
      case 'processing':
        return PayoutStatus.PROCESSING;
      case 'failed':
      case 'error':
        return PayoutStatus.FAILED;
      default:
        return undefined;
    }
  }

  private toDto(
    payout: Prisma.payoutsGetPayload<{
      include: { payout_events: true };
    }>,
  ): PayoutResponseDto {
    return {
      payoutId: payout.id,
      merchantId: payout.merchant_id,
      provider: payout.provider as string,
      status: payout.status,
      amount: payout.amount_minor,
      currency: payout.currency,
      paymentSystem: payout.payment_system,
      payoutType: payout.payout_type,
      msisdn: payout.msisdn,
      providerReference: payout.provider_reference,
      externalReference: payout.external_reference,
      metadata: (payout.metadata as Record<string, unknown> | null) ?? undefined,
      createdAt: payout.created_at.toISOString(),
      updatedAt: payout.updated_at.toISOString(),
      events: (payout.payout_events || []).map((event) => ({
        type: event.type,
        at: event.occurred_at.toISOString(),
      })),
    };
  }

  private mergeMetadata(
    current: Prisma.JsonValue | null,
    addition?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const base: Record<string, unknown> =
      current && typeof current === 'object' && !Array.isArray(current)
        ? { ...(current as Record<string, unknown>) }
        : {};

    if (!addition) {
      return Object.keys(base).length ? base : undefined;
    }

    return { ...base, ...addition };
  }

  private toJsonValue(value?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
    if (!value) {
      return undefined;
    }

    return value as Prisma.JsonObject;
  }

  private normalizeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
      };
    }

    return {
      message: 'Unknown error',
      raw: error,
    };
  }

  /**
   * Notifie le marchand du statut d'un payout
   */
  private async notifyPayoutStatus(
    payout: Prisma.payoutsGetPayload<{ include: { payout_events: true } }>,
    merchant_id: string,
  ): Promise<void> {
    try {
      const notificationData: PayoutNotificationData = {
        payoutId: payout.id,
        merchantId: merchant_id,
        amountMinor: payout.amount_minor,
        currency: payout.currency,
        status: payout.status,
        paymentSystem: payout.payment_system,
        payoutType: payout.payout_type,
        provider: payout.provider,
        failureCode: (payout.metadata as Record<string, unknown>)?.failureCode as string | undefined,
      };

      await this.notificationService.notifyPayoutStatus(notificationData);
    } catch (error) {
      // Log l'erreur mais ne bloque pas le flow principal
      this.logger.warn(`Payout notification failed for ${payout.id}`, error);
    }
  }
}

export type ShapPayoutCallbackPayload = {
  shap_reference?: string;
  external_reference?: string;
  payment_system_name?: string;
  transaction_id?: string;
  amount?: number;
  status?: string;
};

export type MonerooPayoutCallbackPayload = {
  event?: string;
  data?: {
    id?: string;
    status?: string;
    metadata?: Record<string, string | unknown>;
    [key: string]: unknown;
  };
};
