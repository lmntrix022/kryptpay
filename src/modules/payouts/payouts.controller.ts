import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { merchants as Merchant } from '@prisma/client';

import { ApiKeyGuard } from '../../auth/api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';

import { CreatePayoutDto } from './dto/create-payout.dto';
import { PayoutsService } from './payouts.service';

@Controller('payouts')
@UseGuards(ApiKeyGuard)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post()
  async create(@CurrentMerchant() merchant: Merchant, @Body() dto: CreatePayoutDto) {
    return this.payoutsService.createPayout(merchant.id, dto);
  }

  @Get()
  async list(
    @CurrentMerchant() merchant: Merchant,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const safeLimit = parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined;

    return this.payoutsService.listPayouts(merchant.id, {
      status,
      provider,
      limit: safeLimit,
    });
  }

  @Get(':id')
  async getOne(@CurrentMerchant() merchant: Merchant, @Param('id') payoutId: string) {
    return this.payoutsService.getPayout(merchant.id, payoutId);
  }
}
