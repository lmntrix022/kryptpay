import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ReconciliationService } from './reconciliation.service';

@ApiTags('Reconciliation')
@Controller('admin/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('run')
  @ApiOperation({ summary: 'Lancer une réconciliation manuelle' })
  @ApiQuery({ name: 'merchantId', required: false, description: 'ID du merchant (optionnel)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Date de fin (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Réconciliation lancée avec succès' })
  async runReconciliation(
    @Query('merchantId') merchantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reconciliationService.triggerManualReconciliation(
      merchantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique des réconciliations' })
  @ApiQuery({ name: 'merchantId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Historique récupéré' })
  async getHistory(
    @Query('merchantId') merchantId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reconciliationService.getReconciliationHistory(
      merchantId,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Get('daily')
  @ApiOperation({ summary: 'Lancer la réconciliation quotidienne' })
  @ApiResponse({ status: 200, description: 'Réconciliation quotidienne terminée' })
  async runDaily() {
    return this.reconciliationService.runDailyReconciliation();
  }
}

