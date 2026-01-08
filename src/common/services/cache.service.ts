import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Récupère une valeur du cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}`, error as Error);
      return null;
    }
  }

  /**
   * Stocke une valeur dans le cache avec un TTL (en secondes)
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}`, error as Error);
    }
  }

  /**
   * Supprime une clé du cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}`, error as Error);
    }
  }

  /**
   * Supprime plusieurs clés du cache (pattern matching)
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}`, error as Error);
    }
  }

  /**
   * Vérifie si une clé existe dans le cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking cache key ${key}`, error as Error);
      return false;
    }
  }

  /**
   * Incrémente une valeur numérique dans le cache
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, by);
    } catch (error) {
      this.logger.error(`Error incrementing cache key ${key}`, error as Error);
      throw error;
    }
  }

  /**
   * Définit le TTL d'une clé existante
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      this.logger.error(`Error setting TTL for cache key ${key}`, error as Error);
    }
  }

  /**
   * Génère une clé de cache avec préfixe
   */
  static generateKey(prefix: string, ...parts: (string | number | undefined)[]): string {
    const validParts = parts.filter((p) => p !== undefined && p !== null);
    return `${prefix}:${validParts.join(':')}`;
  }

  /**
   * Constantes pour les TTL (en secondes)
   */
  static readonly TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 1800, // 30 minutes
    VERY_LONG: 3600, // 1 heure
    DAY: 86400, // 24 heures
  };
}
