import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from '../services/cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        if (redisUrl) {
          // Support TLS pour Upstash Redis (rediss://)
          return new Redis(redisUrl, {
            tls: redisUrl.startsWith('rediss://') ? {} : undefined,
            retryStrategy: (times: number) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            maxRetriesPerRequest: 3,
          });
        }

        return new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          tls: redisHost.includes('upstash.io') ? {} : undefined,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: Redis,
      useExisting: 'REDIS_CLIENT',
    },
    CacheService,
  ],
  exports: ['REDIS_CLIENT', Redis, CacheService],
})
export class RedisModule {}

