/**
 * Détecte automatiquement le système de paiement
 * basé sur le préfixe du numéro de téléphone et le code pays
 * 
 * Supporte tous les systèmes disponibles dans SHAP et Moneroo:
 * - MTN (Bénin, Côte d'Ivoire, Cameroun, Ghana, Nigeria, Rwanda, Ouganda, Zambie)
 * - Moov (Bénin, Côte d'Ivoire, Togo, Mali)
 * - Orange (Côte d'Ivoire, Cameroun, Mali, Sénégal)
 * - Airtel (Nigeria, Rwanda, Tanzanie, Ouganda, Zambie)
 * - M-Pesa (Kenya)
 * - Wave (Côte d'Ivoire, Sénégal)
 */

export type PaymentSystem = 
  | 'airtelmoney' 
  | 'moovmoney4'
  | 'mtn_bj' | 'mtn_ci' | 'mtn_cm' | 'mtn_gh' | 'mtn_ng' | 'mtn_rw' | 'mtn_ug' | 'mtn_zm'
  | 'moov_bj' | 'moov_ci' | 'moov_tg' | 'moov_ml'
  | 'orange_ci' | 'orange_cm' | 'orange_ml' | 'orange_sn'
  | 'airtel_ng' | 'airtel_rw' | 'airtel_tz' | 'airtel_ug' | 'airtel_zm'
  | 'mpesa_ke'
  | 'wave_ci' | 'wave_sn';

/**
 * Mapping des préfixes par opérateur et par pays
 * Format: { countryCode: { prefix: operator } }
 */
const OPERATOR_PREFIXES: Record<string, Record<string, PaymentSystem>> = {
  // Bénin (229)
  '229': {
    // MTN Bénin (Moov Africa - ancien Moov devenu MTN)
    '96': 'mtn_bj',
    '97': 'mtn_bj',
    '98': 'mtn_bj',
    // Moov Bénin (Moov Money)
    '61': 'moov_bj',
    '62': 'moov_bj',
    '63': 'moov_bj',
    '64': 'moov_bj',
    '65': 'moov_bj',
    '66': 'moov_bj',
    '67': 'moov_bj',
    '68': 'moov_bj',
    '91': 'moov_bj',
    '92': 'moov_bj',
    '93': 'moov_bj',
    '94': 'moov_bj',
    '95': 'moov_bj',
    '99': 'moov_bj',
  },
  // Togo (228)
  '228': {
    // Moov Togo
    '70': 'moov_tg',
    '96': 'moov_tg',
    '97': 'moov_tg',
    // Togocom (Togo Telecom) - peut être utilisé via Moneroo avec MTN
    '90': 'mtn_bj',
    '91': 'mtn_bj',
    '92': 'mtn_bj',
    '93': 'mtn_bj',
  },
  // Côte d'Ivoire (225)
  '225': {
    // MTN Côte d'Ivoire
    '07': 'mtn_ci',
    '08': 'mtn_ci',
    // Orange Côte d'Ivoire
    '05': 'orange_ci',
    '06': 'orange_ci',
    // Moov Côte d'Ivoire
    '01': 'moov_ci',
    '02': 'moov_ci',
    '03': 'moov_ci',
    '04': 'moov_ci',
    // Wave Côte d'Ivoire (utilise souvent les mêmes préfixes qu'Orange)
    // Wave n'a pas de préfixes spécifiques, détecté via autre logique
  },
  // Gabon (241)
  '241': {
    // Airtel Money Gabon (via SHAP)
    '07': 'airtelmoney',
    // Moov Money 4 Gabon (via SHAP)
    '06': 'moovmoney4',
    '05': 'moovmoney4',
  },
  // Cameroun (237)
  '237': {
    // MTN Cameroun
    '67': 'mtn_cm',
    '68': 'mtn_cm',
    '69': 'mtn_cm',
    // Orange Cameroun
    '65': 'orange_cm',
    '66': 'orange_cm',
    // Autres opérateurs (Nexttel, etc.)
  },
  // Sénégal (221)
  '221': {
    // Orange Sénégal
    '77': 'orange_sn',
    '78': 'orange_sn',
    // Wave Sénégal (peut partager les préfixes)
    '70': 'wave_sn',
    '76': 'wave_sn',
  },
  // Mali (223)
  '223': {
    // Orange Mali
    '70': 'orange_ml',
    '76': 'orange_ml',
    '77': 'orange_ml',
    // Moov Mali
    '79': 'moov_ml',
    '90': 'moov_ml',
    '91': 'moov_ml',
  },
  // Nigeria (234)
  '234': {
    // MTN Nigeria
    '80': 'mtn_ng',
    '81': 'mtn_ng',
    '90': 'mtn_ng',
    '70': 'mtn_ng', // Conflit avec Airtel, priorité à MTN
    // Airtel Nigeria (clés en conflit supprimées, priorité à MTN)
  },
  // Kenya (254)
  '254': {
    // M-Pesa (Safaricom)
    '70': 'mpesa_ke',
    '71': 'mpesa_ke',
    '72': 'mpesa_ke',
    // Airtel Kenya
    '73': 'airtel_ug',
  },
  // Ghana (233)
  '233': {
    // MTN Ghana
    '24': 'mtn_gh',
    '54': 'mtn_gh',
    '55': 'mtn_gh',
    '56': 'mtn_gh',
  },
  // Rwanda (250)
  '250': {
    // MTN Rwanda
    '78': 'mtn_rw',
    '79': 'mtn_rw',
    // Airtel Rwanda
    '72': 'airtel_rw',
    '73': 'airtel_rw',
  },
  // Ouganda (256)
  '256': {
    // MTN Ouganda
    '70': 'mtn_ug',
    '77': 'mtn_ug',
    '78': 'mtn_ug',
    // Airtel Ouganda
    '75': 'airtel_ug',
    '76': 'airtel_ug',
  },
  // Tanzanie (255)
  '255': {
    // Airtel Tanzanie
    '68': 'airtel_tz',
    '69': 'airtel_tz',
    // Vodacom (M-Pesa compatible)
    '74': 'mpesa_ke',
    '75': 'mpesa_ke',
  },
  // Zambie (260)
  '260': {
    // MTN Zambie
    '76': 'mtn_zm',
    '77': 'mtn_zm',
    // Airtel Zambie
    '96': 'airtel_zm',
    '97': 'airtel_zm',
  },
};

