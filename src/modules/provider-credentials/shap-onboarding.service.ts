import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ProviderCredentialsService } from './provider-credentials.service';

type ShapCredentials = {
  apiId: string;
  apiSecret: string;
  baseUrl?: string;
};

type ShapAuthResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type ShapTestResponse = {
  success: boolean;
  message?: string;
  tokenValid?: boolean;
};

@Injectable()
export class ShapOnboardingService {
  private readonly logger = new Logger(ShapOnboardingService.name);
  private readonly defaultBaseUrl: string;

  constructor(
    private readonly providerCredentialsService: ProviderCredentialsService,
    private readonly configService: ConfigService,
  ) {
    this.defaultBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>(
        'SHAP_BASE_URL',
        'https://staging.billing-easy.net/shap/api/v1/merchant',
      ),
    );
  }

  /**
   * Teste les credentials SHAP en obtenant un token d'accès
   */
  async testCredentials(credentials: ShapCredentials): Promise<ShapTestResponse> {
    const baseUrl = this.normalizeBaseUrl(credentials.baseUrl ?? this.defaultBaseUrl);
    const authEndpoint = `${baseUrl}/auth`;

    try {
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_id: credentials.apiId,
          api_secret: credentials.apiSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `SHAP authentication failed (${response.status})`;

        // Log détaillé pour debugging
        this.logger.debug(`SHAP auth endpoint: ${authEndpoint}`);
        this.logger.debug(`SHAP response status: ${response.status}`);
        this.logger.debug(`SHAP response body: ${errorText.substring(0, 500)}`);

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = `SHAP authentication failed: ${errorJson.message}`;
          } else if (errorJson.error) {
            errorMessage = `SHAP authentication failed: ${errorJson.error}`;
          } else if (errorJson.error_code) {
            errorMessage = `SHAP authentication failed [${errorJson.error_code}]: ${errorJson.error_description || errorJson.error}`;
          }
        } catch {
          if (errorText) {
            errorMessage = `SHAP authentication failed: ${errorText}`;
          }
        }

        // Messages d'aide selon le code d'erreur
        if (response.status === 401 || errorMessage.includes('invalid_grant')) {
          errorMessage += '. Vérifiez que votre api_id et api_secret sont corrects.';
        } else if (response.status === 404) {
          errorMessage += '. L\'endpoint d\'authentification est introuvable. Vérifiez l\'URL de base.';
        }

        this.logger.warn(`SHAP credentials test failed: ${errorMessage}`);
        return {
          success: false,
          message: errorMessage,
        };
      }

      const auth = (await response.json().catch(() => ({}))) as Partial<ShapAuthResponse>;
      const token = auth.access_token;
      const expiresIn = Number(auth.expires_in ?? 0);

      if (!token) {
        return {
          success: false,
          message: 'Réponse d\'authentification SHAP invalide (token manquant)',
        };
      }

      return {
        success: true,
        message: 'Credentials SHAP validés avec succès',
        tokenValid: true,
      };
    } catch (error) {
      this.logger.error('Error testing SHAP credentials', error as Error);
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
   * Sauvegarde les credentials SHAP pour un merchant
   */
  async saveCredentials(
    merchant_id: string,
    credentials: ShapCredentials,
    environment = 'production',
  ): Promise<void> {
      await this.providerCredentialsService.setCredentials(merchant_id, 'SHAP', environment, {
      apiId: credentials.apiId,
      apiSecret: credentials.apiSecret,
      baseUrl: credentials.baseUrl,
    });
  }

  /**
   * Vérifie si un merchant a déjà configuré SHAP
   */
  async getConnectionStatus(merchant_id: string): Promise<{
    connected: boolean;
    hasCredentials: boolean;
    environment?: string;
  }> {
    const credentials = await this.providerCredentialsService.getCredentials<ShapCredentials>(
      merchant_id,
      'SHAP',
    );

    return {
      connected: Boolean(credentials?.apiId && credentials?.apiSecret),
      hasCredentials: Boolean(credentials?.apiId || credentials?.apiSecret),
    };
  }

  /**
   * Vérifie s'il y a au moins un merchant connecté à SHAP (pour les admins)
   */
  async getAnyConnectionStatus(): Promise<{
    connected: boolean;
    hasCredentials: boolean;
    environment?: string;
  }> {
    const hasAnyCredentials = await this.providerCredentialsService.hasAnyCredentials('SHAP');
    return {
      connected: hasAnyCredentials,
      hasCredentials: hasAnyCredentials,
    };
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/$/, '');
  }
}


