import { Injectable, Logger } from '@nestjs/common';

/**
 * Régions économiques africaines
 */
export enum EconomicRegion {
  CEMAC = 'CEMAC', // Communauté Économique et Monétaire de l'Afrique Centrale
  UEMOA = 'UEMOA', // Union Économique et Monétaire Ouest-Africaine
  EAC = 'EAC', // East African Community
  SADC = 'SADC', // Southern African Development Community
  EU = 'EU', // Union Européenne
  NONE = 'NONE', // Aucune région
}

/**
 * Règle fiscale applicable
 */
export enum TaxRule {
  DESTINATION_BASED = 'destination_based', // TVA du pays de l'acheteur
  ORIGIN_BASED = 'origin_based', // TVA du pays du vendeur
  REVERSE_CHARGE = 'reverse_charge', // Reverse charge (B2B)
  NO_VAT = 'no_vat', // Pas de TVA
}

/**
 * Configuration d'une règle fiscale
 */
export interface TaxRuleConfig {
  rule: TaxRule;
  threshold?: number; // Seuil en unités mineures (ex: 10000 = 100€)
  requiresVatNumber?: boolean; // Nécessite un numéro de TVA
  description: string;
}

/**
 * Résultat de la détermination de règle fiscale
 */
export interface TaxRuleResult {
  rule: TaxRule;
  reason: string;
  threshold?: number;
  appliedConfig?: TaxRuleConfig;
}

@Injectable()
export class VatTaxRulesService {
  private readonly logger = new Logger(VatTaxRulesService.name);

  /**
   * Mapping des pays vers leurs régions économiques
   */
  private readonly countryToRegion: Record<string, EconomicRegion> = {
    // CEMAC (Communauté Économique et Monétaire de l'Afrique Centrale)
    CM: EconomicRegion.CEMAC, // Cameroun
    CF: EconomicRegion.CEMAC, // République centrafricaine
    TD: EconomicRegion.CEMAC, // Tchad
    CG: EconomicRegion.CEMAC, // Congo
    GA: EconomicRegion.CEMAC, // Gabon
    GQ: EconomicRegion.CEMAC, // Guinée équatoriale

    // UEMOA (Union Économique et Monétaire Ouest-Africaine)
    BJ: EconomicRegion.UEMOA, // Bénin
    BF: EconomicRegion.UEMOA, // Burkina Faso
    CI: EconomicRegion.UEMOA, // Côte d'Ivoire
    GW: EconomicRegion.UEMOA, // Guinée-Bissau
    ML: EconomicRegion.UEMOA, // Mali
    NE: EconomicRegion.UEMOA, // Niger
    SN: EconomicRegion.UEMOA, // Sénégal
    TG: EconomicRegion.UEMOA, // Togo

    // EAC (East African Community)
    KE: EconomicRegion.EAC, // Kenya
    UG: EconomicRegion.EAC, // Ouganda
    TZ: EconomicRegion.EAC, // Tanzanie
    RW: EconomicRegion.EAC, // Rwanda
    BI: EconomicRegion.EAC, // Burundi
    SS: EconomicRegion.EAC, // Soudan du Sud

    // SADC (Southern African Development Community)
    ZA: EconomicRegion.SADC, // Afrique du Sud
    ZW: EconomicRegion.SADC, // Zimbabwe
    BW: EconomicRegion.SADC, // Botswana
    MZ: EconomicRegion.SADC, // Mozambique
    MW: EconomicRegion.SADC, // Malawi
    ZM: EconomicRegion.SADC, // Zambie

    // UE (Union Européenne)
    AT: EconomicRegion.EU, // Autriche
    BE: EconomicRegion.EU, // Belgique
    BG: EconomicRegion.EU, // Bulgarie
    HR: EconomicRegion.EU, // Croatie
    CY: EconomicRegion.EU, // Chypre
    CZ: EconomicRegion.EU, // République tchèque
    DK: EconomicRegion.EU, // Danemark
    EE: EconomicRegion.EU, // Estonie
    FI: EconomicRegion.EU, // Finlande
    FR: EconomicRegion.EU, // France
    DE: EconomicRegion.EU, // Allemagne
    GR: EconomicRegion.EU, // Grèce
    HU: EconomicRegion.EU, // Hongrie
    IE: EconomicRegion.EU, // Irlande
    IT: EconomicRegion.EU, // Italie
    LV: EconomicRegion.EU, // Lettonie
    LT: EconomicRegion.EU, // Lituanie
    LU: EconomicRegion.EU, // Luxembourg
    MT: EconomicRegion.EU, // Malte
    NL: EconomicRegion.EU, // Pays-Bas
    PL: EconomicRegion.EU, // Pologne
    PT: EconomicRegion.EU, // Portugal
    RO: EconomicRegion.EU, // Roumanie
    SK: EconomicRegion.EU, // Slovaquie
    SI: EconomicRegion.EU, // Slovénie
    ES: EconomicRegion.EU, // Espagne
    SE: EconomicRegion.EU, // Suède
  };

