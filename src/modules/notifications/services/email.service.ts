import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

type EmailProvider = 'resend' | 'smtp';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resendClient: Resend | null = null;
  private readonly enabled: boolean;
  private readonly defaultFrom: string;
  private readonly provider: EmailProvider;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true';
    this.defaultFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      this.configService.get<string>('EMAIL_USER') ||
      'noreply@boohpay.io';
    
    // Déterminer le provider à utiliser
    const providerConfig = this.configService.get<string>('EMAIL_PROVIDER', 'smtp').toLowerCase();
    this.provider = providerConfig === 'resend' ? 'resend' : 'smtp';
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Email notifications are disabled. Set EMAIL_ENABLED=true to enable.');
      return;
    }

    if (this.provider === 'resend') {
      await this.initializeResend();
    } else {
      await this.initializeSmtp();
    }
  }

  private async initializeResend() {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'Resend API key not configured. Email notifications will be logged but not sent. Set RESEND_API_KEY in your environment.',
      );
      return;
    }

    try {
      this.resendClient = new Resend(apiKey);
      this.logger.log('Resend email service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Resend email service', error);
      this.resendClient = null;
    }
  }

  private async initializeSmtp() {
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('EMAIL_USER');
    const smtpPass = this.configService.get<string>('EMAIL_PASSWORD');

    if (!smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP credentials not configured. Email notifications will be logged but not sent.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Vérifier la connexion
    try {
      await this.transporter.verify();
      this.logger.log('SMTP email service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SMTP email service', error);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`Email not sent (disabled): ${options.subject} to ${options.to}`);
      return;
    }

    if (this.provider === 'resend') {
      return this.sendEmailWithResend(options);
    } else {
      return this.sendEmailWithSmtp(options);
    }
  }

  private async sendEmailWithResend(options: EmailOptions): Promise<void> {
    if (!this.resendClient) {
      this.logger.warn(
        `Email not sent (Resend not initialized): ${options.subject} to ${options.to}. Check RESEND_API_KEY configuration.`,
      );
      return;
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const from = options.from || this.defaultFrom;

      // Resend supporte l'envoi à plusieurs destinataires avec un seul appel
      for (const recipient of recipients) {
        const { data, error } = await this.resendClient.emails.send({
          from,
          to: recipient,
          subject: options.subject,
          html: options.html,
          text: options.text || this.htmlToText(options.html || ''),
        });

        if (error) {
          this.logger.error(`Failed to send email via Resend to ${recipient}:`, error);
        } else {
          this.logger.log(`Email sent via Resend: ${options.subject} to ${recipient} (ID: ${data?.id})`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send email via Resend: ${options.subject}`, error);
      // Ne pas throw pour ne pas bloquer le flow principal
    }
  }

  private async sendEmailWithSmtp(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email not sent (SMTP not initialized): ${options.subject} to ${options.to}. Check SMTP configuration.`,
      );
      return;
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: recipients.join(', '),
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html || ''),
      });

      this.logger.log(`Email sent via SMTP: ${options.subject} to ${recipients.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to send email via SMTP: ${options.subject}`, error);
      // Ne pas throw pour ne pas bloquer le flow principal
    }
  }

  private htmlToText(html: string): string {
    // Conversion basique HTML vers texte
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

