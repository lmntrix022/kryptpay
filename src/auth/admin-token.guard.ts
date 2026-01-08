import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  private readonly adminToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.adminToken = this.configService.get<string>('ADMIN_TOKEN');
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.adminToken) {
      throw new UnauthorizedException('ADMIN_TOKEN is not configured');
    }

    const request = context.switchToHttp().getRequest();
    const headerToken = request.header('x-admin-token');

    if (!headerToken || headerToken !== this.adminToken) {
      throw new UnauthorizedException('Invalid admin token');
    }

    return true;
  }
}

