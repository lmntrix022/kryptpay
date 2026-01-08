import { createHash, randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { users, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { PASSWORD_POLICY_MESSAGE, isPasswordCompliant } from './password-policy';

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  merchantId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    role: UserRole;
    merchantId?: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly passwordResetTtl: number;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTtl = this.parseTtl(configService.get<string>('JWT_ACCESS_EXPIRES_IN', '900')); // 15 min
    this.refreshTtl = this.parseTtl(configService.get<string>('JWT_REFRESH_EXPIRES_IN', '604800')); // 7 jours
    this.passwordResetTtl = this.parseTtl(
      configService.get<string>('PASSWORD_RESET_TOKEN_TTL', '900'),
    );
  }

  async validateUser(email: string, password: string): Promise<users> {
    const user = await this.prisma.users.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.validateUser(email, password);
    return this.issueTokensForUser(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.users.findUnique({ where: { email } });

    if (!user) {
      return;
    }

    await this.prisma.password_reset_tokens.deleteMany({
      where: {
        user_id: user.id,
        consumed_at: null,
      },
    });

    const token = randomBytes(48).toString('base64url');

    await this.prisma.password_reset_tokens.create({
      data: {
        id: randomUUID(),
        token_hash: this.hashToken(token),
        user_id: user.id,
        expires_at: new Date(Date.now() + this.passwordResetTtl * 1000),
      },
    });

    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      this.logger.warn(
        `Token de réinitialisation généré pour ${email}. Configurez un service d’envoi d’email en production. Token: ${token}`,
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.password_reset_tokens.findUnique({ where: { token_hash: tokenHash } });

    if (!record || record.consumed_at || record.expires_at.getTime() < Date.now()) {
      throw new BadRequestException('Jeton invalide ou expiré');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: record.user_id },
        data: { password_hash: passwordHash },
      });

      await tx.refresh_tokens.deleteMany({ where: { user_id: record.user_id } });

      await tx.password_reset_tokens.update({
        where: { id: record.id },
        data: { consumed_at: new Date() },
      });

      await tx.password_reset_tokens.deleteMany({
        where: {
          user_id: record.user_id,
          consumed_at: null,
          id: { not: record.id },
        },
      });
    });
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refresh_tokens.findUnique({ where: { token_hash: tokenHash } });

    if (!stored || stored.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const user = await this.prisma.users.findUnique({ where: { id: stored.user_id } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.refresh_tokens.delete({ where: { id: stored.id } });

    return this.issueTokensForUser(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refresh_tokens.delete({ where: { token_hash: tokenHash } }).catch(() => undefined);
  }

  async hashPassword(password: string): Promise<string> {
    this.assertPasswordStrength(password);
    return bcrypt.hash(password, 12);
  }

  private async issueTokensForUser(user: users): Promise<AuthResponse> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchant_id,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTtl,
    });

    const refreshToken = this.createRefreshToken();

    await this.prisma.refresh_tokens.create({
      data: {
        id: randomUUID(),
        token_hash: this.hashToken(refreshToken),
        user_id: user.id,
        expires_at: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        merchantId: user.merchant_id,
      },
      accessToken,
      refreshToken,
      expiresIn: this.accessTtl,
      refreshExpiresIn: this.refreshTtl,
    };
  }

  private createRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private assertPasswordStrength(password: string): void {
    if (!isPasswordCompliant(password)) {
      throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    }
  }

  private parseTtl(value: string): number {
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    if (value.endsWith('s')) {
      return parseInt(value.slice(0, -1), 10);
    }

    if (value.endsWith('m')) {
      return parseInt(value.slice(0, -1), 10) * 60;
    }

    if (value.endsWith('h')) {
      return parseInt(value.slice(0, -1), 10) * 3600;
    }

    if (value.endsWith('d')) {
      return parseInt(value.slice(0, -1), 10) * 86400;
    }

    return 900;
  }
}
