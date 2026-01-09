import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { ApiKeysService } from '../../auth/api-keys.service';
import { PrismaService } from '../../prisma/prisma.service';

import { CreateMerchantDto } from './dto/create-merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async createMerchant(dto: CreateMerchantDto) {
    const merchantId = randomUUID();
    const data: Prisma.merchantsCreateInput = {
      id: merchantId,
      name: dto.name,
      updated_at: new Date(),
    };

    const merchant = await this.prisma.merchants.create({ data });
    const { apiKey } = await this.apiKeysService.generateApiKey(merchant.id, dto.apiKeyLabel);

    return {
      merchant_id: merchant.id,
      apiKey,
    };
  }

  async issueNewApiKey(merchant_id: string, label?: string) {
    const merchant = await this.prisma.merchants.findUnique({ where: { id: merchant_id } });

    if (!merchant) {
      throw new Error(`Merchant ${merchant_id} not found`);
    }

    return this.apiKeysService.generateApiKey(merchant_id, label);
  }

  async listMerchants() {
    // Utiliser select pour éviter webhook_secret qui n'existe pas encore dans Render
    const merchants = await this.prisma.merchants.findMany({
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        app_commission_rate: true,
        app_commission_fixed: true,
        _count: {
          select: {
            transactions: true,
            payouts: true,
            users: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Pour chaque marchand, calculer les statistiques
    const merchantsWithStats = await Promise.all(
      merchants.map(async (merchant) => {
        const payments = await this.prisma.transactions.findMany({
          where: { merchant_id: merchant.id },
          select: {
            amountMinor: true,
            status: true,
            gatewayUsed: true,
          },
        });

        const payouts = await this.prisma.payouts.findMany({
          where: { merchant_id: merchant.id },
          select: {
            amount_minor: true,
            status: true,
          },
        });

        const paymentsVolume = payments.reduce((sum, p) => sum + Number(p.amountMinor), 0);
        const payoutsVolume = payouts.reduce((sum, p) => sum + Number(p.amount_minor), 0);

        const byGateway = payments.reduce(
          (acc, p) => {
            const gateway = p.gatewayUsed;
            const entry = acc[gateway] ?? { volumeMinor: 0, count: 0 };
            entry.volumeMinor += Number(p.amountMinor);
            entry.count += 1;
            acc[gateway] = entry;
            return acc;
          },
          {} as Record<string, { volumeMinor: number; count: number }>,
        );

        const byStatus = payments.reduce(
          (acc, p) => {
            const status = p.status;
            const entry = acc[status] ?? { volumeMinor: 0, count: 0 };
            entry.volumeMinor += Number(p.amountMinor);
            entry.count += 1;
            acc[status] = entry;
            return acc;
          },
          {} as Record<string, { volumeMinor: number; count: number }>,
        );

        return {
          id: merchant.id,
          name: merchant.name,
          createdAt: merchant.created_at,
          stats: {
            paymentsCount: payments.length,
            payoutsCount: payouts.length,
            paymentsVolumeMinor: paymentsVolume,
            payoutsVolumeMinor: payoutsVolume,
            byGateway,
            byStatus,
            usersCount: merchant._count.users,
          },
        };
      }),
    );

    return merchantsWithStats;
  }
}
