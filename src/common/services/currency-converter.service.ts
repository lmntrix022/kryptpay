import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  inverseRate: number;
  updatedAt: Date;
  source: 'API' | 'FIXED' | 'CACHE';
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  rate: number;
  fees: number;
  netAmount: number;
}

interface CachedRate {
  rate: number;
  inverseRate: number;
  updatedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class CurrencyConverterService {
  private readonly logger = new Logger(CurrencyConverterService.name);
  private ratesCache: Map<string, CachedRate> = new Map();
  
  // Taux fixe CFA (XOF/XAF) - Parité fixe avec l'Euro
  private readonly FIXED_CFA_RATE = 655.957;
  
  // Cache TTL: 1 heure
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;
  
  // Frais de conversion (0.5%)
  private readonly CONVERSION_FEE_PERCENT = 0.5;

  constructor(private readonly configService: ConfigService) {
    this.initializeFixedRates();
  }

  /**
   * Initialiser les taux fixes (CFA)
   */
  private initializeFixedRates() {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_TTL_MS * 24 * 365); // 1 an pour les taux fixes
    
    // EUR ↔ XOF (BCEAO - Afrique de l'Ouest)
    this.ratesCache.set('EUR_XOF', {
      rate: this.FIXED_CFA_RATE,
      inverseRate: 1 / this.FIXED_CFA_RATE,
      updatedAt: now,
      expiresAt,
    });
    
    // EUR ↔ XAF (BEAC - Afrique Centrale)
    this.ratesCache.set('EUR_XAF', {
      rate: this.FIXED_CFA_RATE,
      inverseRate: 1 / this.FIXED_CFA_RATE,
      updatedAt: now,
      expiresAt,
    });

    this.logger.log(`Fixed CFA rates initialized: 1 EUR = ${this.FIXED_CFA_RATE} XOF/XAF`);
  }

  /**
   * Obtenir le taux de change entre deux devises
   */
  async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    
    if (fromUpper === toUpper) {
      return {
        from: fromUpper,
        to: toUpper,
        rate: 1,
        inverseRate: 1,
        updatedAt: new Date(),
        source: 'FIXED',
      };
    }

    // Vérifier le cache
    const cacheKey = `${fromUpper}_${toUpper}`;
    const inverseCacheKey = `${toUpper}_${fromUpper}`;
    
    let cached = this.ratesCache.get(cacheKey);
    let isInverse = false;
    
    if (!cached) {
      cached = this.ratesCache.get(inverseCacheKey);
      isInverse = !!cached;
    }

    if (cached && cached.expiresAt > new Date()) {
      return {
        from: fromUpper,
        to: toUpper,
        rate: isInverse ? cached.inverseRate : cached.rate,
        inverseRate: isInverse ? cached.rate : cached.inverseRate,
        updatedAt: cached.updatedAt,
        source: 'CACHE',
      };
    }

    // Pour les taux CFA, utiliser le taux fixe
    if (this.isCfaCurrency(fromUpper) || this.isCfaCurrency(toUpper)) {
      return this.getFixedCfaRate(fromUpper, toUpper);
    }

