/**
 * Validation des numéros de téléphone pour Mobile Money
 */

const COUNTRY_PHONE_FORMATS: Record<string, RegExp> = {
  GA: /^(?:\+241|241|0)?[0-9]{8}$/, // Gabon
  CM: /^(?:\+237|237|0)?[0-9]{9}$/, // Cameroun
  CI: /^(?:\+225|225|0)?[0-9]{10}$/, // Côte d'Ivoire
  SN: /^(?:\+221|221|0)?[0-9]{9}$/, // Sénégal
};

const CARD_NUMBER_REGEX = /^[0-9]{13,19}$/;
const CARD_CVC_REGEX = /^[0-9]{3,4}$/;
const CARD_EXPIRY_REGEX = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;

export function validatePhoneNumber(phone: string, countryCode: string): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'Le numéro de téléphone est requis' };
  }

  // Nettoyer le numéro (supprimer espaces, tirets, etc.)
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Format spécifique au pays
  const format = COUNTRY_PHONE_FORMATS[countryCode.toUpperCase()];
  if (!format) {
    // Format générique pour les pays non listés
    if (cleaned.length < 8 || cleaned.length > 15) {
      return { valid: false, error: 'Numéro de téléphone invalide' };
    }
  } else if (!format.test(cleaned)) {
    return { valid: false, error: `Format invalide pour ${countryCode}` };
  }

  // Normaliser le numéro
  let normalized = cleaned;
  
  // Si le numéro commence par 00, remplacer par +
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.slice(2);
  }
  // Si le numéro ne commence ni par + ni par 0, ajouter le préfixe du pays
  else if (!normalized.startsWith('+') && !normalized.startsWith('0')) {
    const countryPrefix: Record<string, string> = {
      GA: '241',
      CM: '237',
      CI: '225',
      SN: '221',
    };
    const prefix = countryPrefix[countryCode.toUpperCase()];
    if (prefix) {
      normalized = '+' + prefix + normalized;
    }
  }
  
  // Pour le Gabon, s'assurer que le format est correct après normalisation
  // Le backend eBilling peut gérer: +2410743998524, 2410743998524, ou 0743998524
  // On garde le format avec + pour la compatibilité internationale
  
  return { valid: true, normalized };
}

export function validateCardNumber(cardNumber: string): {
  valid: boolean;
  error?: string;
} {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!CARD_NUMBER_REGEX.test(cleaned)) {
    return { valid: false, error: 'Numéro de carte invalide (13-19 chiffres requis)' };
  }

  // Algorithme de Luhn
  let sum = 0;
  let isEven = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: 'Numéro de carte invalide (Luhn check failed)' };
  }

  return { valid: true };
}

export function validateCardCVC(cvc: string): {
  valid: boolean;
  error?: string;
} {
  if (!CARD_CVC_REGEX.test(cvc)) {
    return { valid: false, error: 'CVC invalide (3 ou 4 chiffres requis)' };
  }
  return { valid: true };
}

export function validateCardExpiry(expiry: string): {
  valid: boolean;
  error?: string;
  month?: number;
  year?: number;
} {
  const match = expiry.match(CARD_EXPIRY_REGEX);
  if (!match) {
    return { valid: false, error: 'Date d\'expiration invalide (format MM/YY requis)' };
  }

  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  const now = new Date();
  const expiryDate = new Date(year, month - 1);
  const lastDayOfMonth = new Date(year, month, 0);

  if (expiryDate < now) {
    return { valid: false, error: 'La carte a expiré' };
  }

  return { valid: true, month, year };
}

export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Adresse email invalide' };
  }
  return { valid: true };
}

