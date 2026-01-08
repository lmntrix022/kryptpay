'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type CurrencyPreference = 'EUR' | 'XAF' | 'USD';

type CurrencyContextType = {
  preferredCurrency: CurrencyPreference;
  setPreferredCurrency: (currency: CurrencyPreference) => void;
  convertAmount: (amountMinor: number, fromCurrency: string) => number;
  formatAmount: (amountMinor: number, fromCurrency: string) => string;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Taux de change approximatifs
// Ce taux peut être mis à jour via une API si nécessaire
const EUR_TO_XAF_RATE = 655.957;
const XAF_TO_EUR_RATE = 1 / EUR_TO_XAF_RATE;
const EUR_TO_USD_RATE = 1.08; // Approximatif
const USD_TO_EUR_RATE = 1 / EUR_TO_USD_RATE;
const USD_TO_XAF_RATE = EUR_TO_XAF_RATE * USD_TO_EUR_RATE;
const XAF_TO_USD_RATE = 1 / USD_TO_XAF_RATE;

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [preferredCurrency, setPreferredCurrencyState] = useState<CurrencyPreference>('EUR');

  // Charger la préférence depuis localStorage au démarrage
  useEffect(() => {
    const stored = localStorage.getItem('boohpay_preferred_currency');
    if (stored === 'EUR' || stored === 'XAF' || stored === 'USD') {
      setPreferredCurrencyState(stored);
    }
  }, []);

  const setPreferredCurrency = (currency: CurrencyPreference) => {
    setPreferredCurrencyState(currency);
    localStorage.setItem('boohpay_preferred_currency', currency);
  };

  const convertAmount = (amountMinor: number, fromCurrency: string): number => {
    const fromUpper = fromCurrency.toUpperCase();
    const isFromZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(fromUpper);
    const fromAmount = isFromZeroDecimal ? amountMinor : amountMinor / 100;

    // Si la devise source est déjà la devise préférée, pas de conversion
    if (
      (fromUpper === 'EUR' || fromUpper === 'XAF' || fromUpper === 'XOF' || fromUpper === 'USD') &&
      ((preferredCurrency === 'EUR' && fromUpper === 'EUR') ||
        (preferredCurrency === 'XAF' && (fromUpper === 'XAF' || fromUpper === 'XOF')) ||
        (preferredCurrency === 'USD' && fromUpper === 'USD'))
    ) {
      return fromAmount;
    }

    // Convertir en EUR d'abord si nécessaire
    let amountInEUR: number;
    if (fromUpper === 'EUR') {
      amountInEUR = fromAmount;
    } else if (fromUpper === 'USD') {
      amountInEUR = fromAmount * USD_TO_EUR_RATE;
    } else if (fromUpper === 'XAF' || fromUpper === 'XOF') {
      amountInEUR = fromAmount * XAF_TO_EUR_RATE;
    } else {
      // Autres devises : supposer qu'elles utilisent des centimes
      amountInEUR = fromAmount;
    }

    // Convertir vers la devise préférée
    if (preferredCurrency === 'XAF') {
      return amountInEUR * EUR_TO_XAF_RATE;
    } else if (preferredCurrency === 'USD') {
      return amountInEUR * EUR_TO_USD_RATE;
    }

    return amountInEUR;
  };

  const formatAmount = (amountMinor: number, fromCurrency: string): string => {
    const convertedAmount = convertAmount(amountMinor, fromCurrency);
    const displayCurrency = preferredCurrency;
    const isZeroDecimal = displayCurrency === 'XAF';

    // Utiliser 'en-US' pour USD pour un formatage correct
    const locale = displayCurrency === 'USD' ? 'en-US' : 'fr-FR';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(convertedAmount);
  };

  return (
    <CurrencyContext.Provider
      value={{
        preferredCurrency,
        setPreferredCurrency,
        convertAmount,
        formatAmount,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}


