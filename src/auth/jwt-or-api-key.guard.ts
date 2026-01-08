import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(JwtOrApiKeyGuard.name);

  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.header('authorization');
    const hasJwtToken = authHeader && authHeader.startsWith('Bearer ');
    const hasApiKey = !!request.header('x-api-key');

    // Si on a un token JWT, essayer d'abord le JWT
    if (hasJwtToken) {
      try {
        const jwtResult = await this.jwtAuthGuard.canActivate(context);
        if (jwtResult === true) {
          return true;
        }
      } catch (error) {
        // Logger l'erreur JWT pour debug
        this.logger.debug(`JWT authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        
        // Si ce n'est pas une UnauthorizedException, propager l'erreur
        if (!(error instanceof UnauthorizedException)) {
          throw error;
        }
        
        // Si c'est une UnauthorizedException et qu'on a aussi une API key, essayer l'API key
        if (hasApiKey) {
          this.logger.debug('JWT failed, trying API key as fallback');
          try {
            return await this.apiKeyGuard.canActivate(context);
          } catch (apiKeyError) {
            // Si l'API key échoue aussi, propager l'erreur JWT avec un message plus clair
            throw new UnauthorizedException(
              `JWT authentication failed: ${error.message}. API key also failed: ${apiKeyError instanceof Error ? apiKeyError.message : String(apiKeyError)}`
            );
          }
        }
        
        // Si on a un token JWT mais qu'il est invalide et qu'on n'a pas d'API key, propager l'erreur JWT avec un message plus clair
        throw new UnauthorizedException(
          `JWT authentication failed: ${error.message}. Please check that your token is valid and not expired.`
        );
      }
    }

    // Si on n'a pas de token JWT mais qu'on a une API key, essayer l'API key
    if (hasApiKey) {
      try {
        return await this.apiKeyGuard.canActivate(context);
      } catch (error) {
        throw error;
      }
    }

    // Si on n'a ni token JWT ni API key, retourner une erreur claire
    throw new UnauthorizedException(
      'Authentication required. Please provide either a JWT token (Authorization: Bearer <token>) or an API key (x-api-key header).'
    );
  }
}
