import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { ApiKeysService } from '../../auth/api-keys.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get('merchants/:merchantId/api-keys')
  async listForMerchant(@Param('merchantId') merchant_id: string) {
    return this.apiKeysService.listMerchantKeys(merchant_id);
  }

  @Patch('api-keys/:apiKeyId/revoke')
  async revoke(@Param('apiKeyId') apiKeyId: string) {
    return this.apiKeysService.revokeApiKey(apiKeyId);
  }

  @Post('api-keys/:apiKeyId/regenerate')
  async regenerate(@Param('apiKeyId') apiKeyId: string) {
    return this.apiKeysService.regenerateApiKey(apiKeyId);
  }

  @Get('api-keys/:apiKeyId/audit')
  async audit(@Param('apiKeyId') apiKeyId: string) {
    return this.apiKeysService.getAuditTrail(apiKeyId);
  }
}
