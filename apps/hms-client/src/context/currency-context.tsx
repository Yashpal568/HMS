'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
  },
  AED: {
    code: 'AED',
    symbol: 'AED ',
    name: 'UAE Dirham',
    locale: 'ar-AE',
  },
};

export const DEFAULT_CURRENCY: CurrencyConfig = SUPPORTED_CURRENCIES.INR;

interface CurrencyContextType {
  currency: CurrencyConfig;
  setCurrency: (code: string) => void;
  formatCurrency: (amount: number, options?: { showCode?: boolean; decimals?: number }) => string;
  symbol: string;
  supportedCurrencies: CurrencyConfig[];
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  formatCurrency: (amount: number) => `₹${amount.toFixed(2)}`,
  symbol: '₹',
  supportedCurrencies: Object.values(SUPPORTED_CURRENCIES),
});

const STORAGE_KEY = 'hms_preferred_currency';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyConfig>(DEFAULT_CURRENCY);

  // Initialize from localStorage on client-side mount
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(STORAGE_KEY);
      if (savedCode && SUPPORTED_CURRENCIES[savedCode]) {
        setCurrencyState(SUPPORTED_CURRENCIES[savedCode]);
      } else {
        // Explicitly set default to INR in localStorage
        localStorage.setItem(STORAGE_KEY, 'INR');
      }
    } catch {
      // localStorage may not be available in private mode or SSR
    }
  }, []);

  const setCurrency = useCallback((code: string) => {
    const selected = SUPPORTED_CURRENCIES[code];
    if (selected) {
      setCurrencyState(selected);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // ignore
      }
    }
  }, []);

  const formatCurrency = useCallback(
    (amount: number, options?: { showCode?: boolean; decimals?: number }): string => {
      const decimals = options?.decimals !== undefined ? options.decimals : 2;
      const formattedNum = (amount || 0).toLocaleString(currency.locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      if (options?.showCode) {
        return `${currency.symbol}${formattedNum} ${currency.code}`;
      }
      return `${currency.symbol}${formattedNum}`;
    },
    [currency],
  );

  const contextValue = useMemo(
    () => ({
      currency,
      setCurrency,
      formatCurrency,
      symbol: currency.symbol,
      supportedCurrencies: Object.values(SUPPORTED_CURRENCIES),
    }),
    [currency, setCurrency, formatCurrency],
  );

  return <CurrencyContext.Provider value={contextValue}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
