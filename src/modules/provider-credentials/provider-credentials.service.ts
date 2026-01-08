import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';

type Provider = 'STRIPE' | 'MONEROO' | 'EBILLING' | 'SHAP';

@Injectable()
export class ProviderCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async setCredentials<T extends Record<string, unknown>>(
    merchant_id: string,
    provider: Provider,
    environment: string,
    payload: T,
  ): Promise<void> {
    const existing = await this.getCredentials<Record<string, unknown>>(
      merchant_id,
      provider,
      environment,
    );

    const merged = {
      ...(existing ?? {}),
      ...payload,
    };

    const encryptedData = this.encryptionService.encrypt(merged);

    await this.prisma.provider_credentials.upsert({
      where: {
        merchant_id_provider_environment: {
          merchant_id: merchant_id,
          provider,
          environment,
        },
      },
      update: {
        encryptedData,
        updated_at: new Date(),
      },
      create: {
        id: randomUUID(),
        merchant_id: merchant_id,
        provider,
        environment,
        encryptedData,
        updated_at: new Date(),
      },
    });
  }

  async getCredentials<T>(
    merchant_id: string,
    provider: Provider,
    environment = 'production',
  ): Promise<T | null> {
    const record = await this.prisma.provider_credentials.findUnique({
      where: {
        merchant_id_provider_environment: {
          merchant_id: merchant_id,
          provider,
          environment,
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.encryptionService.decrypt<T>(record.encryptedData);
  }

  /**
   * Vérifie s'il y a au moins un merchant connecté à un provider donné
   */
  async hasAnyCredentials(provider: Provider): Promise<boolean> {
    const count = await this.prisma.provider_credentials.count({
      where: { provider },
    });
    return count > 0;
  }
}