/**
 * Mapping générique pour les noms simplifiés (compatibilité)
 */
const GENERIC_SYSTEM_MAP: Record<string, PaymentSystem> = {
  'airtelmoney': 'airtelmoney',
  'moovmoney4': 'moovmoney4',
};

/**
 * Extrait le code pays du numéro (format international)
 */
function extractCountryCode(msisdn: string): string | null {
  const digits = msisdn.replace(/\D/g, '');
  
  // Codes pays à 3 chiffres (229, 228, 225, etc.)
  const threeDigitCodes = ['229', '228', '225', '241', '237', '221', '223', '234', '254', '233', '250', '256', '255', '260'];
  for (const code of threeDigitCodes) {
    if (digits.startsWith(code)) {
      return code;
    }
  }
  
  // Codes pays à 2 chiffres
  const twoDigitCodes = ['22', '23', '24', '25', '26'];
  for (const code of twoDigitCodes) {
    if (digits.startsWith(code) && digits.length >= 10) {
      // Essayer d'extraire un code à 3 chiffres
      const potentialThree = digits.substring(0, 3);
      if (threeDigitCodes.includes(potentialThree)) {
        return potentialThree;
      }
      return code;
    }
  }
  
  return null;
}

/**
 * Détecte le système de paiement avec un code pays explicite
 */
export function detectPaymentSystemWithCountry(
  phoneNumber: string,
  countryCode: string
): PaymentSystem | null {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return null;
  }

  const digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length < 6) {
    return null;
  }

  const countryMappings = OPERATOR_PREFIXES[countryCode];
  if (!countryMappings) {
    return null;
  }

  // Extraire le préfixe du numéro (2 premiers chiffres après le format local)
  let prefix: string;
  
  if (digits.startsWith('0')) {
    // Format local: enlever le 0 initial
    prefix = digits.substring(1, 3);
  } else if (digits.length >= 8) {
    // Format sans indicatif: prendre les 2 premiers chiffres
    prefix = digits.substring(0, 2);
  } else {
    return null;
  }

  // Chercher le préfixe dans les mappings (priorité au mapping exact)
  let detectedSystem = countryMappings[prefix];
  
  if (detectedSystem) {
    return detectedSystem;
  }

  // Essayer aussi avec un seul chiffre si 2 chiffres ne fonctionnent pas
  if (prefix.length >= 2) {
    const singleDigit = prefix.substring(0, 1);
    const singleDigitMapping = Object.entries(countryMappings).find(([key]) => key.startsWith(singleDigit));
    if (singleDigitMapping) {
      return singleDigitMapping[1];
    }
  }

  return null;
}

/**
 * Détecte automatiquement le système de paiement basé sur le numéro de téléphone
 */
