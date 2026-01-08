import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions } from '@nestjs/throttler';

@Injectable()
export class ThrottleBehindProxyGuard extends ThrottlerGuard {
  async getTracker(req: Record<string, any>): Promise<string> {
    // Si on est derrière un proxy, utiliser X-Forwarded-For
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor : forwardedFor.split(',');
      return ips[0].trim();
    }

    // Sinon utiliser l'IP directe
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}

