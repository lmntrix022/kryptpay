import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ProviderCredentialsService } from './provider-credentials.service';

type EbillingCredentials = {
  username: string;
  sharedKey: string;
  baseUrl?: string;
};

type EbillingTestResponse = {
  success: boolean;
  message?: string;
  billId?: string;
};

@Injectable()
export class EbillingOnboardingService {
  private readonly logger = new Logger(EbillingOnboardingService.name);
  private readonly defaultBaseUrl: string;

  constructor(
    private readonly providerCredentialsService: ProviderCredentialsService,
    private readonly configService: ConfigService,
  ) {
    this.defaultBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>(
        'EBILLING_BASE_URL',
        'https://stg.billing-easy.com/api/v1/merchant',
      ),
    );
  }

  /**
   * Teste les credentials eBilling en créant une facture de test
   * eBilling utilise username + sharedKey avec Basic Auth (pas de clé API)
   */
  async testCredentials(credentials: EbillingCredentials): Promise<EbillingTestResponse> {
    const baseUrl = this.normalizeBaseUrl(credentials.baseUrl ?? this.defaultBaseUrl);
    const endpoint = `${baseUrl}/e_bills`;

    try {
      // Vérifier que username et sharedKey sont fournis (pas de clé API pour eBilling)
      if (!credentials.username || !credentials.sharedKey) {
        return {
          success: false,
          message: 'Username et Shared Key sont requis pour eBilling (pas de clé API)',
        };
      }

      // Créer une facture de test avec un montant minimal (1 XAF)
      const testPayload = {
        amount: '1',
        payer_name: 'BoohPay Test',
        payer_email: 'test@boohpay.com',
        payer_msisdn: '061234567',
        short_description: 'Test connexion BoohPay',
        external_reference: `TEST-${Date.now()}`,
        expiry_period: '5', // Expire dans 5 minutes
      };

      // Utiliser Basic Auth avec username:sharedKey (pas de clé API)
      const authHeader = `Basic ${Buffer.from(`${credentials.username}:${credentials.sharedKey}`).toString('base64')}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `eBilling test failed (${response.status})`;

        // Log détaillé pour debugging
        this.logger.debug(`eBilling test endpoint: ${endpoint}`);
        this.logger.debug(`eBilling response status: ${response.status}`);
        this.logger.debug(`eBilling response body: ${errorText.substring(0, 500)}`);

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = `eBilling test failed: ${errorJson.message}`;
          } else if (errorJson.error) {
            errorMessage = `eBilling test failed: ${errorJson.error}`;
          }
        } catch {
          // Si ce n'est pas du JSON, analyser le texte
          if (errorText.includes('Missing API key') || errorText.includes('API key')) {
            errorMessage = 'Erreur d\'authentification eBilling : Vérifiez que votre username et sharedKey sont corrects. eBilling n\'utilise pas de clé API.';
          } else if (errorText.includes('Auth invalid') || errorText.includes('Invalid auth')) {
            errorMessage = 'Erreur d\'authentification eBilling : Username ou sharedKey invalide. Vérifiez vos credentials.';
          } else if (errorText) {
            errorMessage = `eBilling test failed: ${errorText.substring(0, 200)}`;
          }
        }

        // Messages d'aide selon le code d'erreur
        if (response.status === 401 || errorMessage.includes('Auth invalid')) {
          errorMessage += ' Vérifiez que votre username et sharedKey sont corrects.';
        } else if (response.status === 404) {
          errorMessage += ' L\'endpoint est introuvable. Vérifiez l\'URL de base (stg.billing-easy.com pour staging).';
        }

        this.logger.warn(`eBilling credentials test failed: ${errorMessage}`);
        return {
          success: false,
          message: errorMessage,
        };
      }

      const json = (await response.json().catch(() => ({}))) as {
        bill_id?: string;
        id?: string;
        data?: { bill_id?: string };
        e_bill?: { bill_id?: string };
      };

      const billId =
        json.bill_id ?? json.id ?? json.data?.bill_id ?? json.e_bill?.bill_id;

      return {
        success: true,
        message: 'Credentials eBilling validés avec succès (username + sharedKey)',
        billId,
      };
    } catch (error) {
      this.logger.error('Error testing eBilling credentials', error as Error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Erreur inconnue lors du test des credentials',
      };
    }
  }

  /**
   * Sauvegarde les credentials eBilling pour un merchant
   */
  async saveCredentials(
    merchant_id: string,
    credentials: EbillingCredentials,
    environment = 'production',
  ): Promise<void> {
      await this.providerCredentialsService.setCredentials(merchant_id, 'EBILLING', environment, {
      username: credentials.username,
      sharedKey: credentials.sharedKey,
      baseUrl: credentials.baseUrl,
    });
  }

  /**
   * Vérifie si un merchant a déjà configuré eBilling
   */
  async getConnectionStatus(merchant_id: string): Promise<{
    connected: boolean;
    hasCredentials: boolean;
    environment?: string;
  }> {
    const credentials = await this.providerCredentialsService.getCredentials<EbillingCredentials>(
      merchant_id,
      'EBILLING',
    );

    return {
      connected: Boolean(credentials?.username && credentials?.sharedKey),
      hasCredentials: Boolean(credentials?.username || credentials?.sharedKey),
    };
  }

  /**
   * Vérifie s'il y a au moins un merchant connecté à eBilling (pour les admins)
   */
  async getAnyConnectionStatus(): Promise<{
    connected: boolean;
    hasCredentials: boolean;
    environment?: string;
  }> {
    const hasAnyCredentials = await this.providerCredentialsService.hasAnyCredentials('EBILLING');
    return {
      connected: hasAnyCredentials,
      hasCredentials: hasAnyCredentials,
    };
  }

  private generateSignature(
    sharedKey: string,
    timestamp: string,
    payload: Record<string, unknown>,
  ): string {
    // Utiliser la même méthode que le service principal eBilling
    const crypto = require('crypto');
    const payloadString = JSON.stringify(payload);
    const message = `${timestamp}${payloadString}`;
    return crypto.createHmac('sha256', sharedKey).update(message).digest('hex');
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/$/, '');
  }
}