    // Sinon, essayer de récupérer depuis une API externe
    try {
      return await this.fetchExternalRate(fromUpper, toUpper);
    } catch (error) {
      this.logger.warn(`Failed to fetch rate ${fromUpper}→${toUpper}, using fallback`);
      return this.getFallbackRate(fromUpper, toUpper);
    }
  }

  /**
   * Convertir un montant d'une devise à une autre
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    options?: { includeFees?: boolean; minorUnits?: boolean }
  ): Promise<ConversionResult> {
    const { includeFees = true, minorUnits = false } = options || {};
    
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    
    // Si minorUnits, le montant est en centimes/FCFA
    const baseAmount = minorUnits ? this.fromMinorUnits(amount, fromCurrency) : amount;
    
    const rawConverted = baseAmount * rate.rate;
    const fees = includeFees ? rawConverted * (this.CONVERSION_FEE_PERCENT / 100) : 0;
    const netAmount = rawConverted - fees;
    
    // Arrondir selon la devise
    const roundedConverted = this.roundForCurrency(rawConverted, toCurrency);
    const roundedNet = this.roundForCurrency(netAmount, toCurrency);
    const roundedFees = this.roundForCurrency(fees, toCurrency);
    
    return {
      originalAmount: baseAmount,
      originalCurrency: fromCurrency.toUpperCase(),
      convertedAmount: roundedConverted,
      targetCurrency: toCurrency.toUpperCase(),
      rate: rate.rate,
      fees: roundedFees,
      netAmount: roundedNet,
    };
  }

  /**
   * Convertir EUR vers XOF (cas le plus courant)
   */
  async eurToXof(amountEur: number, includeFees = true): Promise<ConversionResult> {
    return this.convert(amountEur, 'EUR', 'XOF', { includeFees });
  }

  /**
   * Convertir XOF vers EUR
   */
  async xofToEur(amountXof: number, includeFees = true): Promise<ConversionResult> {
    return this.convert(amountXof, 'XOF', 'EUR', { includeFees });
  }

  /**
   * Convertir des centimes EUR vers FCFA
   */
  async centsToFcfa(amountCents: number): Promise<number> {
    const result = await this.convert(amountCents, 'EUR', 'XOF', { 
      includeFees: false, 
      minorUnits: true 
    });
    return Math.round(result.convertedAmount);
  }

  /**
   * Convertir FCFA vers centimes EUR
   */
  async fcfaToCents(amountFcfa: number): Promise<number> {
    const result = await this.convert(amountFcfa, 'XOF', 'EUR', { 
      includeFees: false, 
      minorUnits: false 
    });
    return Math.round(result.convertedAmount * 100);
  }

  /**
   * Obtenir tous les taux mis en cache
   */
  getCachedRates(): ExchangeRate[] {
    const rates: ExchangeRate[] = [];
    
    for (const [key, cached] of this.ratesCache.entries()) {
      const [from, to] = key.split('_');
      rates.push({
        from,
        to,
        rate: cached.rate,
        inverseRate: cached.inverseRate,
        updatedAt: cached.updatedAt,
        source: this.isCfaCurrency(from) || this.isCfaCurrency(to) ? 'FIXED' : 'CACHE',
      });
    }
    
    return rates;
  }

  /**
   * Rafraîchir les taux depuis les APIs externes (cronjob)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshExternalRates() {
    this.logger.log('Refreshing external exchange rates...');
    
    const pairs = ['USD_EUR', 'GBP_EUR', 'USD_XOF'];
    
    for (const pair of pairs) {
      const [from, to] = pair.split('_');
      try {
        await this.fetchExternalRate(from, to);
      } catch (error) {
        this.logger.warn(`Failed to refresh rate ${pair}`);
      }
    }
  }

  // ============ PRIVATE METHODS ============

  private isCfaCurrency(currency: string): boolean {
    return ['XOF', 'XAF', 'CFA', 'FCFA'].includes(currency.toUpperCase());
  }

  private getFixedCfaRate(from: string, to: string): ExchangeRate {
    const now = new Date();
    
    if (from === 'EUR') {
      return {
        from,
        to,
        rate: this.FIXED_CFA_RATE,
        inverseRate: 1 / this.FIXED_CFA_RATE,
        updatedAt: now,
        source: 'FIXED',
      };
    }
    
    if (to === 'EUR') {
      return {
        from,
        to,
        rate: 1 / this.FIXED_CFA_RATE,
        inverseRate: this.FIXED_CFA_RATE,
        updatedAt: now,
        source: 'FIXED',
      };
    }

    // XOF ↔ XAF: même valeur
    return {
      from,
      to,
      rate: 1,
      inverseRate: 1,
      updatedAt: now,
      source: 'FIXED',
    };
  }

  private async fetchExternalRate(from: string, to: string): Promise<ExchangeRate> {
    const apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');
    
    if (!apiKey) {
      throw new Error('Exchange rate API key not configured');
    }

    // Utiliser ExchangeRate-API ou similaire
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`
    );
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error(`Exchange rate API error: ${data['error-type']}`);
    }

    const now = new Date();
    const rate = data.conversion_rate;
    
    // Mettre en cache
    this.ratesCache.set(`${from}_${to}`, {
      rate,
      inverseRate: 1 / rate,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.CACHE_TTL_MS),
    });

    return {
      from,
      to,
      rate,
      inverseRate: 1 / rate,
      updatedAt: now,
      source: 'API',
    };
  }

  private getFallbackRate(from: string, to: string): ExchangeRate {
    // Taux de fallback approximatifs
    const fallbackRates: Record<string, number> = {
      'USD_EUR': 0.92,
      'EUR_USD': 1.09,
      'GBP_EUR': 1.17,
      'EUR_GBP': 0.85,
    };

    const key = `${from}_${to}`;
    const rate = fallbackRates[key] || 1;

    return {
      from,
      to,
      rate,
      inverseRate: 1 / rate,
      updatedAt: new Date(),
      source: 'FIXED',
    };
  }

  private fromMinorUnits(amount: number, currency: string): number {
    if (this.isCfaCurrency(currency)) {
      return amount; // XOF n'a pas de subdivision
    }
    return amount / 100; // EUR, USD, etc.
  }

  private roundForCurrency(amount: number, currency: string): number {
    if (this.isCfaCurrency(currency)) {
      return Math.round(amount); // Pas de centimes en CFA
    }
    return Math.round(amount * 100) / 100; // 2 décimales
  }
}

