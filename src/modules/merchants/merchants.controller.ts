import { Body, Controller, Get, Param, Patch, UseGuards, Logger, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { merchants as Merchant } from '@prisma/client';

import { JwtOrApiKeyGuard } from '../../auth/jwt-or-api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { CurrentUser, AuthenticatedUser } from '../../auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class UpdateCommissionDto {
  /**
   * Taux de commission de l'app (ex: 0.03 = 3%)
   */
  rate?: number;

  /**
   * Commission fixe en centimes (ex: 75 = 0.75€)
   */
  fixed?: number;
}

@ApiTags('Merchants')
@Controller('merchants')
@UseGuards(JwtOrApiKeyGuard)
@ApiBearerAuth('JWT-auth')
@ApiSecurity('api-key')
export class MerchantsController {
  private readonly logger = new Logger(MerchantsController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupérer les informations du marchand courant
   */
  @Get('me')
  @ApiOperation({ summary: 'Informations du marchand courant' })
  @ApiResponse({ status: 200, description: 'Informations récupérées avec succès' })
  async getMe(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
  ) {
    const merchantId = merchant?.id || user?.merchantId;
    
    if (!merchantId) {
      throw new NotFoundException('Marchand non trouvé');
    }

    const merchantData = await this.prisma.merchants.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        app_commission_rate: true,
        app_commission_fixed: true,
        created_at: true,
      },
    });

    if (!merchantData) {
      throw new NotFoundException('Marchand non trouvé');
    }

    return {
      ...merchantData,
      // Frais BoohPay (informatif)
      boohpayFees: {
        rate: 0.015, // 1.5%
        fixed: 100,  // 1€
        description: '1.5% + 1€ par transaction',
      },
    };
  }

  /**
   * Mettre à jour la commission de l'app pour un marchand
   * Utilisé par les apps (comme Bööh) pour définir leurs propres commissions
   */
  @Patch('me/commission')
  @ApiOperation({ 
    summary: 'Mettre à jour la commission de l\'app',
    description: 'Permet à l\'app de définir sa propre commission sur les ventes de ce marchand'
  })
  @ApiResponse({ status: 200, description: 'Commission mise à jour' })
  async updateCommission(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
    @Body() dto: UpdateCommissionDto,
  ) {
    const merchantId = merchant?.id || user?.merchantId;
    
    if (!merchantId) {
      throw new NotFoundException('Marchand non trouvé');
    }

    // Validation
    if (dto.rate !== undefined && (dto.rate < 0 || dto.rate > 0.5)) {
      throw new Error('Le taux de commission doit être entre 0 et 50%');
    }
    if (dto.fixed !== undefined && (dto.fixed < 0 || dto.fixed > 10000)) {
      throw new Error('La commission fixe doit être entre 0 et 100€');
    }

    const updateData: Record<string, number> = {};
    if (dto.rate !== undefined) {
      updateData.app_commission_rate = dto.rate;
    }
    if (dto.fixed !== undefined) {
      updateData.app_commission_fixed = dto.fixed;
    }

    const updated = await this.prisma.merchants.update({
      where: { id: merchantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        app_commission_rate: true,
        app_commission_fixed: true,
      },
    });

    this.logger.log(
      `Commission updated for merchant ${merchantId}: ` +
      `rate=${updated.app_commission_rate}, fixed=${updated.app_commission_fixed}`
    );

    return {
      success: true,
      merchant: updated,
      message: 'Commission mise à jour avec succès',
    };
  }

  /**
   * Simuler le calcul des frais pour un montant donné
   */
  @Get('me/fees/simulate/:amount')
  @ApiOperation({ 
    summary: 'Simuler les frais pour un montant',
    description: 'Calcule les frais qui seraient prélevés sur une transaction'
  })
  async simulateFees(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentMerchant() merchant: Merchant | undefined,
    @Param('amount') amountStr: string,
  ) {
    const merchantId = merchant?.id || user?.merchantId;
    const amount = parseInt(amountStr, 10);

    if (isNaN(amount) || amount <= 0) {
      throw new Error('Montant invalide');
    }

    const merchantData = await this.prisma.merchants.findUnique({
      where: { id: merchantId ?? undefined },
      select: { app_commission_rate: true, app_commission_fixed: true },
    });

    if (!merchantData || !merchantId) {
      throw new Error('Merchant not found');
    }

    const appCommissionRate = merchantData.app_commission_rate ?? 0;
    const appCommissionFixed = merchantData.app_commission_fixed ?? 0;

    // Frais BoohPay: 1.5% + 1€
    const boohpayFee = Math.round(amount * 0.015 + 100);
    
    // Commission de l'app
    const appCommission = Math.round(amount * appCommissionRate + appCommissionFixed);
    
    // Total
    const totalFees = boohpayFee + appCommission;
    const sellerReceives = amount - totalFees;

    return {
      amount,
      currency: 'EUR (centimes)',
      breakdown: {
        boohpayFee: {
          amount: boohpayFee,
          description: '1.5% + 1€ (frais BoohPay)',
        },
        appCommission: {
          amount: appCommission,
          rate: appCommissionRate,
          fixed: appCommissionFixed,
          description: `${(appCommissionRate * 100).toFixed(1)}% + ${(appCommissionFixed / 100).toFixed(2)}€ (commission app)`,
        },
        totalFees,
        sellerReceives,
      },
      formatted: {
        amount: `${(amount / 100).toFixed(2)}€`,
        boohpayFee: `${(boohpayFee / 100).toFixed(2)}€`,
        appCommission: `${(appCommission / 100).toFixed(2)}€`,
        totalFees: `${(totalFees / 100).toFixed(2)}€`,
        sellerReceives: `${(sellerReceives / 100).toFixed(2)}€`,
      },
    };
  }
}
