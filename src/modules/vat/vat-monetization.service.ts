import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionPlanType } from '@prisma/client';

@Injectable()
export class VatMonetizationService {
  private readonly logger = new Logger(VatMonetizationService.name);

  // Constantes de prix des plans (en unités mineures - XAF)
  private readonly TAX_PRO_PRICE_MONTHLY = 4000; // 4000 XAF/mois
  private readonly BUSINESS_SUITE_PRICE_MONTHLY = 7000; // 7000 XAF/mois
  private readonly REVERSEMENT_FEE_RATE = 0.01; // 1% du montant TVA reversée
  private readonly REVERSEMENT_FEE_MIN = 300; // 300 XAF minimum

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie si un marchand a un plan TVA actif (TAX_PRO ou BUSINESS_SUITE)
   */
  async hasActiveVatPlan(merchant_id: string): Promise<boolean> {
    const activeSubscription = await this.prisma.subscriptions.findFirst({
      where: {
        merchant_id,
        status: 'ACTIVE',
        plan_type: {
          in: ['TAX_PRO', 'BUSINESS_SUITE'],
        },
      },
    });

    return !!activeSubscription;
  }

  /**
   * Récupère le type de plan TVA actif d'un marchand
   */
  async getActiveVatPlanType(merchant_id: string): Promise<SubscriptionPlanType | null> {
    const activeSubscription = await this.prisma.subscriptions.findFirst({
      where: {
        merchant_id,
        status: 'ACTIVE',
        plan_type: {
          in: ['TAX_PRO', 'BUSINESS_SUITE'],
        },
      },
      select: {
        plan_type: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return activeSubscription?.plan_type || null;
  }

  /**
   * Calcule le boohTaxFee pour une transaction TVA
   * 
   * Conditions :
   * - Si reversement automatique activé : 1% de vatAmount
   * - OU si plan TAX_PRO/BUSINESS_SUITE actif : 1% de vatAmount
   * - Sinon : 0
   */
  async calculateBoohTaxFee(
    merchant_id: string,
    vatAmount: bigint,
    autoReversement: boolean,
  ): Promise<bigint> {
    // Si reversement automatique activé, facturer le fee
    if (autoReversement) {
      const fee = this.calculatePercentageFee(vatAmount, this.REVERSEMENT_FEE_RATE);
      this.logger.debug(
        `Calculated boohTaxFee for merchant ${merchant_id}: ${fee} (1% of ${vatAmount}) - auto reversement`,
      );
      return fee;
    }

    // Si plan TAX_PRO ou BUSINESS_SUITE actif, facturer le fee
    const hasActivePlan = await this.hasActiveVatPlan(merchant_id);
    if (hasActivePlan) {
      const fee = this.calculatePercentageFee(vatAmount, this.REVERSEMENT_FEE_RATE);
      this.logger.debug(
        `Calculated boohTaxFee for merchant ${merchant_id}: ${fee} (1% of ${vatAmount}) - active plan`,
      );
      return fee;
    }

    // Sinon, pas de fee
    return BigInt(0);
  }

  /**
   * Calcule le reversementFee pour un reversement automatique
   * 
   * Formule : 1% du montant TVA reversée, avec un minimum de 300 XAF
   */
  calculateReversementFee(vatAmount: bigint): bigint {
    const fee = this.calculatePercentageFee(vatAmount, this.REVERSEMENT_FEE_RATE);
    const minFee = BigInt(this.REVERSEMENT_FEE_MIN);

    // Retourner le maximum entre le fee calculé et le minimum
    return fee > minFee ? fee : minFee;
  }

  /**
   * Calcule un pourcentage d'un montant (en unités mineures)
   */
  private calculatePercentageFee(amount: bigint, rate: number): bigint {
    // Calculer le fee : amount * rate
    // Utiliser Number pour le calcul, puis reconvertir en BigInt
    const fee = Number(amount) * rate;
    return BigInt(Math.round(fee));
  }

  /**
   * Prix mensuel d'un plan
   */
  getPlanMonthlyPrice(planType: SubscriptionPlanType): number {
    switch (planType) {
      case 'TAX_PRO':
        return this.TAX_PRO_PRICE_MONTHLY;
      case 'BUSINESS_SUITE':
        return this.BUSINESS_SUITE_PRICE_MONTHLY;
      default:
        return 0;
    }
  }

  /**
   * Vérifie si un plan inclut le reversement automatique gratuit
   */
  planIncludesFreeReversement(planType: SubscriptionPlanType | null): boolean {
    // Pour l'instant, aucun plan n'inclut le reversement gratuit
    // Cela pourrait être modifié plus tard pour BUSINESS_SUITE
    return false;
  }
}

