import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { PlatformRevenueService } from './platform-revenue.service';

@ApiTags('Platform Revenue')
@Controller('admin/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class PlatformRevenueController {
  constructor(private readonly revenueService: PlatformRevenueService) {}

  @Get()
  @ApiOperation({ summary: 'Statistiques de revenus de la plateforme' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getPlatformRevenue() {
    try {
      return await this.revenueService.getPlatformRevenue();
    } catch (error) {
      console.error('Error in getPlatformRevenue:', error);
      throw error;
    }
  }

  @Get('quick')
  @ApiOperation({ summary: 'Résumé rapide des commissions' })
  @ApiResponse({ status: 200, description: 'Résumé récupéré' })
  async getQuickStats() {
    return this.revenueService.getQuickStats();
  }
}

