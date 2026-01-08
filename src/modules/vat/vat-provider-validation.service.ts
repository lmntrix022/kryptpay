import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderCredentialsService } from '../provider-credentials/provider-credentials.service';

type PayoutProvider = 'STRIPE' | 'MONEROO' | 'SHAP';

export interface ProviderAvailability {
  provider: PayoutProvider;
  available: boolean;
  hasMerchantCredentials: boolean;
  hasSystemDefault: boolean;
}

export interface ReversementValidation {
  canEnableAutoReversement: boolean;
  availableProviders: PayoutProvider[];
  accountType?: 'bank' | 'mobile_money' | 'unknown';
  compatibleProviders: PayoutProvider[];
  warnings: string[];
  suggestions: string[];
}

@Injectable()
export class VatProviderValidationService {
  private readonly logger = new Logger(VatProviderValidationService.name);

  constructor(
    private readonly providerCredentialsService: ProviderCredentialsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Vérifie quels providers de versement sont disponibles pour un marchand
   */
  async checkAvailableProviders(merchant_id: string): Promise<ProviderAvailability[]> {
    const providers: PayoutProvider[] = ['STRIPE', 'MONEROO', 'SHAP'];
    const availabilities: ProviderAvailability[] = [];

    for (const provider of providers) {
      const availability = await this.checkProviderAvailability(merchant_id, provider);
      availabilities.push(availability);
    }

    return availabilities;
  }

  /**
   * Vérifie si un provider spécifique est disponible
   */
  private async checkProviderAvailability(
    merchant_id: string,
    provider: PayoutProvider,
  ): Promise<ProviderAvailability> {
    // Vérifier les credentials du marchand
    const merchantCredentials = await this.providerCredentialsService.getCredentials(
      merchant_id,
      provider,
    );

    // Vérifier les credentials système (variables d'environnement)
    const hasSystemDefault = this.hasSystemDefaultCredentials(provider);

    const available = !!(merchantCredentials || hasSystemDefault);

    return {
      provider,
      available,
      hasMerchantCredentials: !!merchantCredentials,
      hasSystemDefault,
    };
  }

  /**
   * Vérifie si des credentials système sont disponibles pour un provider
   */
  private hasSystemDefaultCredentials(provider: PayoutProvider): boolean {
    switch (provider) {
      case 'STRIPE':
        return !!this.configService.get<string>('STRIPE_SECRET_KEY');
      case 'MONEROO':
        return !!this.configService.get<string>('MONEROO_SECRET_KEY');
      case 'SHAP':
        return !!(
          this.configService.get<string>('SHAP_API_ID') &&
          this.configService.get<string>('SHAP_API_SECRET')
        );
      default:
        return false;
    }
  }

  /**
   * Détecte le type de compte (bancaire ou Mobile Money)
   */
  detectAccountType(account: string | null | undefined): 'bank' | 'mobile_money' | 'unknown' {
    if (!account || account.trim().length === 0) {
      return 'unknown';
    }

    const cleaned = account.replace(/\s/g, '').toUpperCase();

    // Détecter IBAN (commence par 2 lettres + 2 chiffres)
    if (/^[A-Z]{2}\d{2}/.test(cleaned)) {
      return 'bank';
    }

    // Détecter numéro de téléphone (8-15 chiffres, peut commencer par +)
    if (/^\+?[0-9]{8,15}$/.test(cleaned.replace(/[^+0-9]/g, ''))) {
      return 'mobile_money';
    }

    // Si ça commence par "FR" ou contient "IBAN", c'est probablement bancaire
    if (cleaned.includes('IBAN') || cleaned.startsWith('FR')) {
      return 'bank';
    }

    return 'unknown';
  }

  /**
   * Valide la configuration du reversement automatique
   */
  async validateReversementConfiguration(
    merchant_id: string,
    reversementAccount?: string | null,
    sellerCountry?: string,
  ): Promise<ReversementValidation> {
    const availabilities = await this.checkAvailableProviders(merchant_id);
    const availableProviders = availabilities
      .filter((a) => a.available)
      .map((a) => a.provider);

    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Si aucun provider disponible
    if (availableProviders.length === 0) {
      return {
        canEnableAutoReversement: false,
        availableProviders: [],
        compatibleProviders: [],
        warnings: [
          'Aucun provider de versement configuré. Le reversement automatique ne peut pas être activé.',
        ],
        suggestions: [
          'Configurez Stripe dans Dashboard > Integrations pour reversement vers comptes bancaires',
          'Configurez Shap pour reversement vers Mobile Money (Gabon)',
          'Configurez Moneroo pour reversement vers Mobile Money (autres pays)',
        ],
      };
    }

    // Si un compte de reversement est fourni, vérifier la compatibilité
    if (reversementAccount) {
      const accountType = this.detectAccountType(reversementAccount);
      const compatibleProviders = this.getCompatibleProviders(accountType, availableProviders);

      if (compatibleProviders.length === 0) {
        if (accountType === 'bank') {
          warnings.push(
            'Le compte de reversement semble être un compte bancaire (IBAN), mais Stripe n\'est pas configuré.',
          );
          suggestions.push('Configurez Stripe pour activer le reversement vers compte bancaire');
        } else if (accountType === 'mobile_money') {
          warnings.push(
            'Le compte de reversement semble être un numéro Mobile Money, mais aucun provider Mobile Money n\'est configuré.',
          );
          if (sellerCountry === 'GA') {
            suggestions.push('Configurez Shap pour reversement vers Mobile Money au Gabon');
          } else {
            suggestions.push('Configurez Moneroo ou Shap pour reversement vers Mobile Money');
          }
        } else {
          warnings.push(
            'Le type de compte de reversement n\'a pas pu être détecté. Vérifiez que le format est correct (IBAN pour bancaire, numéro de téléphone pour Mobile Money).',
          );
        }
      } else {
        // Fournir des suggestions supplémentaires si d'autres providers sont disponibles
        if (accountType === 'bank' && availableProviders.includes('SHAP')) {
          suggestions.push(
            'Note : Shap est configuré mais ne peut pas être utilisé pour reversement vers compte bancaire. Utilisez Stripe.',
          );
        }
        if (accountType === 'mobile_money' && availableProviders.includes('STRIPE')) {
          suggestions.push(
            'Note : Stripe est configuré mais ne peut pas être utilisé pour reversement vers Mobile Money. Utilisez Shap ou Moneroo.',
          );
        }
      }

      return {
        canEnableAutoReversement: compatibleProviders.length > 0,
        availableProviders,
        accountType,
        compatibleProviders,
        warnings,
        suggestions,
      };
    }

    // Pas de compte de reversement fourni
    if (availableProviders.length > 0) {
      suggestions.push(
        'Configurez un compte de reversement pour activer le reversement automatique.',
      );
    }

    return {
      canEnableAutoReversement: false,
      availableProviders,
      compatibleProviders: [],
      warnings: ['Le compte de reversement est requis pour activer le reversement automatique.'],
      suggestions,
    };
  }

  /**
   * Détermine quels providers sont compatibles avec un type de compte
   */
  private getCompatibleProviders(
    accountType: 'bank' | 'mobile_money' | 'unknown',
    availableProviders: PayoutProvider[],
  ): PayoutProvider[] {
    if (accountType === 'bank') {
      return availableProviders.filter((p) => p === 'STRIPE');
    }

    if (accountType === 'mobile_money') {
      return availableProviders.filter((p) => p === 'SHAP' || p === 'MONEROO');
    }

    // Pour 'unknown', on considère que tous les providers pourraient fonctionner
    return availableProviders;
  }

  /**
   * Suggère le meilleur provider pour un type de compte et un pays donné
   */
  suggestProvider(
    accountType: 'bank' | 'mobile_money' | 'unknown',
    sellerCountry?: string,
    availableProviders: PayoutProvider[] = [],
  ): PayoutProvider | null {
    if (accountType === 'bank') {
      return availableProviders.includes('STRIPE') ? 'STRIPE' : null;
    }

    if (accountType === 'mobile_money') {
      // Pour le Gabon, préférer Shap
      if (sellerCountry === 'GA' && availableProviders.includes('SHAP')) {
        return 'SHAP';
      }
      // Sinon, préférer Moneroo
      if (availableProviders.includes('MONEROO')) {
        return 'MONEROO';
      }
      // Sinon, Shap si disponible
      if (availableProviders.includes('SHAP')) {
        return 'SHAP';
      }
    }

    return null;
  }
}











