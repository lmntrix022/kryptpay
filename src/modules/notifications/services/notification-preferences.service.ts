import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { merchant_notification_preferences } from '@prisma/client';

export interface UpdateNotificationPreferencesInput {
  paymentNotifications?: boolean;
  payoutNotifications?: boolean;
  refundNotifications?: boolean;
  systemNotifications?: boolean;
  customerNotifications?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
}

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère les préférences de notification d'un marchand
   * Crée les préférences par défaut si elles n'existent pas
   */
  async getOrCreatePreferences(
    merchant_id: string,
  ): Promise<merchant_notification_preferences> {
    let preferences = await this.prisma.merchant_notification_preferences.findUnique({
      where: { merchant_id: merchant_id },
    });

    if (!preferences) {
      preferences = await this.prisma.merchant_notification_preferences.create({
        data: {
          id: randomUUID(),
          merchant_id: merchant_id,
          payment_notifications: true,
          payout_notifications: true,
          refund_notifications: true,
          system_notifications: true,
          customer_notifications: true,
          email_enabled: true,
          sms_enabled: false,
          push_enabled: false,
          updated_at: new Date(),
        },
      });
      this.logger.log(`Created default notification preferences for merchant ${merchant_id}`);
    }

    return preferences;
  }

  /**
   * Met à jour les préférences de notification
   */
  async updatePreferences(
    merchant_id: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<merchant_notification_preferences> {
    // S'assurer que les préférences existent
    await this.getOrCreatePreferences(merchant_id);

    return this.prisma.merchant_notification_preferences.update({
      where: { merchant_id: merchant_id },
      data: {
        payment_notifications: input.paymentNotifications,
        payout_notifications: input.payoutNotifications,
        refund_notifications: input.refundNotifications,
        system_notifications: input.systemNotifications,
        customer_notifications: input.customerNotifications,
        email_enabled: input.emailEnabled,
        sms_enabled: input.smsEnabled,
        push_enabled: input.pushEnabled,
      },
    });
  }

  /**
   * Vérifie si une notification d'un type donné est autorisée
   */
  async isNotificationEnabled(
    merchant_id: string,
    type: 'payment' | 'payout' | 'refund' | 'system' | 'customer',
    channel: 'email' | 'sms' | 'push' = 'email',
  ): Promise<boolean> {
    const preferences = await this.getOrCreatePreferences(merchant_id);

    // Vérifier le canal
    if (channel === 'email' && !preferences.email_enabled) return false;
    if (channel === 'sms' && !preferences.sms_enabled) return false;
    if (channel === 'push' && !preferences.push_enabled) return false;

    // Vérifier le type
    switch (type) {
      case 'payment':
        return preferences.payment_notifications;
      case 'payout':
        return preferences.payout_notifications;
      case 'refund':
        return preferences.refund_notifications;
      case 'system':
        return preferences.system_notifications;
      case 'customer':
        return preferences.customer_notifications;
      default:
        return true;
    }
  }
}


