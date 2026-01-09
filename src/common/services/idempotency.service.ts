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
      // Si Redis n'est pas disponible, on retourne null pour permettre le traitement
      this.logger.warn(`Failed to check idempotency key (Redis may be unavailable): ${error.message}`);
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
      // Si Redis n'est pas disponible, on log l'erreur mais on ne bloque pas la requête
      // L'idempotence sera simplement désactivée pour cette requête
      this.logger.warn(
        `Failed to store idempotency key (Redis may be unavailable): ${error.message}. ` +
        `Payment will proceed without idempotency caching.`
      );
      // Ne pas throw d'erreur - permettre au paiement de continuer
      // L'idempotence est une fonctionnalité de qualité, pas un blocage critique
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
      if (parsed.requestHash === requestHash) {
        return true; // Même hash, requête identique
      }

      // Hash différent : la clé a été utilisée avec un body différent
      // Supprimer l'ancienne clé pour permettre la nouvelle requête
      // (cela peut arriver si l'utilisateur modifie les paramètres et réessaie)
      this.logger.warn(
        `Idempotency key ${idempotencyKey} was used with different request body. ` +
        `Removing old cache entry to allow new request.`
      );
      try {
        await this.redis.del(key);
      } catch (delError) {
        // Ignorer les erreurs de suppression
      }
      return true; // Autoriser la nouvelle requête après suppression de l'ancienne
    } catch (error: any) {
      // Si Redis n'est pas disponible, on autorise la requête
      this.logger.warn(`Failed to validate idempotency key (Redis may be unavailable): ${error.message}`);
      return true; // Autoriser la requête en cas d'erreur (Redis non disponible)
    }
  }
}

