import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { PrismaService } from '../../../prisma/prisma.service';

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

export interface RefundNotificationData {
  refundId: string;
  paymentId: string;
  orderId?: string;
  amountMinor: number;
  currency: string;
  status: string;
  reason?: string;
  merchantEmail?: string;
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
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'https://app.boohpay.io');
    this.merchantNotificationsEnabled =
      this.configService.get<string>('MERCHANT_NOTIFICATIONS_ENABLED', 'true') === 'true';
  }

  /**
   * Notifier un marchand de l'état d'un paiement
   */
  async notifyPaymentStatus(data: PaymentNotificationData & { merchantId?: string }): Promise<void> {
    if (!this.merchantNotificationsEnabled) {
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
      this.logger.debug(`No email found for merchant, skipping notification for payment ${data.paymentId}`);
      return;
    }

    const subject = this.getPaymentSubject(data.status);
    const html = this.renderPaymentEmail(data);

    await this.emailService.sendEmail({
      to: merchantEmail,
      subject,
      html,
    });
  }

  /**
   * Notifier un marchand d'un refund
   */
  async notifyRefundStatus(data: RefundNotificationData): Promise<void> {
    if (!this.merchantNotificationsEnabled) {
      return;
    }

    // Récupérer l'email du marchand
    const payment = await this.prisma.transactions.findUnique({
      where: { id: data.paymentId },
      include: {
        merchants: {
          include: {
            users: { where: { role: 'MERCHANT' }, take: 1 },
          },
        },
      },
    });

    const merchantEmail = payment?.merchants?.users[0]?.email;

    if (!merchantEmail) {
      this.logger.debug(`No email found for merchant, skipping notification for refund ${data.refundId}`);
      return;
    }

    const subject = this.getRefundSubject(data.status);
    const html = this.renderRefundEmail(data);

    await this.emailService.sendEmail({
      to: merchantEmail,
      subject,
      html,
    });
  }

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

  private renderPaymentEmail(data: PaymentNotificationData): string {
    const amount = (data.amountMinor / 100).toFixed(2);
    const statusLabel = this.getStatusLabel(data.status);
    const statusColor = this.getStatusColor(data.status);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .status { display: inline-block; padding: 8px 16px; border-radius: 4px; font-weight: bold; background: ${statusColor}; color: white; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BoohPay</h1>
    </div>
    <div class="content">
      <h2>Notification de Paiement</h2>
      <p>Bonjour,</p>
      <p>Un paiement pour votre commande <strong>${data.orderId}</strong> a été ${statusLabel.toLowerCase()}.</p>
      
      <div class="details">
        <div class="detail-row">
          <span><strong>Statut:</strong></span>
          <span class="status">${statusLabel}</span>
        </div>
        <div class="detail-row">
          <span><strong>Montant:</strong></span>
          <span>${amount} ${data.currency}</span>
        </div>
        <div class="detail-row">
          <span><strong>Commande:</strong></span>
          <span>${data.orderId}</span>
        </div>
        <div class="detail-row">
          <span><strong>Passerelle:</strong></span>
          <span>${data.gatewayUsed}</span>
        </div>
        <div class="detail-row">
          <span><strong>ID Paiement:</strong></span>
          <span>${data.paymentId}</span>
        </div>
      </div>

      <p><a href="${this.appUrl}/payments/${data.paymentId}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Voir les détails</a></p>
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

  private renderRefundEmail(data: RefundNotificationData): string {
    const amount = (data.amountMinor / 100).toFixed(2);
    const statusLabel = this.getStatusLabel(data.status);
    const statusColor = this.getStatusColor(data.status);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .status { display: inline-block; padding: 8px 16px; border-radius: 4px; font-weight: bold; background: ${statusColor}; color: white; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BoohPay</h1>
    </div>
    <div class="content">
      <h2>Notification de Remboursement</h2>
      <p>Bonjour,</p>
      <p>Un remboursement pour le paiement <strong>${data.paymentId}</strong> a été ${statusLabel.toLowerCase()}.</p>
      
      <div class="details">
        <div class="detail-row">
          <span><strong>Statut:</strong></span>
          <span class="status">${statusLabel}</span>
        </div>
        <div class="detail-row">
          <span><strong>Montant:</strong></span>
          <span>${amount} ${data.currency}</span>
        </div>
        <div class="detail-row">
          <span><strong>ID Remboursement:</strong></span>
          <span>${data.refundId}</span>
        </div>
        <div class="detail-row">
          <span><strong>ID Paiement:</strong></span>
          <span>${data.paymentId}</span>
        </div>
        ${data.reason ? `<div class="detail-row"><span><strong>Raison:</strong></span><span>${data.reason}</span></div>` : ''}
      </div>

      <p><a href="${this.appUrl}/refunds/${data.refundId}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Voir les détails</a></p>
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
}

