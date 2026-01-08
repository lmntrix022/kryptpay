import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  Prisma,
} from '@prisma/client';

export interface CreateNotificationHistoryInput {
  merchantId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationHistoryService {
  private readonly logger = new Logger(NotificationHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une entrée dans l'historique des notifications
   */
  async createHistoryEntry(
    input: CreateNotificationHistoryInput,
  ): Promise<string> {
    try {
      const entry = await this.prisma.notification_history.create({
        data: {
          id: randomUUID(),
          merchant_id: input.merchantId,
          type: input.type,
          channel: input.channel,
          recipient: input.recipient,
          subject: input.subject,
          body: input.body,
          metadata: input.metadata as Prisma.InputJsonValue,
          status: NotificationStatus.PENDING,
        },
      });

      return entry.id;
    } catch (error) {
      this.logger.error('Failed to create notification history entry', error);
      throw error;
    }
  }

  /**
   * Marque une notification comme envoyée
   */
  async markAsSent(historyId: string): Promise<void> {
    try {
      await this.prisma.notification_history.update({
        where: { id: historyId },
        data: {
          status: NotificationStatus.SENT,
          sent_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to mark notification ${historyId} as sent`, error);
    }
  }

  /**
   * Marque une notification comme échouée
   */
  async markAsFailed(historyId: string, errorMessage: string): Promise<void> {
    try {
      await this.prisma.notification_history.update({
        where: { id: historyId },
        data: {
          status: NotificationStatus.FAILED,
          error_message: errorMessage,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to mark notification ${historyId} as failed`, error);
    }
  }

  /**
   * Récupère l'historique des notifications pour un marchand
   */
  async getMerchantHistory(
    merchant_id: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: NotificationType;
      status?: NotificationStatus;
      channel?: NotificationChannel;
    },
  ) {
    const where: Prisma.notification_historyWhereInput = {
      merchant_id: merchant_id || undefined,
      ...(options?.type && { type: options.type }),
      ...(options?.status && { status: options.status }),
      ...(options?.channel && { channel: options.channel }),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification_history.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.notification_history.count({ where }),
    ]);

    return {
      items,
      total,
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
    };
  }

  /**
   * Récupère les statistiques des notifications
   */
  async getStatistics(merchantId?: string) {
    const where: Prisma.notification_historyWhereInput = merchantId
      ? { merchant_id: merchantId }
      : {};

    const [total, byStatus, byType, byChannel] = await Promise.all([
      this.prisma.notification_history.count({ where }),
      this.prisma.notification_history.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.notification_history.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.notification_history.groupBy({
        by: ['channel'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<NotificationStatus, number>,
      ),
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<NotificationType, number>,
      ),
      byChannel: byChannel.reduce(
        (acc, item) => {
          acc[item.channel] = item._count;
          return acc;
        },
        {} as Record<NotificationChannel, number>,
      ),
    };
  }
}


