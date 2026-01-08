import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculateVatDto, VatCalculationResponseDto } from './dto/calculate-vat.dto';
import { VatRatesService } from './vat-rates.service';
import { VatAuditService } from './vat-audit.service';
import { VatTaxRulesService, TaxRule } from './vat-tax-rules.service';

export interface VatCalculationResult {
  amountGross: bigint;
  amountNet: bigint;
  vatAmount: bigint;
  vatRate: number;
  vatRateId: string;
  appliedRule: string;
  isB2B: boolean;
}

@Injectable()
export class VatCalculationService {
  private readonly logger = new Logger(VatCalculationService.name);
  private readonly CALCULATION_VERSION = 'v1.0.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly vatRatesService: VatRatesService,
    private readonly vatAuditService: VatAuditService,
    private readonly taxRulesService: VatTaxRulesService,
  ) {}

  /**
   * Calcule la TVA pour une transaction
   * Utilise des entiers pour éviter les problèmes de flottants
   */
  async calculateVat(dto: CalculateVatDto): Promise<VatCalculationResponseDto> {
    this.logger.debug(`Calculating VAT for payment ${dto.paymentId}`);

    // Vérifier l'idempotence
    const existing = await this.prisma.vat_transactions.findUnique({
      where: { payment_id: dto.paymentId },
    });

    if (existing) {
      this.logger.debug(`VAT calculation already exists for payment ${dto.paymentId}, returning existing`);
      return this.mapToResponseDto(existing);
    }

    // Déterminer le régime (B2B vs B2C)
    const isB2B = await this.determineB2B(dto);

    // Déterminer la règle à appliquer avec le nouveau service de règles fiscales
    const taxRuleResult = this.taxRulesService.determineTaxRule(
      dto.sellerCountry,
      dto.buyerCountry || null,
      dto.amount,
      isB2B,
      dto.buyerVatNumber || null,
    );

    const appliedRule = taxRuleResult.rule;

    // Log de la règle appliquée
    this.logger.debug(
      `Tax rule determined: ${appliedRule} - ${taxRuleResult.reason} (amount: ${dto.amount}, B2B: ${isB2B})`,
    );

    // Si pas de TVA (reverse charge B2B ou no_vat), retourner zéro
    if (appliedRule === TaxRule.NO_VAT || (appliedRule === TaxRule.REVERSE_CHARGE && isB2B)) {
      return this.createNoVatResult(dto, appliedRule, taxRuleResult.reason);
    }

    // Trouver le taux de TVA
    const vatRate = await this.vatRatesService.findRate(
      dto.buyerCountry || dto.sellerCountry,
      dto.productCategory || 'default',
      new Date(),
    );

    if (!vatRate) {
      this.logger.warn(`No VAT rate found for country ${dto.buyerCountry || dto.sellerCountry}, category ${dto.productCategory || 'default'}`);
      return this.createNoVatResult(dto);
    }

    // Calculer les montants
    const calculation = this.calculateAmounts(
      BigInt(dto.amount),
      Number(vatRate.rate),
      dto.priceIncludesVat,
    );

    // Créer l'enregistrement
    const vatTransactionId = randomUUID();
    const vatTransaction = await this.prisma.vat_transactions.create({
      data: {
        id: vatTransactionId,
        payment_id: dto.paymentId,
        merchant_id: dto.sellerId,
        buyer_country: dto.buyerCountry,
        seller_country: dto.sellerCountry,
        currency: dto.currency,
        amount_gross: calculation.amountGross,
        amount_net: calculation.amountNet,
        vat_amount: calculation.vatAmount,
        vat_rate_id: vatRate.id,
        vat_calculation_version: this.CALCULATION_VERSION,
        vat_included: dto.priceIncludesVat,
        applied_rule: appliedRule as string,
        buyer_vat_number: dto.buyerVatNumber,
        is_b2b: isB2B,
        updated_at: new Date(),
        product_category: dto.productCategory || 'default',
      },
    });

    // Audit log
    await this.vatAuditService.logCalculation({
      transactionId: vatTransaction.id,
      action: 'calculation',
      payload: {
        paymentId: dto.paymentId,
        calculationVersion: this.CALCULATION_VERSION,
        vatRate: Number(vatRate.rate),
        appliedRule,
        isB2B,
        taxRuleReason: taxRuleResult.reason,
      },
    });

    return this.mapToResponseDto(vatTransaction);
  }

  /**
   * Détermine si la transaction est B2B
   */
  private async determineB2B(dto: CalculateVatDto): Promise<boolean> {
    if (!dto.buyerVatNumber) {
      return false;
    }

    // TODO: Valider le numéro de TVA via VIES ou service équivalent
    // Pour l'instant, on considère que la présence d'un numéro = B2B
    // Dans un vrai système, il faudrait valider le format et l'existence
    return this.isValidVatNumberFormat(dto.buyerVatNumber);
  }

  /**
   * Valide le format d'un numéro de TVA (basique)
   */
  private isValidVatNumberFormat(vatNumber: string): boolean {
    // Format basique : au moins 2 caractères, alphanumériques
    return /^[A-Z0-9]{2,15}$/i.test(vatNumber.trim());
  }

  /**
   * Détermine la règle fiscale à appliquer
   * @deprecated Utiliser VatTaxRulesService.determineTaxRule() à la place
   * Cette méthode est conservée pour compatibilité mais n'est plus utilisée
   */
  private determineTaxRule(dto: CalculateVatDto, isB2B: boolean): string {
    // Cette méthode est maintenant déléguée à VatTaxRulesService
    const result = this.taxRulesService.determineTaxRule(
      dto.sellerCountry,
      dto.buyerCountry || null,
      dto.amount,
      isB2B,
      dto.buyerVatNumber || null,
    );
    return result.rule;
  }

  /**
   * Calcule les montants HT, TTC et TVA
   * Utilise des entiers pour éviter les problèmes de flottants
   */
  private calculateAmounts(
    amountMinor: bigint,
    rate: number,
    priceIncludesVat: boolean,
  ): { amountGross: bigint; amountNet: bigint; vatAmount: bigint } {
    // Convertir le taux en fraction (ex: 0.18 = 18/100)
    // Utiliser une précision de 10000 pour éviter les flottants
    const rateScaled = Math.round(rate * 10000); // 0.18 -> 1800

    if (priceIncludesVat) {
      // Prix TTC : calculer HT puis TVA
      // HT = TTC / (1 + taux)
      // On multiplie par 10000 pour la précision
      const denominator = 10000 + rateScaled; // 1 + taux en scaled
      const netScaled = (amountMinor * BigInt(10000)) / BigInt(denominator);
      const net = this.roundToMinorUnit(netScaled, 10000);
      const vat = amountMinor - net;
      const gross = amountMinor;

      return {
        amountGross: gross,
        amountNet: net,
        vatAmount: vat,
      };
    } else {
      // Prix HT : calculer TVA puis TTC
      const vatScaled = (amountMinor * BigInt(rateScaled)) / BigInt(10000);
      const vat = this.roundToMinorUnit(vatScaled, 1);
      const gross = amountMinor + vat;
      const net = amountMinor;

      return {
        amountGross: gross,
        amountNet: net,
        vatAmount: vat,
      };
    }
  }

  /**
   * Arrondit un montant à l'unité mineure
   * Utilise "bankers rounding" (round half to even)
   */
  private roundToMinorUnit(amount: bigint, scale: number): bigint {
    // Pour bankers rounding, on vérifie le reste
    const remainder = Number(amount % BigInt(scale));
    const half = scale / 2;

    if (remainder < half) {
      return amount / BigInt(scale);
    } else if (remainder > half) {
      return (amount + BigInt(scale)) / BigInt(scale);
    } else {
      // Exactement à la moitié : round to even
      const quotient = amount / BigInt(scale);
      return quotient % BigInt(2) === BigInt(0) ? quotient : quotient + BigInt(1);
    }
  }

  /**
   * Crée un résultat sans TVA
   */
  private createNoVatResult(
    dto: CalculateVatDto,
    rule: TaxRule = TaxRule.NO_VAT,
    reason?: string,
  ): VatCalculationResponseDto {
    return {
      transactionId: '', // Sera créé si nécessaire
      amountGross: dto.amount,
      amountNet: dto.amount,
      vatAmount: 0,
      vatRate: 0,
      vatRateId: '',
      calculationVersion: this.CALCULATION_VERSION,
      appliedRule: rule as string,
      isB2B: false,
    };
  }

  /**
   * Mappe une VatTransaction vers VatCalculationResponseDto
   */
  private mapToResponseDto(vatTransaction: any): VatCalculationResponseDto {
    return {
      transactionId: vatTransaction.id,
      amountGross: Number(vatTransaction.amount_gross),
      amountNet: Number(vatTransaction.amount_net),
      vatAmount: Number(vatTransaction.vat_amount),
      vatRate: vatTransaction.vat_rates ? Number(vatTransaction.vat_rates.rate) : 0,
      vatRateId: vatTransaction.vat_rate_id || '',
      calculationVersion: vatTransaction.vat_calculation_version,
      appliedRule: vatTransaction.applied_rule,
      isB2B: vatTransaction.is_b2b,
    };
  }

  /**
   * Ajuste la TVA pour un remboursement
   */
  async adjustVatForRefund(
    paymentId: string,
    refundAmount: bigint,
    isFullRefund: boolean,
    refundId?: string,
  ): Promise<void> {
    const vatTransaction = await this.prisma.vat_transactions.findUnique({
      where: { payment_id: paymentId },
    });

    if (!vatTransaction) {
      this.logger.warn(`No VAT transaction found for payment ${paymentId}`);
      return;
    }

    // Calculer l'ajustement proportionnel
    const originalAmount = vatTransaction.amount_gross;
    const ratio = Number(refundAmount) / Number(originalAmount);
    const vatAdjustment = BigInt(Math.round(Number(vatTransaction.vat_amount) * ratio));

    // Créer l'ajustement (sera lié au refund lors de sa création)
    if (refundId) {
      await this.prisma.vat_refund_adjustments.create({
        data: {
          id: randomUUID(),
          refund_id: refundId,
          vat_transaction_id: vatTransaction.id,
          adjustment_amount: -vatAdjustment, // Négatif car c'est un remboursement
          adjustment_type: isFullRefund ? 'full_refund' : 'partial_refund',
        },
      });
    } else {
      this.logger.warn(`Cannot create VAT refund adjustment: refundId is required but not provided for payment ${paymentId}`);
    }

    this.logger.debug(`VAT adjusted for refund: ${vatAdjustment} (ratio: ${ratio})`);
  }
}