  /**
   * Seuils de reverse charge par région (en unités mineures)
   * Exemple: 10000 = 100€ (si devise à 2 décimales)
   */
  private readonly reverseChargeThresholds: Record<EconomicRegion, number> = {
    [EconomicRegion.EU]: 10000, // 100€ pour l'UE
    [EconomicRegion.CEMAC]: 500000, // 5000 XAF pour CEMAC
    [EconomicRegion.UEMOA]: 500000, // 5000 XOF pour UEMOA
    [EconomicRegion.EAC]: 100000, // 1000 KES/UGX/etc pour EAC
    [EconomicRegion.SADC]: 100000, // 1000 ZAR/etc pour SADC
    [EconomicRegion.NONE]: 0, // Pas de seuil
  };

  /**
   * Détermine la région économique d'un pays
   */
  getEconomicRegion(countryCode: string): EconomicRegion {
    const normalized = countryCode.toUpperCase();
    return this.countryToRegion[normalized] || EconomicRegion.NONE;
  }

  /**
   * Vérifie si deux pays sont dans la même région économique
   */
  areInSameRegion(country1: string, country2: string): boolean {
    const region1 = this.getEconomicRegion(country1);
    const region2 = this.getEconomicRegion(country2);

    if (region1 === EconomicRegion.NONE || region2 === EconomicRegion.NONE) {
      return false;
    }

    return region1 === region2;
  }

  /**
   * Détermine la règle fiscale à appliquer selon une matrice pays × pays
   */
  determineTaxRule(
    seller_country: string,
    buyer_country: string | null,
    amountMinor: number,
    isB2B: boolean,
    buyerVatNumber?: string | null,
  ): TaxRuleResult {
    const normalizedSeller = seller_country.toUpperCase();
    const normalizedBuyer = buyer_country?.toUpperCase() || null;

    // Cas 1: Pas de pays acheteur → TVA du vendeur (origin-based)
    if (!normalizedBuyer) {
      return {
        rule: TaxRule.ORIGIN_BASED,
        reason: 'Buyer country not provided, applying origin-based taxation',
      };
    }

    // Cas 2: Même pays → TVA locale (destination-based, mais même pays)
    if (normalizedSeller === normalizedBuyer) {
      return {
        rule: TaxRule.DESTINATION_BASED,
        reason: 'Same country transaction, applying local VAT',
      };
    }

    // Cas 3: B2B avec numéro de TVA → Vérifier reverse charge
    if (isB2B && buyerVatNumber) {
      return this.determineReverseChargeRule(
        normalizedSeller,
        normalizedBuyer,
        amountMinor,
      );
    }

    // Cas 4: B2C ou B2B sans numéro → Destination-based
    return {
      rule: TaxRule.DESTINATION_BASED,
      reason: `Cross-border transaction (${normalizedSeller} → ${normalizedBuyer}), applying destination-based taxation`,
    };
  }

