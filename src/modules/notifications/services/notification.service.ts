import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { NotificationHistoryService } from './notification-history.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import {
  isZeroDecimalCurrency,
  formatAmountFromMinor,
} from '../../../shared/currency/currency.utils';

export interface PaymentNotificationData {
  paymentId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  status: string;
  gatewayUsed: string;
  merchantId?: string;
  merchantEmail?: string;
  customerEmail?: string;
}

export interface PayoutNotificationData {
  payoutId: string;
  merchantId?: string;
  merchantEmail?: string;
  amountMinor: number;
  currency: string;
  status: string;
  paymentSystem: string;
  payoutType: string;
  provider?: string;
  failureCode?: string;
}

export interface RefundNotificationData {
  refundId: string;
  paymentId: string;
  orderId?: string;
  amountMinor: number;
  currency: string;
  status: string;
  reason?: string;
  merchantEmail?: string;
  customerEmail?: string;
}

export interface CustomerNotificationData {
  customerEmail: string;
  customerName?: string;
  paymentId?: string;
  orderId?: string;
  amountMinor?: number;
  currency?: string;
  message: string;
  subject?: string;
}

export interface SystemNotificationData {
  merchantId?: string;
  merchantEmail?: string;
  type: 'WEBHOOK_FAILURE' | 'ERROR' | 'ALERT';
  message: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly appUrl: string;
  private readonly merchantNotificationsEnabled: boolean;

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly historyService: NotificationHistoryService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'https://app.boohpay.io');
    this.merchantNotificationsEnabled =
      this.configService.get<string>('MERCHANT_NOTIFICATIONS_ENABLED', 'true') === 'true';
  }

  /**
   * Notifier un marchand de l'état d'un paiement
   */
  async notifyPaymentStatus(
    data: PaymentNotificationData & { merchantId?: string },
  ): Promise<void> {
    if (!this.merchantNotificationsEnabled || !data.merchantId) {
      return;
    }

    // Vérifier les préférences
    const enabled = await this.preferencesService.isNotificationEnabled(
      data.merchantId,
      'payment',
      'email',
    );
    if (!enabled) {
      this.logger.debug(
        `Payment notifications disabled for merchant ${data.merchantId}`,
      );
      return;
    }

    // Récupérer l'email du marchand si non fourni
    let merchantEmail = data.merchantEmail;
    if (!merchantEmail && data.merchantId) {
      const merchant = await this.prisma.merchants.findUnique({
        where: { id: data.merchantId },
        include: { users: { where: { role: 'MERCHANT' }, take: 1 } },
      });
      merchantEmail = merchant?.users[0]?.email;
    }

    if (!merchantEmail) {
      this.logger.debug(
        `No email found for merchant, skipping notification for payment ${data.paymentId}`,
      );
      return;
    }

    const subject = this.getPaymentSubject(data.status);
    const html = this.renderPaymentEmail(data);

    // Créer l'entrée d'historique
    const historyId = await this.historyService.createHistoryEntry({
      merchantId: data.merchantId,
      type: NotificationType.PAYMENT_STATUS,
      channel: NotificationChannel.EMAIL,
      recipient: merchantEmail,
      subject,
      body: html,
      metadata: {
        paymentId: data.paymentId,
        orderId: data.orderId,
        status: data.status,
      },
    });

    try {
      await this.emailService.sendEmail({
        to: merchantEmail,
        subject,
        html,
      });

      await this.historyService.markAsSent(historyId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.historyService.markAsFailed(historyId, errorMessage);
      throw error;
    }

    // Notifier le client si nécessaire
    if (data.customerEmail && data.customerEmail !== merchantEmail) {
      await this.notifyCustomer({
        customerEmail: data.customerEmail,
        paymentId: data.paymentId,
        orderId: data.orderId,
        amountMinor: data.amountMinor,
        currency: data.currency,
        message: this.getCustomerPaymentMessage(data.status),
        subject: this.getCustomerPaymentSubject(data.status),
      }).catch((err) => {
        this.logger.error(
          `Failed to send customer notification for payment ${data.paymentId}`,
          err,
        );
      });
    }
  }

  /**
   * Notifier un marchand d'un payout
   */
  async notifyPayoutStatus(
    data: PayoutNotificationData,
  ): Promise<void> {
    if (!data.merchantId) {
      this.logger.debug(`No merchantId provided for payout notification ${data.payoutId}`);
      return;
    }

    // Même si les notifications sont désactivées globalement, on peut toujours créer l'historique
    // pour le tracking (mais on n'envoie pas l'email)

    // Vérifier les préférences
    const enabled = await this.preferencesService.isNotificationEnabled(
      data.merchantId,
      'payout',
      'email',
    );
    if (!enabled) {
      this.logger.debug(
        `Payout notifications disabled for merchant ${data.merchantId}`,
      );
      return;
    }

    // Récupérer l'email du marchand
    let merchantEmail = data.merchantEmail;
    if (!merchantEmail && data.merchantId) {
      const merchant = await this.prisma.merchants.findUnique({
        where: { id: data.merchantId },
        include: { users: { where: { role: 'MERCHANT' }, take: 1 } },
      });
      merchantEmail = merchant?.users[0]?.email;
    }

    // Utiliser un email par défaut si aucun n'est trouvé (pour le tracking)
    const recipientEmail = merchantEmail || `merchant-${data.merchantId}@boohpay.io`;

    if (!merchantEmail) {
      this.logger.debug(
        `No email found for merchant ${data.merchantId}, using placeholder for tracking: ${recipientEmail}`,
      );
      // Ne pas envoyer d'email mais créer l'historique pour le tracking
    }

    const subject = this.getPayoutSubject(data.status);
    const html = this.renderPayoutEmail(data);

    // Créer l'entrée d'historique (même sans email pour le tracking)
    const historyId = await this.historyService.createHistoryEntry({
      merchantId: data.merchantId,
      type: NotificationType.PAYOUT_STATUS,
      channel: NotificationChannel.EMAIL,
      recipient: recipientEmail,
      subject,
      body: html,
      metadata: {
        payoutId: data.payoutId,
        status: data.status,
        provider: data.provider,
        hasEmail: !!merchantEmail,
      },
    });

    try {
      // Envoyer l'email seulement si on a un email valide et que les notifications sont activées
      if (merchantEmail && this.merchantNotificationsEnabled) {
        await this.emailService.sendEmail({
          to: merchantEmail,
          subject,
          html,
        });
        await this.historyService.markAsSent(historyId);
      } else if (!merchantEmail) {
        // Pas d'email disponible, marquer comme échoué avec un message explicite
        await this.historyService.markAsFailed(
          historyId,
          'No email address found for merchant',
        );
        this.logger.debug(`No email for merchant ${data.merchantId}, notification history created but email not sent`);
      } else {
        // Notifications désactivées globalement
        this.logger.debug(`Notifications globally disabled, skipping email send but keeping history for payout ${data.payoutId}`);
        await this.historyService.markAsSent(historyId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.historyService.markAsFailed(historyId, errorMessage);
      // Ne pas throw pour ne pas bloquer le flow principal
      this.logger.error(`Failed to send payout notification email for ${data.payoutId}`, error);
    }
  }

  /**
   * Notifier un marchand d'un refund
   */
  async notifyRefundStatus(data: RefundNotificationData): Promise<void> {
    if (!this.merchantNotificationsEnabled) {
      return;
    }

    // Récupérer le merchantId depuis le paiement
    const payment = await this.prisma.transactions.findUnique({
      where: { id: data.paymentId },
      select: { merchant_id: true },
    });

    if (!payment?.merchant_id) {
      this.logger.debug(
        `No merchant found for payment ${data.paymentId}, skipping refund notification`,
      );
      return;
    }

    // Vérifier les préférences
    const enabled = await this.preferencesService.isNotificationEnabled(
      payment.merchant_id,
      'refund',
      'email',
    );
    if (!enabled) {
      this.logger.debug(
        `Refund notifications disabled for merchant ${payment.merchant_id}`,
      );
      return;
    }

    // Récupérer l'email du marchand
    const merchant = await this.prisma.merchants.findUnique({
      where: { id: payment.merchant_id },
      include: {
        users: { where: { role: 'MERCHANT' }, take: 1 },
      },
    });

    const merchantEmail = merchant?.users[0]?.email;

    if (!merchantEmail) {
      this.logger.debug(
        `No email found for merchant, skipping notification for refund ${data.refundId}`,
      );
      return;
    }

    const subject = this.getRefundSubject(data.status);
    const html = this.renderRefundEmail(data);

    // Créer l'entrée d'historique
    const historyId = await this.historyService.createHistoryEntry({
      merchantId: payment.merchant_id,
      type: NotificationType.REFUND_STATUS,
      channel: NotificationChannel.EMAIL,
      recipient: merchantEmail,
      subject,
      body: html,
      metadata: {
        refundId: data.refundId,
        paymentId: data.paymentId,
        status: data.status,
      },
    });

    try {
      await this.emailService.sendEmail({
        to: merchantEmail,
        subject,
        html,
      });

      await this.historyService.markAsSent(historyId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.historyService.markAsFailed(historyId, errorMessage);
      throw error;
    }

    // Notifier le client si nécessaire
    if (data.customerEmail && data.customerEmail !== merchantEmail) {
      await this.notifyCustomer({
        customerEmail: data.customerEmail,
        paymentId: data.paymentId,
        orderId: data.orderId,
        amountMinor: data.amountMinor,
        currency: data.currency,
        message: this.getCustomerRefundMessage(data.status, data.reason),
        subject: this.getCustomerRefundSubject(data.status),
      }).catch((err) => {
        this.logger.error(
          `Failed to send customer notification for refund ${data.refundId}`,
          err,
        );
      });
    }
  }

  /**
   * Notifier un client
   */
  async notifyCustomer(data: CustomerNotificationData): Promise<void> {
    if (!data.customerEmail) {
      return;
    }

    const subject = data.subject || 'Notification BoohPay';
    const html = this.renderCustomerEmail(data);

    // Créer l'entrée d'historique (sans merchantId pour les notifications clients)
    const historyId = await this.historyService.createHistoryEntry({
      type: NotificationType.CUSTOMER_NOTIFICATION,
      channel: NotificationChannel.EMAIL,
      recipient: data.customerEmail,
      subject,
      body: html,
      metadata: {
        paymentId: data.paymentId,
        orderId: data.orderId,
      },
    });

    try {
      await this.emailService.sendEmail({
        to: data.customerEmail,
        subject,
        html,
      });

      await this.historyService.markAsSent(historyId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.historyService.markAsFailed(historyId, errorMessage);
      // Ne pas throw pour les notifications clients pour ne pas bloquer le flow principal
      this.logger.error(
        `Failed to send customer notification to ${data.customerEmail}`,
        error,
      );
    }
  }

  /**
   * Notifier un événement système
   */
  async notifySystem(data: SystemNotificationData): Promise<void> {
    if (!this.merchantNotificationsEnabled) {
      return;
    }

    if (data.merchantId) {
      // Vérifier les préférences
      const enabled = await this.preferencesService.isNotificationEnabled(
        data.merchantId,
        'system',
        'email',
      );
      if (!enabled) {
        this.logger.debug(
          `System notifications disabled for merchant ${data.merchantId}`,
        );
        return;
      }
    }

    // Récupérer l'email du marchand si nécessaire
    let recipientEmail = data.merchantEmail;
    if (!recipientEmail && data.merchantId) {
      const merchant = await this.prisma.merchants.findUnique({
        where: { id: data.merchantId },
        include: { users: { where: { role: 'MERCHANT' }, take: 1 } },
      });
      recipientEmail = merchant?.users[0]?.email;
    }

    if (!recipientEmail) {
      this.logger.debug(
        `No email found for system notification, skipping`,
      );
      return;
    }

    const subject = this.getSystemSubject(data.type, data.message);
    const html = this.renderSystemEmail(data);

    // Créer l'entrée d'historique
    const historyId = await this.historyService.createHistoryEntry({
      merchantId: data.merchantId,
      type:
        data.type === 'WEBHOOK_FAILURE'
          ? NotificationType.WEBHOOK_FAILURE
          : NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.EMAIL,
      recipient: recipientEmail,
      subject,
      body: html,
      metadata: {
        type: data.type,
        details: data.details,
      },
    });

    try {
      await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
      });

      await this.historyService.markAsSent(historyId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.historyService.markAsFailed(historyId, errorMessage);
      // Ne pas throw pour les notifications système
      this.logger.error(
        `Failed to send system notification to ${recipientEmail}`,
        error,
      );
    }
  }

  // Méthodes privées pour les sujets
  private getPaymentSubject(status: string): string {
    switch (status) {
      case 'SUCCEEDED':
        return '✅ Paiement réussi';
      case 'FAILED':
        return '❌ Paiement échoué';
      case 'PENDING':
        return '⏳ Paiement en attente';
      default:
        return `📧 Mise à jour du paiement: ${status}`;
    }
  }

  private getPayoutSubject(status: string): string {
    switch (status) {
      case 'SUCCEEDED':
        return '✅ Payout réussi';
      case 'FAILED':
        return '❌ Payout échoué';
      case 'PROCESSING':
        return '⏳ Payout en cours de traitement';
      case 'PENDING':
        return '⏳ Payout en attente';
      default:
        return `📧 Mise à jour du payout: ${status}`;
    }
  }

  private getRefundSubject(status: string): string {
    switch (status) {
      case 'SUCCEEDED':
        return '✅ Remboursement réussi';
      case 'FAILED':
        return '❌ Remboursement échoué';
      case 'PENDING':
        return '⏳ Remboursement en attente';
      default:
        return `📧 Mise à jour du remboursement: ${status}`;
    }
  }

  private getSystemSubject(
    type: SystemNotificationData['type'],
    message: string,
  ): string {
    switch (type) {
      case 'WEBHOOK_FAILURE':
        return '🚨 Échec de webhook';
      case 'ERROR':
        return '⚠️ Erreur système';
      case 'ALERT':
        return '📢 Alerte système';
      default:
        return `📧 Notification système: ${message}`;
    }
  }

  private getCustomerPaymentSubject(status: string): string {
    switch (status) {
      case 'SUCCEEDED':
        return '✅ Votre paiement a été confirmé';
      case 'FAILED':
        return '❌ Échec du paiement';
      case 'PENDING':
        return '⏳ Votre paiement est en attente';
      default:
        return '📧 Mise à jour de votre paiement';
    }
  }

  private getCustomerRefundSubject(status: string): string {
    switch (status) {
      case 'SUCCEEDED':
        return '✅ Votre remboursement a été traité';
      case 'FAILED':
        return '❌ Échec du remboursement';
      case 'PENDING':
        return '⏳ Votre remboursement est en traitement';
      default:
        return '📧 Mise à jour de votre remboursement';
    }
  }

  private getCustomerPaymentMessage(status: string): string {
    switch (status) {
      case 'SUCCEEDED':
        return 'Votre paiement a été confirmé avec succès. Merci pour votre achat !';
      case 'FAILED':
        return 'Votre paiement n\'a pas pu être traité. Veuillez réessayer ou contacter le support.';
      case 'PENDING':
        return 'Votre paiement est en cours de traitement. Vous recevrez une confirmation une fois le traitement terminé.';
      default:
        return 'Le statut de votre paiement a été mis à jour.';
    }
  }

  private getCustomerRefundMessage(
    status: string,
    reason?: string,
  ): string {
    const baseMessage =
      status === 'SUCCEEDED'
        ? 'Votre remboursement a été traité avec succès.'
        : status === 'FAILED'
          ? 'Votre remboursement n\'a pas pu être traité. Veuillez contacter le support.'
          : 'Votre remboursement est en cours de traitement.';

    return reason ? `${baseMessage} Raison: ${reason}` : baseMessage;
  }

  // Méthodes de rendu des emails (à continuer dans la prochaine partie...)
  private renderPaymentEmail(data: PaymentNotificationData): string {
    return this.renderEmailTemplate({
      title: 'Notification de Paiement',
      greeting: 'Bonjour,',
      mainMessage: `Un paiement pour votre commande <strong>${data.orderId}</strong> a été ${this.getStatusLabel(data.status).toLowerCase()}.`,
      details: {
        Statut: this.getStatusBadge(data.status),
        Montant: this.formatAmount(data.amountMinor, data.currency),
        Commande: data.orderId,
        Passerelle: data.gatewayUsed,
        'ID Paiement': data.paymentId,
      },
      actionUrl: `${this.appUrl}/payments/${data.paymentId}`,
      actionLabel: 'Voir les détails',
    });
  }

  private renderPayoutEmail(data: PayoutNotificationData): string {
    return this.renderEmailTemplate({
      title: 'Notification de Payout',
      greeting: 'Bonjour,',
      mainMessage: `Un payout a été ${this.getStatusLabel(data.status).toLowerCase()}.`,
      details: {
        Statut: this.getStatusBadge(data.status),
        Montant: this.formatAmount(data.amountMinor, data.currency),
        'Système de paiement': data.paymentSystem,
        Type: data.payoutType,
        Provider: data.provider || 'N/A',
        'ID Payout': data.payoutId,
        ...(data.failureCode && { 'Code d\'erreur': data.failureCode }),
      },
      actionUrl: `${this.appUrl}/payouts/${data.payoutId}`,
      actionLabel: 'Voir les détails',
    });
  }

  private renderRefundEmail(data: RefundNotificationData): string {
    return this.renderEmailTemplate({
      title: 'Notification de Remboursement',
      greeting: 'Bonjour,',
      mainMessage: `Un remboursement pour le paiement <strong>${data.paymentId}</strong> a été ${this.getStatusLabel(data.status).toLowerCase()}.`,
      details: {
        Statut: this.getStatusBadge(data.status),
        Montant: this.formatAmount(data.amountMinor, data.currency),
        'ID Remboursement': data.refundId,
        'ID Paiement': data.paymentId,
        ...(data.reason && { Raison: data.reason }),
      },
      actionUrl: `${this.appUrl}/refunds/${data.refundId}`,
      actionLabel: 'Voir les détails',
    });
  }

  private renderCustomerEmail(data: CustomerNotificationData): string {
    const amountText =
      data.amountMinor && data.currency
        ? `<p><strong>Montant:</strong> ${this.formatAmount(
            data.amountMinor,
            data.currency,
          )}</p>`
        : '';

    return this.renderEmailTemplate({
      title: 'KryptPay',
      greeting: data.customerName
        ? `Bonjour ${data.customerName},`
        : 'Bonjour,',
      mainMessage: data.message,
      details: {
        ...(data.orderId && { 'Numéro de commande': data.orderId }),
        ...(data.paymentId && { 'ID de transaction': data.paymentId }),
      },
      customContent: amountText,
      footerMessage:
        'Si vous avez des questions, n\'hésitez pas à contacter le support.',
    });
  }

  private renderSystemEmail(data: SystemNotificationData): string {
    const detailsHtml = data.details
      ? Object.entries(data.details)
          .map(([key, value]) => {
            const valueStr =
              typeof value === 'object'
                ? JSON.stringify(value, null, 2)
                : String(value);
            return `<div class="detail-row">
              <span><strong>${this.escapeHtml(key)}:</strong></span>
              <span>${this.escapeHtml(valueStr)}</span>
            </div>`;
          })
          .join('')
      : '';

    return this.renderEmailTemplate({
      title: 'Notification Système',
      greeting: 'Bonjour,',
      mainMessage: data.message,
      details: data.details
        ? Object.fromEntries(
            Object.entries(data.details).map(([key, value]) => [
              key,
              typeof value === 'object'
                ? JSON.stringify(value, null, 2)
                : String(value),
            ]),
          )
        : {},
      warning: true,
    });
  }

  // Template générique amélioré
  private renderEmailTemplate(options: {
    title: string;
    greeting: string;
    mainMessage: string;
    details?: Record<string, string>;
    actionUrl?: string;
    actionLabel?: string;
    customContent?: string;
    footerMessage?: string;
    warning?: boolean;
  }): string {
    const detailsHtml = options.details
      ? Object.entries(options.details)
          .map(([key, value]) => {
            // Si la valeur est déjà du HTML (badge), on ne l'échappe pas
            const isHtml = value.includes('<span');
            return `<div class="detail-row">
              <span><strong>${this.escapeHtml(key)}:</strong></span>
              <span>${isHtml ? value : this.escapeHtml(value)}</span>
            </div>`;
          })
          .join('')
      : '';

    const actionButton = options.actionUrl
      ? `<p style="margin-top: 24px;">
          <a href="${options.actionUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            ${options.actionLabel || 'Voir les détails'}
          </a>
        </p>`
      : '';

    const warningStyle = options.warning
      ? 'background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 4px;'
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 20px auto; padding: 0; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .content { background: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; }
    .details { background: #f9fafb; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e5e7eb; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-row span:first-child { font-weight: 500; color: #6b7280; }
    .detail-row span:last-child { text-align: right; color: #111827; }
    .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    .warning-box { ${warningStyle} }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; margin: 0 !important; }
      .content { padding: 24px 20px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BoohPay</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #111827; font-size: 22px;">${this.escapeHtml(options.title)}</h2>
      <p>${this.escapeHtml(options.greeting)}</p>
      ${options.warning ? `<div class="warning-box">` : ''}
      <p>${options.mainMessage}</p>
      ${options.warning ? `</div>` : ''}
      ${options.customContent || ''}
      ${detailsHtml ? `<div class="details">${detailsHtml}</div>` : ''}
      ${actionButton}
      ${options.footerMessage ? `<p style="margin-top: 24px; color: #6b7280; font-size: 14px;">${this.escapeHtml(options.footerMessage)}</p>` : ''}
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par BoohPay.</p>
      <p>Vous recevez cet email car vous êtes inscrit en tant que marchand.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getStatusBadge(status: string): string {
    const statusLabel = this.getStatusLabel(status);
    const statusColor = this.getStatusColor(status);
    return `<span style="display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: 600; font-size: 13px; background: ${statusColor}; color: white;">${statusLabel}</span>`;
  }

  private formatAmount(amountMinor: number, currency: string): string {
    if (isZeroDecimalCurrency(currency)) {
      return `${amountMinor} ${currency}`;
    }
    const amount = isZeroDecimalCurrency(currency) ? amountMinor : amountMinor / 100;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      SUCCEEDED: 'Réussi',
      FAILED: 'Échoué',
      PENDING: 'En attente',
      PROCESSING: 'En cours',
      AUTHORIZED: 'Autorisé',
    };
    return labels[status] || status;
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      SUCCEEDED: '#10b981',
      FAILED: '#ef4444',
      PENDING: '#f59e0b',
      PROCESSING: '#3b82f6',
      AUTHORIZED: '#8b5cf6',
    };
    return colors[status] || '#6b7280';
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

