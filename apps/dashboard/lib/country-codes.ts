/**
 * Liste des indicatifs téléphoniques des pays supportés
 */

export type CountryCode = {
  code: string; // Code pays ISO (229, 228, etc.)
  name: string; // Nom du pays
  flag?: string; // Emoji drapeau (optionnel)
};

export const SUPPORTED_COUNTRIES: CountryCode[] = [
  { code: '229', name: 'Bénin', flag: '🇧🇯' },
  { code: '228', name: 'Togo', flag: '🇹🇬' },
  { code: '225', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: '241', name: 'Gabon', flag: '🇬🇦' },
  { code: '237', name: 'Cameroun', flag: '🇨🇲' },
  { code: '221', name: 'Sénégal', flag: '🇸🇳' },
  { code: '223', name: 'Mali', flag: '🇲🇱' },
  { code: '234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '254', name: 'Kenya', flag: '🇰🇪' },
  { code: '233', name: 'Ghana', flag: '🇬🇭' },
  { code: '250', name: 'Rwanda', flag: '🇷🇼' },
  { code: '256', name: 'Ouganda', flag: '🇺🇬' },
  { code: '255', name: 'Tanzanie', flag: '🇹🇿' },
  { code: '260', name: 'Zambie', flag: '🇿🇲' },
];

/**
 * Trouve un pays par son code
 */
export function getCountryByCode(code: string): CountryCode | undefined {
  return SUPPORTED_COUNTRIES.find(c => c.code === code);
}

/**
 * Formatte l'indicatif pour l'affichage
 */
export function formatCountryCode(country: CountryCode): string {
  return `${country.flag || ''} +${country.code} ${country.name}`;
}

