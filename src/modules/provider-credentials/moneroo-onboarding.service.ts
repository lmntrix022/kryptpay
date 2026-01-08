import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ProviderCredentialsService } from './provider-credentials.service';

type MonerooCredentials = {
  secretKey: string;
  publicKey?: string;
};

type MonerooTestResponse = {
  success: boolean;
  message?: string;
  credentialsValid?: boolean;
};

@Injectable()
export class MonerooOnboardingService {
  private readonly logger = new Logger(MonerooOnboardingService.name);
  private readonly defaultBaseUrl = 'https://api.moneroo.io';

  constructor(
    private readonly providerCredentialsService: ProviderCredentialsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Teste les credentials Moneroo
   * 
   * Note: L'API Moneroo ne fournit pas d'endpoint simple pour tester les credentials.
   * On valide donc le format de la clé API. Le test réel se fera lors du premier paiement.
   */
  async testCredentials(credentials: MonerooCredentials): Promise<MonerooTestResponse> {
    try {
      // Validation du format de la clé API
      if (!credentials.secretKey) {
        return {
          success: false,
          message: 'Clé API secrète requise',
          credentialsValid: false,
        };
      }

      // Vérifier la longueur minimale (les clés API Moneroo font généralement au moins 20 caractères)
      if (credentials.secretKey.length < 10) {
        return {
          success: false,
          message: 'Format de clé API invalide (trop courte)',
          credentialsValid: false,
        };
      }

      // Vérifier que ce n'est pas une valeur de test par défaut
      const testValues = ['moneroo_test_key', 'test', 'demo', 'example'];
      if (testValues.some((val) => credentials.secretKey.toLowerCase().includes(val))) {
        this.logger.warn('Moneroo credentials appear to be test/demo values');
        return {
          success: false,
          message: 'Veuillez utiliser une vraie clé API Moneroo (pas une valeur de test)',
          credentialsValid: false,
        };
      }

      // Le format semble valide
      // Note: On ne peut pas vraiment tester sans créer un paiement, donc on accepte si le format est correct
      // Le test réel se fera lors du premier paiement
      this.logger.log('Moneroo credentials format validated. Real test will occur on first payment.');
      
      return {
        success: true,
        message: 'Format de clé API valide. Les credentials seront testés lors du premier paiement.',
        credentialsValid: true,
      };
    } catch (error) {
      this.logger.error('Error testing Moneroo credentials', error as Error);

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
   * Sauvegarde les credentials Moneroo pour un merchant
   */
  async saveCredentials(
    merchant_id: string,
    credentials: MonerooCredentials,
    environment = 'production',
  ): Promise<void> {
      await this.providerCredentialsService.setCredentials(merchant_id, 'MONEROO', environment, {
      secretKey: credentials.secretKey,
      publicKey: credentials.publicKey,
    });
  }

  /**
   * Vérifie si un merchant a déjà configuré Moneroo
   */
  async getConnectionStatus(merchant_id: string): Promise<{
    connected: boolean;
    hasCredentials: boolean;
    environment?: string;
    provider: 'MONEROO';
  }> {
    const credentials = await this.providerCredentialsService.getCredentials<MonerooCredentials>(
      merchant_id,
      'MONEROO',
    );

    return {
      connected: Boolean(credentials?.secretKey),
      hasCredentials: Boolean(credentials?.secretKey),
      provider: 'MONEROO',
    };
  }

  /**
   * Vérifie s'il y a au moins un merchant connecté à Moneroo (pour les admins)
   */
  async getAnyConnectionStatus(): Promise<{
    connected: boolean;
    hasCredentials: boolean;
    provider: 'MONEROO';
  }> {
    const hasAnyCredentials = await this.providerCredentialsService.hasAnyCredentials('MONEROO');
    return {
      connected: hasAnyCredentials,
      hasCredentials: hasAnyCredentials,
      provider: 'MONEROO',
    };
  }
}


