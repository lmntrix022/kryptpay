import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService, CreateSubscriptionDto } from '../subscriptions/subscriptions.service';
import { SubscriptionPlanType, SubscriptionBillingCycle, SubscriptionStatus } from '@prisma/client';
import { VatMonetizationService } from './vat-monetization.service';

export interface CreateVatSubscriptionDto {
  merchant_id: string;
  planType: 'TAX_PRO' | 'BUSINESS_SUITE';
  customerEmail: string;
  customerPhone?: string;
  startDate?: Date;
  isTestMode?: boolean;
}

@Injectable()
export class VatSubscriptionService {
  private readonly logger = new Logger(VatSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly monetizationService: VatMonetizationService,
  ) {}

  /**
   * Crée un abonnement TVA (TAX_PRO ou BUSINESS_SUITE)
   */
  async createVatSubscription(dto: CreateVatSubscriptionDto) {
    // Vérifier qu'il n'y a pas déjà un abonnement TVA actif
    const existingActiveSubscription = await this.getActiveVatSubscription(dto.merchant_id);
    if (existingActiveSubscription) {
      throw new ConflictException(
        `Un abonnement TVA actif existe déjà pour ce marchand (plan: ${existingActiveSubscription.plan_type}, statut: ${existingActiveSubscription.status})`,
      );
    }

    // Calculer le montant mensuel selon le plan
    const monthlyPrice = this.monetizationService.getPlanMonthlyPrice(dto.planType);
    
    // Créer l'abonnement via le service de subscriptions existant
    const createDto: CreateSubscriptionDto = {
      merchant_id: dto.merchant_id,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      amountMinor: monthlyPrice,
      currency: 'XAF',
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      startDate: dto.startDate || new Date(),
      metadata: {
        planType: dto.planType,
        subscriptionType: 'vat',
      },
      isTestMode: dto.isTestMode || false,
    };

    const subscription = await this.subscriptionsService.createSubscription(createDto);

    // Mettre à jour le planType dans la subscription
    const updatedSubscription = await this.prisma.subscriptions.update({
      where: { id: subscription.id },
      data: {
        plan_type: dto.planType,
      },
    });

    this.logger.log(
      `Created VAT subscription ${updatedSubscription.id} for merchant ${dto.merchant_id} - Plan: ${dto.planType}, Price: ${monthlyPrice} XAF/month`,
    );

    return updatedSubscription;
  }

  /**
   * Récupère l'abonnement TVA actif d'un marchand
   */
  async getActiveVatSubscription(merchant_id: string) {
    return this.prisma.subscriptions.findFirst({
      where: {
        merchant_id: merchant_id,
        status: SubscriptionStatus.ACTIVE,
        plan_type: {
          in: ['TAX_PRO', 'BUSINESS_SUITE'],
        },
      },
      include: {
        transactions: {
          where: { status: 'SUCCEEDED' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Liste tous les abonnements TVA d'un marchand (actifs et inactifs)
   */
  async listVatSubscriptions(merchant_id: string) {
    return this.prisma.subscriptions.findMany({
      where: {
        merchant_id: merchant_id,
        plan_type: {
          in: ['TAX_PRO', 'BUSINESS_SUITE'],
        },
      },
      include: {
        transactions: {
          where: { status: 'SUCCEEDED' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        dunning_attempts: {
          orderBy: { created_at: 'desc' },
          take: 3,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Annule un abonnement TVA
   */
  async cancelVatSubscription(merchant_id: string, cancelAt?: Date) {
    const activeSubscription = await this.getActiveVatSubscription(merchant_id);
    
    if (!activeSubscription) {
      throw new BadRequestException('Aucun abonnement TVA actif trouvé pour ce marchand');
    }

    return this.subscriptionsService.cancelSubscription(
      activeSubscription.id,
      merchant_id,
      cancelAt,
    );
  }

  /**
   * Met à jour un abonnement TVA (changement de plan)
   */
  async upgradeOrDowngradePlan(
    merchant_id: string,
    newPlanType: 'TAX_PRO' | 'BUSINESS_SUITE',
  ) {
    const activeSubscription = await this.getActiveVatSubscription(merchant_id);

    if (!activeSubscription) {
      throw new BadRequestException('Aucun abonnement TVA actif trouvé pour ce marchand');
    }

    // Si le plan est le même, ne rien faire
    if (activeSubscription.plan_type === newPlanType) {
      return activeSubscription;
    }

    // Calculer le nouveau montant mensuel
    const newMonthlyPrice = this.monetizationService.getPlanMonthlyPrice(newPlanType);

    // Mettre à jour l'abonnement
    const updated = await this.prisma.subscriptions.update({
      where: { id: activeSubscription.id },
      data: {
        plan_type: newPlanType,
        amount_minor: newMonthlyPrice,
        metadata: {
          ...((activeSubscription.metadata as Record<string, unknown>) || {}),
          planType: newPlanType,
          previousPlanType: activeSubscription.plan_type,
          planChangedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Upgraded VAT subscription ${updated.id} for merchant ${merchant_id} from ${activeSubscription.plan_type} to ${newPlanType}`,
    );

    return updated;
  }

  /**
   * Vérifie si un marchand a un abonnement TVA actif
   */
  async hasActiveVatSubscription(merchant_id: string): Promise<boolean> {
    const subscription = await this.getActiveVatSubscription(merchant_id);
    return !!subscription;
  }

  /**
   * Obtient les informations de prix des plans
   */
  getPlanPricing() {
    return {
      TAX_PRO: {
        monthlyPrice: this.monetizationService.getPlanMonthlyPrice('TAX_PRO'),
        currency: 'XAF',
        features: [
          'Calcul automatique de la TVA',
          'Rapports TVA périodiques',
          'Export comptable (CSV, XLSX, PDF)',
          'Dashboard TVA complet',
          'Audit trail complet',
          'Support prioritaire',
        ],
      },
      BUSINESS_SUITE: {
        monthlyPrice: this.monetizationService.getPlanMonthlyPrice('BUSINESS_SUITE'),
        currency: 'XAF',
        features: [
          'Tout ce qui est inclus dans TAX_PRO',
          'Analytics avancés',
          'Payouts accélérés',
          'Priorité support',
          'Accès API premium',
          'Intégrations comptables',
        ],
      },
    };
  }
}

