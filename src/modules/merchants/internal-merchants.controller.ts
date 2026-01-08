import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';

import { AdminTokenGuard } from '../../auth/admin-token.guard';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';

@ApiTags('Internal - Merchants')
@Controller('internal/merchants')
@UseGuards(AdminTokenGuard)
@ApiSecurity('admin-token')
export class InternalMerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new merchant (internal use, requires admin token)' })
  async create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.createMerchant(dto);
  }
}
