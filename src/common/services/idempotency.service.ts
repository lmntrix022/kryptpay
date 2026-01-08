import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly TTL = 24 * 60 * 60; // 24 heures en secondes

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private getKey(idempotencyKey: string, merchant_id: string): string {
    return `idempotency:${merchant_id}:${idempotencyKey}`;
  }

  private hashRequest(requestBody: unknown): string {
    const crypto = require('crypto');
    const serialized = typeof requestBody === 'string' 
      ? requestBody 
      : JSON.stringify(requestBody);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  async check(idempotencyKey: string, requestBody: unknown, merchant_id: string): Promise<unknown | null> {
    const key = this.getKey(idempotencyKey, merchant_id);
    
    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      return parsed.response;
    } catch (error: any) {
      this.logger.error(`Failed to check idempotency key: ${error.message}`, error.stack);
      return null;
    }
  }

  async store(
    idempotencyKey: string,
    requestBody: unknown,
    merchant_id: string,
    response: unknown,
  ): Promise<void> {
    const key = this.getKey(idempotencyKey, merchant_id);
    const requestHash = this.hashRequest(requestBody);

    const data = {
      requestHash,
      response,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.redis.setex(key, this.TTL, JSON.stringify(data));
    } catch (error: any) {
      this.logger.error(`Failed to store idempotency key: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to store idempotency key');
    }
  }

  async validateSameRequest(
    idempotencyKey: string,
    requestBody: unknown,
    merchant_id: string,
  ): Promise<boolean> {
    const key = this.getKey(idempotencyKey, merchant_id);
    const requestHash = this.hashRequest(requestBody);

    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return true; // Pas de cache, la requête est valide
      }

      const parsed = JSON.parse(cached);
      return parsed.requestHash === requestHash;
    } catch (error: any) {
      this.logger.error(`Failed to validate idempotency key: ${error.message}`, error.stack);
      return false;
    }
  }
}

