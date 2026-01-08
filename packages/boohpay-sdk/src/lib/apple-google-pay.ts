// Apple Pay & Google Pay support

export interface AppleGooglePayConfig {
  stripePublishableKey: string;
  amount: number;
  currency: string;
  countryCode: string;
  merchantDisplayName?: string;
  requiredBillingContactFields?: string[];
  requiredShippingContactFields?: string[];
}

export interface PaymentRequestConfig {
  total: {
    label: string;
    amount: number;
  };
  country: string;
  currency: string;
  requestPayerName: boolean;
  requestPayerEmail: boolean;
  requestPayerPhone: boolean;
}

/**
 * Vérifie si Apple Pay est disponible
 */
export function isApplePayAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  // iOS Safari
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return 'ApplePaySession' in window;
  }
  
  // macOS Safari
  if (/Macintosh/.test(navigator.userAgent)) {
    return 'ApplePaySession' in window;
  }
  
  return false;
}

/**
 * Vérifie si Google Pay est disponible
 * Note: En développement, cette fonction peut générer des warnings "Unable to download payment manifest"
 * car le navigateur essaie de télécharger le manifest Google Pay. C'est normal et n'affecte pas le fonctionnement.
 * 
 * Pour éviter ces warnings, on vérifie uniquement si PaymentRequest est disponible
 * sans créer d'instance qui déclencherait une requête réseau.
 */
export function isGooglePayAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Vérifier si Payment Request API est supporté
  if (!('PaymentRequest' in window)) {
    return false;
  }
  
  // Vérifier si on est sur Chrome/Edge (qui supportent Google Pay)
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  const isEdge = /Edg/.test(navigator.userAgent);
  
  // Google Pay est principalement disponible sur Chrome/Edge
  // On retourne true si PaymentRequest est disponible et qu'on est sur un navigateur compatible
  // La vérification réelle se fera via Stripe PaymentRequest qui gère mieux les erreurs
  return isChrome || isEdge;
}

/**
 * Vérifie si les paiements digitaux sont disponibles
 */
export function isDigitalWalletAvailable(): boolean {
  return isApplePayAvailable() || isGooglePayAvailable();
}

/**
 * Crée une Payment Request pour Google Pay
 */
export function createPaymentRequest(config: PaymentRequestConfig): PaymentRequest | null {
  if (typeof window === 'undefined' || !('PaymentRequest' in window)) {
    return null;
  }
  
  const methods = [
    {
      supportedMethods: 'https://google.com/pay',
      data: {
        environment: 'TEST', // ou 'PRODUCTION'
        apiVersion: 2,
        apiVersionMinor: 0,
        merchantInfo: {
          merchantId: config.country,
          merchantName: config.total.label,
        },
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['MASTERCARD', 'VISA'],
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'stripe',
                'stripe:version': '2018-10-31',
                'stripe:publishableKey': '', // Sera fourni dynamiquement
              },
            },
          },
        ],
      },
    },
  ];
  
  try {
    return new PaymentRequest(methods as any, config as any);
  } catch (e) {
    console.error('Failed to create PaymentRequest:', e);
    return null;
  }
}

/**
 * Initie Apple Pay avec Stripe
 */
export async function initiateApplePay(config: AppleGooglePayConfig): Promise<any> {
  if (!isApplePayAvailable()) {
    throw new Error('Apple Pay is not available');
  }
  
  // Apple Pay nécessite une integration Stripe
  const stripe = (window as any).Stripe?.(config.stripePublishableKey);
  if (!stripe) {
    throw new Error('Stripe.js is not loaded');
  }
  
  try {
    const paymentRequest = stripe.paymentRequest({
      country: config.countryCode,
      currency: config.currency.toLowerCase(),
      total: {
        label: config.merchantDisplayName || 'Order',
        amount: config.amount,
      },
      requestPayerName: config.requiredBillingContactFields?.includes('name'),
      requestPayerEmail: config.requiredBillingContactFields?.includes('email'),
      requestPayerPhone: config.requiredBillingContactFields?.includes('phone'),
    });
    
    // Vérifier si Apple Pay est disponible
    const canMakePayment = await paymentRequest.canMakePayment();
    if (!canMakePayment) {
      throw new Error('Apple Pay is not available on this device');
    }
    
    return paymentRequest;
  } catch (error) {
    console.error('Apple Pay error:', error);
    throw error;
  }
}

/**
 * Initie Google Pay avec Stripe
 */
export async function initiateGooglePay(config: AppleGooglePayConfig): Promise<any> {
  if (!isGooglePayAvailable()) {
    throw new Error('Google Pay is not available');
  }
  
  const stripe = (window as any).Stripe?.(config.stripePublishableKey);
  if (!stripe) {
    throw new Error('Stripe.js is not loaded');
  }
  
  try {
    const paymentRequest = stripe.paymentRequest({
      country: config.countryCode,
      currency: config.currency.toLowerCase(),
      total: {
        label: config.merchantDisplayName || 'Order',
        amount: config.amount,
      },
      requestPayerName: config.requiredBillingContactFields?.includes('name'),
      requestPayerEmail: config.requiredBillingContactFields?.includes('email'),
      requestPayerPhone: config.requiredBillingContactFields?.includes('phone'),
    });
    
    const canMakePayment = await paymentRequest.canMakePayment();
    if (!canMakePayment?.googlePay) {
      throw new Error('Google Pay is not available');
    }
    
    return paymentRequest;
  } catch (error) {
    console.error('Google Pay error:', error);
    throw error;
  }
}

/**
 * Détecte automatiquement les wallets disponibles
 */
export interface AvailableWallets {
  applePay: boolean;
  googlePay: boolean;
  digitalWallets: boolean;
}

export function detectAvailableWallets(): AvailableWallets {
  return {
    applePay: isApplePayAvailable(),
    googlePay: isGooglePayAvailable(),
    digitalWallets: isDigitalWalletAvailable(),
  };
}

