import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionService } from '../shared/encryption/encryption.service';

import { AdminTokenGuard } from './admin-token.guard';
import { ApiKeyGuard } from './api-key.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtOrApiKeyGuard } from './jwt-or-api-key.guard';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'boohpay_secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '900'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ApiKeysService,
    ApiKeyGuard,
    AdminTokenGuard,
    EncryptionService,
    JwtStrategy,
    JwtAuthGuard,
    JwtOrApiKeyGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    ApiKeysService,
    ApiKeyGuard,
    AdminTokenGuard,
    EncryptionService,
    JwtAuthGuard,
    JwtOrApiKeyGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
