import { createHash } from 'crypto';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';
import { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';

import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { merchant?: unknown }>();
    const apiKey = request.header('x-api-key');

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key');
    }

    // Détecter si c'est un ID UUID au lieu d'une vraie clé API
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(apiKey)) {
      throw new UnauthorizedException(
        'Invalid API key format. You are using the API key ID instead of the actual API key. ' +
        'Please use the full API key (visible only once after creation). Create a new API key in Dashboard > Integrations > API Keys if needed.'
      );
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const record = await this.prisma.api_keys.findUnique({
      where: { key_hash: keyHash },
      include: { merchants: true },
    });

    if (!record) {
      throw new UnauthorizedException(
        'Invalid API key. Please verify that you are using the complete API key (not the ID). ' +
        'The API key is only shown once after creation in the modal. Create a new API key if needed.'
      );
    }

    if (record.status !== ApiKeyStatus.ACTIVE) {
      throw new UnauthorizedException('API key is not active');
    }

    request.merchant = record.merchants;
    await this.apiKeysService
      .recordUsage(record.id, {
        ip: request.ip ?? request.socket.remoteAddress ?? undefined,
        userAgent: request.get('user-agent'),
      })
      .catch(() => undefined);

    return true;
  }
}
