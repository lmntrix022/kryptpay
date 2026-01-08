import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const IdempotencyKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'] || request.headers['x-idempotency-key'];

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    // Valider le format (UUID recommandé, mais acceptons toute chaîne non vide)
    if (idempotencyKey.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header cannot be empty');
    }

    return idempotencyKey.trim();
  },
);

