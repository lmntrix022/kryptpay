import { Module } from '@nestjs/common';
import { PrometheusModule as NestPrometheusModule } from '@willsoto/nestjs-prometheus';
import { PrometheusController } from './prometheus.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    NestPrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      defaultLabels: {
        app: 'boohpay',
      },
    }),
  ],
  controllers: [PrometheusController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class PrometheusModule {}

