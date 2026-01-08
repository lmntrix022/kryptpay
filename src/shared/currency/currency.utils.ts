const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function isZeroDecimalCurrency(currency: string | undefined): boolean {
  if (!currency) {
    return false;
  }

  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
}

export function formatAmountFromMinor(amountMinor: number, currency: string): string {
  if (isZeroDecimalCurrency(currency)) {
    return amountMinor.toString();
  }

  return (amountMinor / 100).toFixed(2);
}

