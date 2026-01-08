import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

import { CreateMerchantDto } from './dto/create-merchant.dto';
import { MerchantsService } from './merchants.service';

@Controller('admin/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get()
  async list() {
    return this.merchantsService.listMerchants();
  }

  @Post()
  async create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.createMerchant(dto);
  }

  @Post(':merchantId/api-keys')
  async createApiKey(@Param('merchantId') merchant_id: string, @Body('label') label?: string) {
    return this.merchantsService.issueNewApiKey(merchant_id, label);
  }
}
