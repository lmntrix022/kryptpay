import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity, ApiHeader } from '@nestjs/swagger';
import type { merchants as Merchant } from '@prisma/client';

import { ApiKeyGuard } from '../../auth/api-key.guard';
import { CurrentMerchant } from '../../auth/current-merchant.decorator';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';
import { IdempotencyService } from '../../common/services/idempotency.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundResponseDto } from './dto/refund-response.dto';
import { RefundsService } from './refunds.service';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Créer un paiement', description: 'Crée un nouveau paiement et retourne les informations nécessaires pour le checkout (client_secret Stripe ou URL Moneroo).' })
  @ApiResponse({ status: 202, description: 'Paiement créé avec succès', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Requête invalide ou clé idempotency déjà utilisée' })
  @ApiResponse({ status: 401, description: 'Non autorisé (API key invalide)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Clé unique pour garantir l\'idempotence de la requête' })
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentMerchant() merchant: Merchant,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<PaymentResponseDto> {
    // D'abord valider que la même clé idempotency n'est pas utilisée pour une requête différente
    // (doit être fait avant de vérifier le cache pour éviter de retourner une mauvaise réponse)
    const isValidRequest = await this.idempotencyService.validateSameRequest(
      idempotencyKey,
      dto,
      merchant.id,
    );
    if (!isValidRequest) {
      throw new BadRequestException(
        'Idempotency-Key has already been used with a different request body',
      );
    }

    // Vérifier si cette requête a déjà été traitée (même clé + même body = même requête)
    const cachedResponse = await this.idempotencyService.check(idempotencyKey, dto, merchant.id);
    if (cachedResponse) {
      return cachedResponse as PaymentResponseDto;
    }

    // Créer le paiement
    const response = await this.paymentsService.createPayment(dto, merchant.id);

    // Stocker la réponse pour les requêtes futures avec la même clé
    await this.idempotencyService.store(idempotencyKey, dto, merchant.id, response);

    return response;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un paiement', description: 'Récupère les détails d\'un paiement spécifique par son ID, incluant l\'historique des événements.' })
  @ApiResponse({ status: 200, description: 'Paiement trouvé', type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  @ApiResponse({ status: 401, description: 'Non autorisé (API key invalide)' })
  async findOne(
    @Param('id') id: string,
    @CurrentMerchant() merchant: Merchant,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPayment(id, merchant.id);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un remboursement', description: 'Initie un remboursement pour un paiement spécifique.' })
  @ApiResponse({ status: 201, description: 'Remboursement créé avec succès' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  @ApiResponse({ status: 401, description: 'Non autorisé (API key invalide)' })
  async createRefund(
    @Param('id') paymentId: string,
    @Body() dto: CreateRefundDto,
    @CurrentMerchant() merchant: Merchant,
  ): Promise<RefundResponseDto> {
    return this.refundsService.createRefund(paymentId, merchant.id, dto);
  }
}
