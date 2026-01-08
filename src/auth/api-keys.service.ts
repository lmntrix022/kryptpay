import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyAuditAction, ApiKeyStatus, Prisma } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async generateApiKey(merchant_id: string, label?: string): Promise<{ apiKey: string; id: string }> {
    const apiKey = this.createToken();
    const keyHash = this.hashToken(apiKey);
    const id = randomUUID();

    const data: Prisma.api_keysCreateInput = {
      id,
      label,
      key_hash: keyHash,
      merchants: {
        connect: { id: merchant_id },
      },
      status: ApiKeyStatus.ACTIVE,
    };

    const created = await this.prisma.api_keys.create({ data });
    await this.createAudit(created.id, ApiKeyAuditAction.CREATED);

    return { apiKey, id: created.id };
  }

  async listMerchantKeys(merchantId: string) {
    return this.prisma.api_keys.findMany({
      where: { merchant_id: merchantId },
      orderBy: [{ created_at: 'desc' }],
      select: {
        id: true,
        label: true,
        merchant_id: true,
        created_at: true,
        last_used_at: true,
        status: true,
        revoked_at: true,
      },
    });
  }

  async listAllKeys() {
    return this.prisma.api_keys.findMany({
      include: {
        merchants: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ created_at: 'desc' }],
    });
  }

  async findById(apiKeyId: string) {
    return this.prisma.api_keys.findUnique({
      where: { id: apiKeyId },
      select: {
        id: true,
        label: true,
        merchant_id: true,
        created_at: true,
        last_used_at: true,
        status: true,
        revoked_at: true,
      },
    });
  }

  async deleteApiKey(apiKeyId: string) {
    const existing = await this.prisma.api_keys.findUnique({ where: { id: apiKeyId } });

    if (!existing) {
      throw new NotFoundException(`API key ${apiKeyId} not found`);
    }

    // Delete audit trail first (due to foreign key constraint)
    await this.prisma.api_key_audit.deleteMany({
      where: { api_key_id: apiKeyId },
    });

    // Delete the key
    await this.prisma.api_keys.delete({
      where: { id: apiKeyId },
    });

    return { success: true, message: 'API key deleted successfully' };
  }

  async getAuditTrail(apiKeyId: string, limit = 50) {
    return this.prisma.api_key_audit.findMany({
      where: { api_key_id: apiKeyId },
      orderBy: { occurred_at: 'desc' },
      take: limit,
    });
  }

  async revokeApiKey(apiKeyId: string) {
    const existing = await this.prisma.api_keys.findUnique({ where: { id: apiKeyId } });

    if (!existing) {
      throw new NotFoundException(`API key ${apiKeyId} not found`);
    }

    if (existing.status === ApiKeyStatus.REVOKED) {
      return existing;
    }

    const updated = await this.prisma.api_keys.update({
      where: { id: apiKeyId },
      data: {
        status: ApiKeyStatus.REVOKED,
        revoked_at: new Date(),
      },
      select: {
        id: true,
        label: true,
        merchant_id: true,
        created_at: true,
        last_used_at: true,
        status: true,
        revoked_at: true,
      },
    });

    await this.createAudit(apiKeyId, ApiKeyAuditAction.REVOKED);

    return updated;
  }

  async regenerateApiKey(apiKeyId: string): Promise<{ apiKey: string }> {
    const existing = await this.prisma.api_keys.findUnique({
      where: { id: apiKeyId },
      select: {
        id: true,
        status: true,
        merchant_id: true,
        label: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`API key ${apiKeyId} not found`);
    }

    await this.prisma.api_keys.update({
      where: { id: apiKeyId },
      data: {
        status: ApiKeyStatus.REVOKED,
        revoked_at: new Date(),
      },
    });

    await this.createAudit(apiKeyId, ApiKeyAuditAction.REVOKED);
    await this.createAudit(apiKeyId, ApiKeyAuditAction.REGENERATED);

    return this.generateApiKey(existing.merchant_id, existing.label ?? undefined);
  }

  async recordUsage(
    apiKeyId: string,
    context: { ip?: string | null; userAgent?: string | null },
  ): Promise<void> {
    await this.prisma.api_keys.update({
      where: { id: apiKeyId },
      data: {
        last_used_at: new Date(),
      },
    });

    await this.createAudit(apiKeyId, ApiKeyAuditAction.USED, context);
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private createToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private async createAudit(
    apiKeyId: string,
    action: ApiKeyAuditAction,
    context?: { ip?: string | null; userAgent?: string | null },
  ) {
    await this.prisma.api_key_audit.create({
      data: {
        id: randomUUID(),
        api_key_id: apiKeyId,
        action,
        ip_address: context?.ip ?? undefined,
        user_agent: context?.userAgent ?? undefined,
      },
    });
  }
}
