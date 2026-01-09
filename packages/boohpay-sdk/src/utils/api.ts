import type { PaymentOptions, PaymentResponse } from '../types';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export class BoohPayAPIError extends Error {
  code?: string;
  statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'BoohPayAPIError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Génère une clé d'idempotency unique basée sur orderId + hash du body
 * Cela garantit qu'une même clé ne sera jamais utilisée avec un body différent
 */
function generateIdempotencyKey(orderId: string, requestBody: Record<string, unknown>): string {
  // Créer un hash simple du body pour garantir l'unicité
  const bodyString = JSON.stringify(requestBody);
  let hash = 0;
  for (let i = 0; i < bodyString.length; i++) {
    const char = bodyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const bodyHash = Math.abs(hash).toString(36);
  
  // Utiliser crypto.randomUUID si disponible pour une partie vraiment unique
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${orderId}-${bodyHash}-${crypto.randomUUID()}`;
  }
  // Fallback pour les environnements sans crypto.randomUUID
  return `${orderId}-${bodyHash}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export async function createPayment(
  options: PaymentOptions,
  apiUrl: string,
  apiKey: string,
): Promise<PaymentResponse> {
  const url = `${apiUrl}/payments`;

  // Map payment method: SDK uses AIRTEL_MONEY/MOOV_MONEY, backend expects CARD/MOBILE_MONEY
  const backendPaymentMethod = 
    options.paymentMethod === 'CARD' 
      ? 'CARD' 
      : options.paymentMethod || 'MOBILE_MONEY';

  // Préparer le body de la requête
  const requestBody = {
    orderId: options.orderId,
    amount: options.amount,
    currency: options.currency.toUpperCase(),
    countryCode: options.countryCode.toUpperCase(),
    paymentMethod: backendPaymentMethod,
    customer: options.customer,
    metadata: options.metadata,
    returnUrl: options.returnUrl,
  };

  // Générer une clé d'idempotency unique basée sur orderId + hash du body
  // Cela garantit qu'une même clé ne sera jamais utilisée avec un body différent
  const idempotencyKey = generateIdempotencyKey(options.orderId, requestBody);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    let data: any;
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      } else {
        data = {};
      }
    } catch (parseError) {
      // Si la réponse n'est pas du JSON valide
      data = { message: `Server returned invalid JSON (status ${response.status})` };
    }

    if (!response.ok) {
      // Fonction helper pour extraire un message d'erreur d'un objet
      const extractErrorMessage = (obj: any): string => {
        if (typeof obj === 'string') {
          return obj;
        }
        if (typeof obj === 'object' && obj !== null) {
          // Essayer plusieurs propriétés communes
          if (obj.message) return extractErrorMessage(obj.message);
          if (obj.error) return extractErrorMessage(obj.error);
          if (obj.errorMessage) return extractErrorMessage(obj.errorMessage);
          if (obj.msg) return extractErrorMessage(obj.msg);
          
          // Si c'est un tableau
          if (Array.isArray(obj)) {
            return obj.map(extractErrorMessage).filter(Boolean).join(', ');
          }
          
          // Si c'est un objet avec des propriétés
          const entries = Object.entries(obj);
          if (entries.length > 0) {
            const messages = entries
              .map(([key, value]) => {
                if (typeof value === 'string') return `${key}: ${value}`;
                if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
                return `${key}: ${JSON.stringify(value)}`;
              })
              .filter(Boolean);
            if (messages.length > 0) return messages.join('; ');
          }
          
          // Dernier recours : stringify
          try {
            return JSON.stringify(obj);
          } catch {
            return String(obj);
          }
        }
        return String(obj);
      };
      
      // Extraire le message d'erreur
      let errorMessage = 'Une erreur est survenue';
      
      // Essayer data.message, data.error, ou data.error.message
      if (data.message) {
        errorMessage = extractErrorMessage(data.message);
      } else if (data.error) {
        errorMessage = extractErrorMessage(data.error);
      } else if (data.error?.message) {
        errorMessage = extractErrorMessage(data.error.message);
      } else if (data.errors) {
        errorMessage = extractErrorMessage(data.errors);
      } else {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      // Pour les erreurs 400, extraire les détails de validation
      if (response.status === 400) {
        if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
          const validationErrors = Object.entries(data.errors)
            .map(([field, messages]) => {
              const msgs = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${msgs.map(m => extractErrorMessage(m)).join(', ')}`;
            })
            .join('; ');
          if (validationErrors) {
            errorMessage = validationErrors;
          }
        }
      }
      
      // Pour les erreurs 500, essayer d'extraire plus d'informations
      if (response.status === 500) {
        // Si on a un message spécifique, l'utiliser
        if (errorMessage && errorMessage !== 'Une erreur est survenue') {
          // Garder le message tel quel
        } else if (data.message) {
          errorMessage = extractErrorMessage(data.message);
        } else {
          errorMessage = 'Erreur serveur interne. Vérifiez le format du numéro de téléphone (pour le Gabon: 07XXXXXX ou 06XXXXXX) ou contactez le support.';
        }
      }
      
      // S'assurer que le message n'est pas vide
      if (!errorMessage || errorMessage.trim() === '') {
        errorMessage = `Erreur HTTP ${response.status}: ${response.statusText || 'Erreur inconnue'}`;
      }
      
      throw new BoohPayAPIError(
        errorMessage,
        data.code || data.error?.code,
        response.status,
      );
    }

    return {
      paymentId: data.paymentId,
      status: data.status,
      checkoutUrl: data.checkoutUrl,
      checkoutPayload: data.checkoutPayload,
      providerReference: data.providerReference,
      message: data.message,
    };
  } catch (error) {
    if (error instanceof BoohPayAPIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new BoohPayAPIError(
        'Impossible de se connecter à l\'API BoohPay. Vérifiez votre connexion internet.',
        'NETWORK_ERROR',
      );
    }

    throw new BoohPayAPIError(
      error instanceof Error ? error.message : 'Erreur inconnue lors de la création du paiement',
      'UNKNOWN_ERROR',
    );
  }
}

export async function getPaymentStatus(
  paymentId: string,
  apiUrl: string,
  apiKey: string,
): Promise<PaymentResponse> {
  const url = `${apiUrl}/payments/${paymentId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new BoohPayAPIError(
        data.message || `HTTP ${response.status}: ${response.statusText}`,
        data.code,
        response.status,
      );
    }

    return {
      paymentId: data.paymentId,
      status: data.status,
      checkoutUrl: data.checkoutUrl,
      checkoutPayload: data.checkoutPayload,
      providerReference: data.providerReference,
      message: data.message,
    };
  } catch (error) {
    if (error instanceof BoohPayAPIError) {
      throw error;
    }

    throw new BoohPayAPIError(
      error instanceof Error ? error.message : 'Erreur inconnue lors de la récupération du statut',
      'UNKNOWN_ERROR',
    );
  }
}

