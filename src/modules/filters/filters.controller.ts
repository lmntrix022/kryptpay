import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { merchants as Merchant, UserRole } from '@prisma/client';
import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/current-user.decorator';
import { FiltersService, AdvancedSearchFilters, SavedFilterDto } from './filters.service';

@Controller('admin/filters')
@UseGuards(JwtOrApiKeyGuard)
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  @Post('search')
  async advancedSearch(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() filters: Omit<AdvancedSearchFilters, 'merchantId'>,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    return this.filtersService.advancedSearch({ ...filters, merchant_id: merchantId });
  }

  @Get('saved')
  async listSavedFilters(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Query('type') type?: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    return this.filtersService.listSavedFilters(merchantId, type);
  }

  @Get('saved/:id')
  async getSavedFilter(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('id') id: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    return this.filtersService.getSavedFilter(id, merchantId);
  }

  @Post('saved')
  async saveFilter(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Body() dto: SavedFilterDto,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    return this.filtersService.saveFilter(merchantId, dto);
  }

  @Put('saved/:id')
  async updateSavedFilter(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('id') id: string,
    @Body() dto: Partial<SavedFilterDto>,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    return this.filtersService.updateSavedFilter(id, merchantId, dto);
  }

  @Delete('saved/:id')
  async deleteSavedFilter(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('id') id: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    return this.filtersService.deleteSavedFilter(id, merchantId);
  }

  @Get('saved/default/:type')
  async getDefaultFilter(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchantFromApiKey: Merchant | undefined,
    @Param('type') type: string,
  ) {
    const merchantId = this.resolveMerchantId(user, merchantFromApiKey);
    return this.filtersService.getDefaultFilter(merchantId, type);
  }

  private resolveMerchantId(
    user: AuthenticatedUser | undefined,
    merchantFromApiKey: Merchant | undefined,
  ): string {
    if (user) {
      if (user.role === UserRole.MERCHANT) {
        if (!user.merchantId) {
          throw new UnauthorizedException('Merchant context missing');
        }
        return user.merchantId;
      } else {
        throw new UnauthorizedException('Only merchants can manage filters');
      }
    } else if (merchantFromApiKey) {
      return merchantFromApiKey.id;
    } else {
      throw new UnauthorizedException('Missing authentication context');
    }
  }
}