export function detectPaymentSystem(msisdn: string): PaymentSystem | null {
  if (!msisdn || msisdn.trim().length === 0) {
    return null;
  }

  const digits = msisdn.replace(/\D/g, '');
  
  if (digits.length < 8) {
    return null;
  }

  // Extraire le code pays
  const countryCode = extractCountryCode(msisdn);
  
  if (countryCode) {
    const countryMappings = OPERATOR_PREFIXES[countryCode];
    if (countryMappings) {
      let prefix: string;
      
      if (digits.startsWith(countryCode)) {
        // Format international: enlever le code pays
        const afterCountry = digits.substring(countryCode.length);
        prefix = afterCountry.substring(0, 2);
      } else if (digits.startsWith('0')) {
        // Format local: enlever le 0 initial
        prefix = digits.substring(1, 3);
      } else {
        // Format sans indicatif: prendre les 2 premiers chiffres
        prefix = digits.substring(0, 2);
      }

      const detectedSystem = countryMappings[prefix];
      if (detectedSystem) {
        return detectedSystem;
      }

      // Essayer aussi avec un seul chiffre
      if (prefix.length >= 2) {
        const singleDigit = prefix.substring(0, 1);
        const singleDigitMapping = Object.entries(countryMappings).find(([key]) => key.startsWith(singleDigit));
        if (singleDigitMapping) {
          return singleDigitMapping[1];
        }
      }
    }
  }

  return null;
}

/**
 * Détecte et retourne le système de paiement avec des informations de confiance
 */
export function detectPaymentSystemWithConfidence(msisdn: string): {
  system: PaymentSystem | null;
  confidence: 'high' | 'medium' | 'low';
  countryCode?: string;
  prefix?: string;
} {
  const digits = msisdn.replace(/\D/g, '');
  const countryCode = extractCountryCode(msisdn);
  
  if (!countryCode) {
    // Pas de code pays détecté = confiance faible
    const system = detectPaymentSystem(msisdn);
    return {
      system,
      confidence: system ? 'low' : 'low',
    };
  }

  const countryMappings = OPERATOR_PREFIXES[countryCode];
  if (!countryMappings) {
    return {
      system: null,
      confidence: 'low',
      countryCode,
    };
  }

  let prefix: string;
  if (digits.startsWith(countryCode)) {
    prefix = digits.substring(countryCode.length, countryCode.length + 2);
  } else if (digits.startsWith('0')) {
    prefix = digits.substring(1, 3);
  } else {
    prefix = digits.substring(0, 2);
  }

  const system = countryMappings[prefix];
  if (system) {
    return {
      system,
      confidence: 'high',
      countryCode,
      prefix,
    };
  }

  // Détection avec confiance moyenne si le mapping existe mais le préfixe ne correspond pas exactement
  return {
    system: detectPaymentSystem(msisdn),
    confidence: 'medium',
    countryCode,
    prefix,
  };
}

/**
 * Obtient tous les systèmes de paiement disponibles pour un pays donné
 */
export function getPaymentSystemsForCountry(countryCode: string): PaymentSystem[] {
  const countryMappings = OPERATOR_PREFIXES[countryCode];
  if (!countryMappings) {
    return [];
  }

  // Récupérer tous les systèmes uniques pour ce pays
  const systems = new Set<PaymentSystem>();
  Object.values(countryMappings).forEach(system => systems.add(system));
  
  return Array.from(systems);
}

/**
 * Obtient le nom d'affichage d'un système de paiement
 */
export function getPaymentSystemLabel(system: PaymentSystem): string {
  const labels: Record<PaymentSystem, string> = {
    'airtelmoney': 'Airtel Money',
    'moovmoney4': 'Moov Money 4',
    'mtn_bj': 'MTN Bénin',
    'mtn_ci': 'MTN Côte d\'Ivoire',
    'mtn_cm': 'MTN Cameroun',
    'mtn_gh': 'MTN Ghana',
    'mtn_ng': 'MTN Nigeria',
    'mtn_rw': 'MTN Rwanda',
    'mtn_ug': 'MTN Ouganda',
    'mtn_zm': 'MTN Zambie',
    'moov_bj': 'Moov Bénin',
    'moov_ci': 'Moov Côte d\'Ivoire',
    'moov_tg': 'Moov Togo',
    'moov_ml': 'Moov Mali',
    'orange_ci': 'Orange Côte d\'Ivoire',
    'orange_cm': 'Orange Cameroun',
    'orange_ml': 'Orange Mali',
    'orange_sn': 'Orange Sénégal',
    'airtel_ng': 'Airtel Nigeria',
    'airtel_rw': 'Airtel Rwanda',
    'airtel_tz': 'Airtel Tanzanie',
    'airtel_ug': 'Airtel Ouganda',
    'airtel_zm': 'Airtel Zambie',
    'mpesa_ke': 'M-Pesa Kenya',
    'wave_ci': 'Wave Côte d\'Ivoire',
    'wave_sn': 'Wave Sénégal',
  };
  
  return labels[system] || system;
}