  /**
   * Détermine si le reverse charge s'applique pour une transaction B2B
   */
  private determineReverseChargeRule(
    seller_country: string,
    buyer_country: string,
    amountMinor: number,
  ): TaxRuleResult {
    const sellerRegion = this.getEconomicRegion(seller_country);
    const buyerRegion = this.getEconomicRegion(buyer_country);

    // Cas 1: Même région économique → Reverse charge possible
    if (sellerRegion !== EconomicRegion.NONE && sellerRegion === buyerRegion) {
      const threshold = this.reverseChargeThresholds[sellerRegion];
      const config: TaxRuleConfig = {
        rule: TaxRule.REVERSE_CHARGE,
        threshold,
        requiresVatNumber: true,
        description: `Reverse charge applicable within ${sellerRegion} region`,
      };

      // Vérifier le seuil
      if (threshold > 0 && amountMinor < threshold) {
        return {
          rule: TaxRule.DESTINATION_BASED,
          reason: `Amount (${amountMinor}) below reverse charge threshold (${threshold}) for ${sellerRegion}`,
          threshold,
          appliedConfig: config,
        };
      }

      return {
        rule: TaxRule.REVERSE_CHARGE,
        reason: `Reverse charge applicable: B2B transaction within ${sellerRegion} region, amount above threshold`,
        threshold,
        appliedConfig: config,
      };
    }

    // Cas 2: UE → UE → Reverse charge (règles UE)
    if (sellerRegion === EconomicRegion.EU && buyerRegion === EconomicRegion.EU) {
      const threshold = this.reverseChargeThresholds[EconomicRegion.EU];
      const config: TaxRuleConfig = {
        rule: TaxRule.REVERSE_CHARGE,
        threshold,
        requiresVatNumber: true,
        description: 'EU reverse charge mechanism',
      };

      if (threshold > 0 && amountMinor < threshold) {
        return {
          rule: TaxRule.DESTINATION_BASED,
          reason: `Amount below EU reverse charge threshold (${threshold})`,
          threshold,
          appliedConfig: config,
        };
      }

      return {
        rule: TaxRule.REVERSE_CHARGE,
        reason: 'EU reverse charge: B2B transaction between EU countries',
        threshold,
        appliedConfig: config,
      };
    }

    // Cas 3: CEMAC → CEMAC → Reverse charge possible (selon accords)
    if (sellerRegion === EconomicRegion.CEMAC && buyerRegion === EconomicRegion.CEMAC) {
      const threshold = this.reverseChargeThresholds[EconomicRegion.CEMAC];
      const config: TaxRuleConfig = {
        rule: TaxRule.REVERSE_CHARGE,
        threshold,
        requiresVatNumber: true,
        description: 'CEMAC reverse charge (if applicable per local regulations)',
      };

      if (threshold > 0 && amountMinor < threshold) {
        return {
          rule: TaxRule.DESTINATION_BASED,
          reason: `Amount below CEMAC reverse charge threshold (${threshold})`,
          threshold,
          appliedConfig: config,
        };
      }

      return {
        rule: TaxRule.REVERSE_CHARGE,
        reason: 'CEMAC reverse charge: B2B transaction within CEMAC region',
        threshold,
        appliedConfig: config,
      };
    }

    // Cas 4: UEMOA → UEMOA → Reverse charge possible
    if (sellerRegion === EconomicRegion.UEMOA && buyerRegion === EconomicRegion.UEMOA) {
      const threshold = this.reverseChargeThresholds[EconomicRegion.UEMOA];
      const config: TaxRuleConfig = {
        rule: TaxRule.REVERSE_CHARGE,
        threshold,
        requiresVatNumber: true,
        description: 'UEMOA reverse charge (if applicable per local regulations)',
      };

      if (threshold > 0 && amountMinor < threshold) {
        return {
          rule: TaxRule.DESTINATION_BASED,
          reason: `Amount below UEMOA reverse charge threshold (${threshold})`,
          threshold,
          appliedConfig: config,
        };
      }

      return {
        rule: TaxRule.REVERSE_CHARGE,
        reason: 'UEMOA reverse charge: B2B transaction within UEMOA region',
        threshold,
        appliedConfig: config,
      };
    }

    // Cas 5: Régions différentes → Destination-based (pas de reverse charge)
    return {
      rule: TaxRule.DESTINATION_BASED,
      reason: `Cross-region B2B transaction (${sellerRegion} → ${buyerRegion}), reverse charge not applicable`,
    };
  }

  /**
   * Obtient le seuil de reverse charge pour une région
   */
  getReverseChargeThreshold(region: EconomicRegion): number {
    return this.reverseChargeThresholds[region] || 0;
  }

  /**
   * Liste tous les pays d'une région
   */
  getCountriesInRegion(region: EconomicRegion): string[] {
    return Object.entries(this.countryToRegion)
      .filter(([_, r]) => r === region)
      .map(([country]) => country);
  }

  /**
   * Vérifie si un pays est dans l'UE
   */
  isEUCountry(countryCode: string): boolean {
    return this.getEconomicRegion(countryCode) === EconomicRegion.EU;
  }

  /**
   * Vérifie si un pays est dans CEMAC
   */
  isCEMACCountry(countryCode: string): boolean {
    return this.getEconomicRegion(countryCode) === EconomicRegion.CEMAC;
  }

  /**
   * Vérifie si un pays est dans UEMOA
   */
  isUEMOACountry(countryCode: string): boolean {
    return this.getEconomicRegion(countryCode) === EconomicRegion.UEMOA;
  }
}

