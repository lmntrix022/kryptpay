import { Injectable, Logger, NotFoundException, HttpException, HttpStatus, Inject, forwardRef, Optional } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import type { Gateway } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { GatewaySelector } from '../../shared/gateway/gateway-selector';
import { NotificationService } from '../notifications/services/notification.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { WebhookDeliveryService } from '../webhooks/services/webhook-delivery.service';
import { CacheService } from '../../common/services/cache.service';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../../common/dto/pagination.dto';
import { VatCalculationService } from '../vat/vat-calculation.service';
import { VatMonetizationService } from '../vat/vat-monetization.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentWebhookEvent, PaymentWithEvents } from './payments.types';
import { MonerooProviderService } from './providers/moneroo-provider.service';
import { PaymentProvider } from './providers/payment-provider.interface';
import { StripeProviderService } from './providers/stripe-provider.service';
import { EbillingProviderService } from './providers/ebilling-provider.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly gatewaySelector: GatewaySelector,
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProviderService,
    private readonly monerooProvider: MonerooProviderService,
    private readonly ebillingProvider: EbillingProviderService,
    private readonly notificationService: NotificationService,
    @Optional() private readonly metricsService?: MetricsService,
    @Inject(forwardRef(() => WebhookDeliveryService))
    @Optional()
    private readonly webhookDeliveryService?: WebhookDeliveryService,
    @Optional() private readonly cacheService?: CacheService,
    @Inject(forwardRef(() => VatCalculationService))
    @Optional()
    private readonly vatCalculationService?: VatCalculationService,
    @Inject(forwardRef(() => VatMonetizationService))
    @Optional()
    private readonly vatMonetizationService?: VatMonetizationService,
  ) {}

  /**
   * Frais BoohPay (fixe, non négociable)
   * 1.5% + 1€ (100 centimes)
   */
  private static readonly BOOHPAY_FEE_RATE = 0.015; // 1.5%
  private static readonly BOOHPAY_FEE_FIXED = 100;  // 1€ en centimes

  /**
   * Calcule les frais séparés:
   * - boohpayFee: Frais BoohPay (1.5% + 1€) → pour BoohPay
   * - appCommission: Commission de l'app (variable) → pour l'app (Bööh, etc.)
   * - totalFee: Total des deux
   */
  private calculateFees(
    amountMinor: number,
    appCommissionRate: number = 0,
    appCommissionFixed: number = 0,
  ): { boohpayFee: number; appCommission: number; totalFee: number } {
    // Frais BoohPay: 1.5% + 1€
    const boohpayFee = Math.round(
      amountMinor * PaymentsService.BOOHPAY_FEE_RATE + PaymentsService.BOOHPAY_FEE_FIXED
    );

    // Commission de l'app (ex: Bööh): taux + fixe
    const appCommission = Math.round(
      amountMinor * appCommissionRate + appCommissionFixed
    );

    // Total
    const totalFee = boohpayFee + appCommission;

    return { boohpayFee, appCommission, totalFee };
  }

  /**
   * @deprecated Utiliser calculateFees() à la place
   */
  private calculatePlatformFee(amountMinor: number): number {
    const { totalFee } = this.calculateFees(amountMinor);
    return totalFee;
  }

  async createPayment(dto: CreatePaymentDto, merchant_id: string): Promise<PaymentResponseDto> {
    const startTime = Date.now();
    this.logger.log(`[PERF] Payment creation started for order ${dto.orderId}`);
    
    const gateway = this.gatewaySelector.selectGateway(dto.countryCode, dto.paymentMethod);
    const amountMinor = Math.trunc(dto.amount);

    // Récupérer les paramètres de commission du marchand
    const merchantStart = Date.now();
    const merchant = await this.prisma.merchants.findUnique({
      where: { id: merchant_id },
      select: { app_commission_rate: true, app_commission_fixed: true },
    });
    this.logger.log(`[PERF] Merchant query took ${Date.now() - merchantStart}ms`);

    // L'app peut surcharger la commission via les metadata
    const metadata = dto.metadata as Record<string, unknown> | undefined;
    const appCommissionRate = 
      (metadata?.commission_rate as number) ?? 
      merchant?.app_commission_rate ?? 
      0;
    const appCommissionFixed = 
      (metadata?.commission_fixed as number) ?? 
      merchant?.app_commission_fixed ?? 
      0;

    // Calculer les frais séparés
    const { boohpayFee, appCommission, totalFee } = this.calculateFees(
      amountMinor,
      appCommissionRate,
      appCommissionFixed,
    );

    this.logger.debug(
      `Fees calculated: BoohPay=${boohpayFee}, App=${appCommission}, Total=${totalFee} ` +
      `(rate=${appCommissionRate}, fixed=${appCommissionFixed})`
    );
    
    const paymentId = randomUUID();
    const eventId = randomUUID();
    
    const now = new Date();
    
    // OPTIMISATION: Créer la transaction et appeler le provider en parallèle
    // On crée d'abord la transaction sans les events pour être plus rapide
    const paymentPromise = this.prisma.transactions.create({
      data: {
        id: paymentId,
        merchant_id: merchant_id,
        orderId: dto.orderId,
        amountMinor,
        boohpay_fee: boohpayFee,
        app_commission: appCommission,
        platform_fee: totalFee,
        currency: dto.currency.toUpperCase(),
        countryCode: dto.countryCode.toUpperCase(),
        paymentMethod: dto.paymentMethod,
        gatewayUsed: gateway as Gateway,
        status: PaymentStatus.PENDING,
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
        is_test_mode: (metadata?.isTestMode as boolean) === true,
        updatedAt: now,
      },
    });

    // Créer l'event en arrière-plan (non-bloquant)
    const eventPromise = paymentPromise.then(() =>
      this.prisma.transaction_events.create({
        data: {
          id: eventId,
          paymentId: paymentId,
          type: 'PAYMENT_INITIATED',
          payload: {
            gateway,
            amount: dto.amount,
            boohpayFee,
            appCommission,
          } satisfies Prisma.JsonObject,
          occurredAt: now,
        },
      }).catch((error) => {
        this.logger.warn(`Failed to create payment event: ${error.message}`);
      })
    );

    // Ne pas attendre l'event pour continuer
    const payment = await paymentPromise;

    const provider = this.getProvider(gateway);

    try {
      const providerStart = Date.now();
      this.logger.log(`[PERF] Calling provider.createPayment for ${gateway}`);
      const providerResult = await provider.createPayment({
        dto,
        paymentId: payment.id,
        merchant_id: merchant_id,
      });
      this.logger.log(`[PERF] Provider.createPayment took ${Date.now() - providerStart}ms`);

      const metadataPayload: Record<string, unknown> = {
        ...(dto.metadata ?? {}),
        ...(providerResult.metadata ?? {}),
      };

      // OPTIMISATION: Mettre à jour sans récupérer les events pour être plus rapide
      // Les events seront récupérés plus tard si nécessaire
      await this.prisma.transactions.update({
        where: { id: payment.id },
        data: {
          providerReference: providerResult.providerReference,
          status: providerResult.status,
          checkoutPayload: providerResult.checkoutPayload as Prisma.InputJsonValue,
          metadata:
            Object.keys(metadataPayload).length > 0
              ? (metadataPayload as Prisma.InputJsonValue)
              : undefined,
        },
      });

      // Construire la réponse sans refaire une requête DB
      // OPTIMISATION: Ne pas récupérer les events pour être plus rapide
      const updated = {
        ...payment,
        providerReference: providerResult.providerReference,
        status: providerResult.status,
        checkoutPayload: providerResult.checkoutPayload,
        metadata: metadataPayload,
        transaction_events: [], // Events seront récupérés plus tard si nécessaire
      };

        const serialized = this.serialize(updated as any);

        // Enregistrer les métriques
        if (this.metricsService) {
          this.metricsService.recordPayment(
            updated.gatewayUsed,
            updated.status,
            updated.amountMinor,
            updated.currency,
          );
        }

        // Notifier le marchand (en arrière-plan, ne pas bloquer)
        this.notifyPaymentStatus(
          {
            paymentId: updated.id,
            orderId: updated.orderId,
            amountMinor: updated.amountMinor,
            currency: updated.currency,
            status: updated.status,
            gatewayUsed: updated.gatewayUsed,
          },
          merchant_id,
        ).catch((err) => {
          this.logger.error(`Failed to send payment notification: ${err.message}`);
        });

        // Invalider le cache des listes de paiements pour ce merchant
        if (this.cacheService) {
          await this.cacheService.deletePattern(`payments:list:${merchant_id}:*`);
          await this.cacheService.deletePattern(`payments:list:all:*`);
          // Invalider le cache analytics
          await this.cacheService.deletePattern(`analytics:payments:*`);
          await this.cacheService.deletePattern(`analytics:combined:*`);
        }

        const totalTime = Date.now() - startTime;
        this.logger.log(`[PERF] Total payment creation took ${totalTime}ms for order ${dto.orderId}`);
        return serialized;
      } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Failed to initialize provider payment for payment ${payment.id} (gateway=${gateway})`,
        errorMessage,
        errorStack,
      );
      
      await this.prisma.transactions
        .delete({ where: { id: payment.id } })
        .catch((cleanupError) =>
          this.logger.error(
            'Failed to cleanup payment after provider error',
            cleanupError as Error,
          ),
        );
      
      // Re-throw avec un message plus clair
      if (error instanceof Error) {
        // Si c'est déjà une HttpException, la propager telle quelle
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException(
          `Payment provider error: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Payment provider error: Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPayment(id: string, merchant_id: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.transactions.findUnique({
      where: {
        id_merchant_id: {
          id,
          merchant_id: merchant_id,
        },
      },
      include: {
        transaction_events: {
          orderBy: {
            occurredAt: 'asc',
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return this.serialize(payment);
  }

  async listPayments(
    merchantId?: string,
    filters?: { gateway?: string; status?: string; limit?: number; startDate?: Date; endDate?: Date; isTestMode?: boolean },
    pagination?: PaginationDto,
  ) {
    const where: Prisma.transactionsWhereInput = {};

    if (merchantId) {
      where.merchant_id = merchantId;
    }

    if (filters?.gateway) {
      where.gatewayUsed = filters.gateway.toUpperCase() as Gateway;
    }

    if (filters?.status) {
      where.status = filters.status.toUpperCase() as PaymentStatus;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters?.isTestMode !== undefined) {
      where.is_test_mode = filters.isTestMode;
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
          'payments:list',
          merchantId || 'all',
          filters?.gateway || 'all',
          filters?.status || 'all',
          filters?.isTestMode !== undefined ? String(filters.isTestMode) : 'all',
          filters?.startDate?.toISOString() || 'all',
          filters?.endDate?.toISOString() || 'all',
          paginationDto.page || 1,
          take,
        )
      : null;

    // Essayer de récupérer depuis le cache
    if (this.cacheService && cacheKey) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for payments list: ${cacheKey}`);
        return cached;
      }
    }

    // Exécuter les requêtes en parallèle pour le total et les données
    const [payments, total] = await Promise.all([
      this.prisma.transactions.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          transaction_events: {
            orderBy: {
              occurredAt: 'asc',
            },
          },
        },
      }),
      this.prisma.transactions.count({ where }),
    ]);

    // Calculer les totaux (sur les résultats paginés, pour la compatibilité avec l'ancien format)
    const totals = payments.reduce(
      (acc, item) => {
        acc.volumeMinor += item.amountMinor;
        acc.count += 1;

        const gatewayEntry = acc.byGateway[item.gatewayUsed] ?? { volumeMinor: 0, count: 0 };
        gatewayEntry.volumeMinor += item.amountMinor;
        gatewayEntry.count += 1;
        acc.byGateway[item.gatewayUsed] = gatewayEntry;

        const statusEntry = acc.byStatus[item.status] ?? { volumeMinor: 0, count: 0 };
        statusEntry.volumeMinor += item.amountMinor;
        statusEntry.count += 1;
        acc.byStatus[item.status] = statusEntry;
        return acc;
      },
      {
        volumeMinor: 0,
        count: 0,
        byGateway: {} as Record<Gateway, { volumeMinor: number; count: number }>,
        byStatus: {} as Record<PaymentStatus, { volumeMinor: number; count: number }>,
      },
    );

    const serializedPayments = payments.map((payment) => this.serialize(payment));

    // Si pagination complète est demandée, retourner la réponse paginée
    if (pagination) {
      const paginatedResponse = {
        ...createPaginatedResponse(serializedPayments, total, paginationDto),
        totals: {
          volumeMinor: totals.volumeMinor,
          transactions: totals.count,
          byGateway: totals.byGateway,
          byStatus: totals.byStatus,
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
      items: serializedPayments,
      metadata: {
        limit: take,
        returned: payments.length,
      },
      totals: {
        volumeMinor: totals.volumeMinor,
        transactions: totals.count,
        byGateway: totals.byGateway,
        byStatus: totals.byStatus,
      },
    };

    // Mettre en cache la réponse (TTL de 5 minutes pour les listes)
    if (this.cacheService && cacheKey) {
      await this.cacheService.set(cacheKey, response, CacheService.TTL.MEDIUM);
    }

    return response;
  }

  async applyWebhookEvent(event: PaymentWebhookEvent): Promise<void> {
    const candidateWhere: Prisma.transactionsWhereInput[] = [];
    if (event.paymentId) {
      candidateWhere.push({ id: event.paymentId });
    }
    if (event.orderId) {
      candidateWhere.push({ orderId: event.orderId });
    }
    if (event.providerReference) {
      candidateWhere.push({ providerReference: event.providerReference });
    }
    if (candidateWhere.length === 0) {
      this.logger.warn(
        `Received webhook without identifiers. provider=${event.provider} type=${event.type}`,
      );
      return;
    }

    const payment = await this.prisma.transactions.findFirst({
      where: { OR: candidateWhere },
    });

    if (!payment) {
      this.logger.warn(
        `Received webhook for unknown payment. provider=${event.provider} type=${event.type}`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction_events.create({
        data: {
          id: randomUUID(),
          paymentId: payment.id,
          type: event.type,
          providerEventId: event.providerEventId,
          payload: event.rawPayload as Prisma.InputJsonValue,
        },
      });

      if (event.status && event.status !== payment.status) {
        // Calculer le platformFee si le paiement passe à SUCCEEDED et qu'il n'est pas encore calculé
        const updateData: Prisma.transactionsUpdateInput = { status: event.status };
        if (event.status === PaymentStatus.SUCCEEDED && payment.platform_fee === 0) {
          updateData.platform_fee = this.calculatePlatformFee(payment.amountMinor);
        }
        
        await tx.transactions.update({
          where: { id: payment.id },
          data: updateData,
        });

        // Enregistrer les métriques
        if (this.metricsService) {
          this.metricsService.recordPayment(
            payment.gatewayUsed,
            event.status,
            payment.amountMinor,
            payment.currency,
          );
        }

        // Notifier le marchand si le statut change (en arrière-plan)
        this.notifyPaymentStatus(
          {
            paymentId: payment.id,
            orderId: payment.orderId,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            status: event.status,
            gatewayUsed: payment.gatewayUsed,
          },
          payment.merchant_id,
        ).catch((err: any) => {
          this.logger.error(`Failed to send payment status notification: ${err.message}`);
        });

                    // Invalider le cache des listes de paiements pour ce merchant
            if (this.cacheService) {
              await this.cacheService.deletePattern(`payments:list:${payment.merchant_id}:*`);
              await this.cacheService.deletePattern(`payments:list:all:*`);
              // Invalider le cache analytics
              await this.cacheService.deletePattern(`analytics:payments:*`);
              await this.cacheService.deletePattern(`analytics:combined:*`);
            }

        // Envoyer webhook au marchand si configuré
        if (this.webhookDeliveryService) {
          this.webhookDeliveryService
            .queueWebhookDelivery(payment.merchant_id, `payment.${event.status.toLowerCase()}`, {
              paymentId: payment.id,
              orderId: payment.orderId,
              status: event.status,
              amount: payment.amountMinor,
              currency: payment.currency,
              gateway: payment.gatewayUsed,
              timestamp: new Date().toISOString(),
            })
            .catch((err: any) => {
              this.logger.error(`Failed to queue webhook delivery: ${err.message}`);
            });
        }

        // Calculer TVA si le paiement est réussi et que le module TVA est activé
        if (event.status === PaymentStatus.SUCCEEDED && this.vatCalculationService) {
          this.calculateVatForPayment(payment).catch((err: any) => {
            this.logger.error(`Failed to calculate VAT for payment ${payment.id}: ${err.message}`);
          });
        }
      }
    });
  }

  /**
   * Calcule la TVA pour un paiement réussi
   */
  private async calculateVatForPayment(payment: any): Promise<void> {
    try {
      // Vérifier si le marchand a activé la TVA
      const vatSettings = await this.prisma.merchant_vat_settings.findUnique({
        where: { merchant_id: payment.merchant_id },
      });

      if (!vatSettings?.enabled) {
        this.logger.debug(`VAT not enabled for merchant ${payment.merchant_id}`);
        return;
      }

      // Extraire les métadonnées
      const metadata = payment.metadata as Record<string, unknown> | undefined;

      // Préparer les données pour le calcul TVA
      const calculateDto = {
        idempotencyKey: payment.id, // Utiliser payment.id comme clé d'idempotence
        paymentId: payment.id,
        sellerId: payment.merchant_id,
        sellerCountry: vatSettings.seller_country,
        buyerCountry: (metadata?.buyer_country as string) || payment.countryCode,
        currency: payment.currency,
        amount: payment.amountMinor,
        priceIncludesVat: (metadata?.priceIncludesVat as boolean) ?? true, // Par défaut TTC
        productCategory: (metadata?.productCategory as string) || 'default',
        buyerVatNumber: (metadata?.buyerVatNumber as string) || undefined,
      };

      // Calculer la TVA
      const vatResult = await this.vatCalculationService!.calculateVat(calculateDto);
      this.logger.debug(`VAT calculated for payment ${payment.id}`);

      // Calculer et stocker boohTaxFee si le service de monétisation est disponible
      if (this.vatMonetizationService && vatResult.vatAmount > 0) {
        try {
          const boohTaxFee = await this.vatMonetizationService.calculateBoohTaxFee(
            payment.merchant_id,
            BigInt(vatResult.vatAmount),
            vatSettings.auto_reversement || false,
          );

          // Mettre à jour le paiement avec boohTaxFee
          if (boohTaxFee > 0) {
            await this.prisma.transactions.update({
              where: { id: payment.id },
              data: { booh_tax_fee: boohTaxFee },
            });
            this.logger.debug(`boohTaxFee calculated and stored: ${boohTaxFee} for payment ${payment.id}`);
          }
        } catch (feeError: any) {
          // Ne pas faire échouer le paiement si le calcul de fee échoue
          this.logger.error(
            `Error calculating boohTaxFee for payment ${payment.id}: ${feeError.message}`,
            feeError.stack,
          );
        }
      }
    } catch (error: any) {
      // Ne pas faire échouer le paiement si le calcul TVA échoue
      this.logger.error(`Error calculating VAT for payment ${payment.id}: ${error.message}`, error.stack);
    }
  }

  private async notifyPaymentStatus(
    paymentData: {
      paymentId: string;
      orderId: string;
      amountMinor: number;
      currency: string;
      status: string;
      gatewayUsed: string;
    },
    merchant_id: string,
  ): Promise<void> {
    try {
      await this.notificationService.notifyPaymentStatus({
        paymentId: paymentData.paymentId,
        orderId: paymentData.orderId,
        amountMinor: paymentData.amountMinor,
        currency: paymentData.currency,
        status: paymentData.status,
        gatewayUsed: paymentData.gatewayUsed,
        merchantId: merchant_id,
      });
    } catch (error) {
      // Logger mais ne pas throw pour ne pas bloquer le flow
      this.logger.warn(`Payment notification failed for ${paymentData.paymentId}`, error);
    }
  }

  private getProvider(gateway: Gateway): PaymentProvider {
    if (gateway === 'STRIPE') {
      return this.stripeProvider;
    }

    if (gateway === 'EBILLING') {
      return this.ebillingProvider;
    }

    return this.monerooProvider;
  }

  private serialize(entity: PaymentWithEvents): PaymentResponseDto & { subscriptionId?: string | null; isTestMode?: boolean } {
    return {
      paymentId: entity.id,
      merchantId: entity.merchant_id,
      orderId: entity.orderId,
      gatewayUsed: entity.gatewayUsed,
      status: entity.status,
      amount: entity.amountMinor,
      currency: entity.currency,
      providerReference: entity.providerReference ?? undefined,
      subscriptionId: entity.subscription_id ?? undefined,
      isTestMode: entity.is_test_mode,
      checkout: entity.checkoutPayload as unknown as PaymentResponseDto['checkout'],
      metadata: (entity.metadata ?? undefined) as Record<string, unknown> | undefined,
      events: (entity.transaction_events || []).map((event: any) => ({
        type: event.type,
        at: event.occurredAt.toISOString(),
        providerEventId: event.providerEventId ?? undefined,
      })),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
