import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        const options: { host: string; port: number; password?: string } = {
          host: redisHost,
          port: redisPort,
        };

        if (redisPassword) {
          options.password = redisPassword;
        }

        return {
          redis: redisUrl || options,
        };
      },
    }),
    BullModule.registerQueue({
      name: 'webhook-delivery',
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}


