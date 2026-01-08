export type PaymentMethod = 'CARD' | 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'MOBILE_MONEY';

export interface CustomerInfo {
  email?: string;
  phone?: string;
  name?: string;
}

export interface PaymentOptions {
  /** Montant de la transaction en unité mineure (ex: centimes pour EUR, unités pour XAF) */
  amount: number;
  /** Code devise ISO 4217 (ex: 'XAF', 'EUR', 'USD') */
  currency: string;
  /** Code pays ISO 3166-1 alpha-2 (ex: 'GA' pour Gabon, 'CM' pour Cameroun) */
  countryCode: string;
  /** ID unique de la commande côté e-commerçant */
  orderId: string;
  /** Méthode de paiement */
  paymentMethod?: PaymentMethod;
  /** Informations client optionnelles */
  customer?: CustomerInfo;
  /** Métadonnées supplémentaires */
  metadata?: Record<string, unknown>;
  /** URL de retour après paiement */
  returnUrl?: string;
}

export interface PaymentResponse {
  paymentId: string;
  status: 'PENDING' | 'AUTHORIZED' | 'SUCCEEDED' | 'FAILED';
  checkoutUrl?: string;
  checkoutPayload?: {
    url?: string;
    stripeClientSecret?: string;
    stripeAccount?: string;
  };
  providerReference?: string;
  message?: string;
}

export interface BoohPaySDKConfig {
  /** Clé publique BoohPay (Publishable Key) */
  publishableKey: string;
  /** URL de l'API BoohPay (optionnel, par défaut: process.env.BOOHPAY_API_URL) */
  apiUrl?: string;
  /** Callback appelé lors d'un changement de statut */
  onStatusChange?: (status: PaymentResponse['status'], paymentId: string) => void;
  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void;
  /** Options de thème (pour compatibilité) */
  theme?: {
    primaryColor?: string;
    buttonColor?: string;
    fontFamily?: string;
  };
}

export interface BoohPayInstance {
  checkout: (options: PaymentOptions) => Promise<PaymentResponse>;
}


