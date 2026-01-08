import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { merchants } from '@prisma/client';

export const CurrentMerchant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): merchants => {
    const request = ctx.switchToHttp().getRequest<{ merchant?: merchants }>();
    return request.merchant as merchants;
  },
);

