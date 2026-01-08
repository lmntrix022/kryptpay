import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller()
export class PrometheusController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  async metrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}

