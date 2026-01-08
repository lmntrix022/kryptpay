import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const method = request.method;
          const route = request.route?.path || request.path;
          const status = response.statusCode;
          this.metricsService.recordHttpRequest(method, route, status, duration);
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const method = request.method;
          const route = request.route?.path || request.path;
          const status = error.status || 500;
          this.metricsService.recordHttpRequest(method, route, status, duration);
        },
      }),
    );
  }
}


