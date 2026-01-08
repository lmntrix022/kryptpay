import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class VatRatesService {
  private readonly logger = new Logger(VatRatesService.name);
  private readonly CACHE_TTL = 3600; // 1 heure

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  /**
   * Trouve le taux de TVA pour un pays et une catégorie à une date donnée
   */
  async findRate(
    countryCode: string,
    productCategory: string,
    date: Date = new Date(),
  ) {
    const cacheKey = `vat_rate:${countryCode}:${productCategory}:${date.toISOString().split('T')[0]}`;

    // Vérifier le cache
    if (this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached) as any;
      }
    }

    // Chercher dans la DB
    const rate = await this.prisma.vat_rates.findFirst({
      where: {
        country_code: countryCode.toUpperCase(),
        product_category: productCategory,
        effective_from: { lte: date },
        OR: [
          { effective_to: null },
          { effective_to: { gte: date } },
        ],
      },
      orderBy: {
        effective_from: 'desc',
      },
    });

    // Mettre en cache
    if (rate && this.cacheService) {
      await this.cacheService.set(cacheKey, JSON.stringify(rate), this.CACHE_TTL);
    }

    return rate;
  }

  /**
   * Crée ou met à jour un taux de TVA
   */
  async upsertRate(data: {
    countryCode: string;
    region?: string;
    productCategory: string;
    rate: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }) {
    // Invalider le cache
    if (this.cacheService) {
      const pattern = `vat_rate:${data.countryCode}:${data.productCategory}:*`;
      // Note: Redis pattern matching pour invalidation (si supporté)
    }

    return this.prisma.vat_rates.create({
      data: {
        id: randomUUID(),
        country_code: data.countryCode.toUpperCase(),
        region: data.region,
        product_category: data.productCategory,
        rate: data.rate,
        effective_from: data.effectiveFrom,
        effective_to: data.effectiveTo,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Liste tous les taux pour un pays
   */
  async listRates(countryCode: string) {
    return this.prisma.vat_rates.findMany({
      where: {
        country_code: countryCode.toUpperCase(),
      },
      orderBy: {
        effective_from: 'desc',
      },
    });
  }
}

