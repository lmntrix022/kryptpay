// Système de localisation pour le SDK

export type Locale = 'en' | 'fr' | 'es' | 'de' | 'pt' | 'it' | 'ar';

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Card fields
    'card.number': 'Card Number',
    'card.expiry': 'Expiry Date',
    'card.cvc': 'CVC',
    'card.name': 'Cardholder Name',
    
    // Mobile Money fields
    'mobile.phone': 'Phone Number',
    'mobile.email': 'Email (optional)',
    
    // Methods
    'method.card': '💳 Credit Card',
    'method.airtel': '📱 Airtel Money',
    'method.moov': '📱 Moov Money',
    'method.mobile': '📱 Mobile Money',
    
    // Validation errors
    'error.required': 'This field is required',
    'error.invalid': 'Invalid value',
    'error.card.number': 'Invalid card number',
    'error.card.expiry': 'Invalid expiry date',
    'error.card.cvc': 'Invalid CVC',
    'error.phone': 'Invalid phone number',
    'error.email': 'Invalid email address',
    
    // Messages
    'success.title': 'Payment Successful',
    'success.message': 'Your payment was processed successfully',
    'error.title': 'Payment Error',
    'loading': 'Processing...',
    
    // Buttons
    'button.pay': 'Pay',
    'button.processing': 'Processing...',
    
    // Detection
    'detected.airtel': 'Airtel Money detected',
    'detected.moov': 'Moov Money detected',
    
    // Formats
    'format.phone': 'e.g. 07XXXXXX or 06XXXXXX',
    'format.card': 'e.g. 1234 5678 9012 3456',
    'format.expiry': 'MM/YY',
  },
  
  fr: {
    // Card fields
    'card.number': 'Numéro de carte',
    'card.expiry': 'Date d\'expiration',
    'card.cvc': 'CVC',
    'card.name': 'Nom du titulaire',
    
    // Mobile Money fields
    'mobile.phone': 'Numéro de téléphone',
    'mobile.email': 'Email (optionnel)',
    
    // Methods
    'method.card': '💳 Carte Bancaire',
    'method.airtel': '📱 Airtel Money',
    'method.moov': '📱 Moov Money',
    'method.mobile': '📱 Mobile Money',
    
    // Validation errors
    'error.required': 'Ce champ est requis',
    'error.invalid': 'Valeur invalide',
    'error.card.number': 'Numéro de carte invalide',
    'error.card.expiry': 'Date d\'expiration invalide',
    'error.card.cvc': 'CVC invalide',
    'error.phone': 'Numéro de téléphone invalide',
    'error.email': 'Adresse email invalide',
    
    // Messages
    'success.title': 'Paiement réussi',
    'success.message': 'Votre paiement a été traité avec succès',
    'error.title': 'Erreur de paiement',
    'loading': 'Traitement en cours...',
    
    // Buttons
    'button.pay': 'Payer',
    'button.processing': 'Traitement en cours...',
    
    // Detection
    'detected.airtel': 'Airtel Money détecté',
    'detected.moov': 'Moov Money détecté',
    
    // Formats
    'format.phone': 'ex: 07XXXXXX ou 06XXXXXX',
    'format.card': 'ex: 1234 5678 9012 3456',
    'format.expiry': 'MM/AA',
  },
  
  es: {
    'card.number': 'Número de tarjeta',
    'card.expiry': 'Fecha de vencimiento',
    'card.cvc': 'CVC',
    'card.name': 'Nombre del titular',
    'mobile.phone': 'Número de teléfono',
    'method.card': '💳 Tarjeta de Crédito',
    'button.pay': 'Pagar',
    'error.required': 'Este campo es obligatorio',
    'loading': 'Procesando...',
  },
  
  de: {
    'card.number': 'Kartennummer',
    'card.expiry': 'Ablaufdatum',
    'card.cvc': 'CVC',
    'card.name': 'Karteninhaber',
    'mobile.phone': 'Telefonnummer',
    'method.card': '💳 Kreditkarte',
    'button.pay': 'Bezahlen',
    'error.required': 'Dieses Feld ist erforderlich',
    'loading': 'Verarbeitung...',
  },
  
  pt: {
    'card.number': 'Número do cartão',
    'card.expiry': 'Data de validade',
    'card.cvc': 'CVC',
    'card.name': 'Nome do titular',
    'mobile.phone': 'Número de telefone',
    'method.card': '💳 Cartão de Crédito',
    'button.pay': 'Pagar',
    'error.required': 'Este campo é obrigatório',
    'loading': 'Processando...',
  },
  
  it: {
    'card.number': 'Numero carta',
    'card.expiry': 'Data di scadenza',
    'card.cvc': 'CVC',
    'card.name': 'Nome intestatario',
    'mobile.phone': 'Numero di telefono',
    'method.card': '💳 Carta di Credito',
    'button.pay': 'Paga',
    'error.required': 'Questo campo è obbligatorio',
    'loading': 'Elaborazione...',
  },
  
  ar: {
    'card.number': 'رقم البطاقة',
    'card.expiry': 'تاريخ الانتهاء',
    'card.cvc': 'CVC',
    'card.name': 'اسم حامل البطاقة',
    'mobile.phone': 'رقم الهاتف',
    'method.card': '💳 بطاقة ائتمان',
    'button.pay': 'ادفع',
    'error.required': 'هذا الحقل مطلوب',
    'loading': 'جاري المعالجة...',
  },
};

/**
 * Hook React pour utiliser les traductions
 */
export function useTranslation(locale: Locale) {
  // Utiliser useCallback pour mémoriser la fonction t
  // Note: Cette fonction est appelée dans un composant React, donc on peut utiliser useCallback
  // Cependant, pour que cela fonctionne vraiment comme un hook, il faudrait importer React
  // Pour l'instant, on crée une fonction qui utilise locale dynamiquement
  const t = (key: string): string => {
    return translations[locale]?.[key] || translations.en[key] || key;
  };
  
  return { t, locale };
}

/**
 * Fonction utilitaire pour obtenir une traduction
 */
export function translate(locale: Locale, key: string): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

/**
 * Détection automatique de la locale depuis le navigateur
 */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language || (navigator as any).userLanguage;
  const lang = browserLang.split('-')[0];
  
  const supportedLocales: Locale[] = ['en', 'fr', 'es', 'de', 'pt', 'it', 'ar'];
  return supportedLocales.includes(lang as Locale) ? (lang as Locale) : 'en';
}

