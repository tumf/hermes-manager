'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_LOCALE, getStoredLocale, setStoredLocale, type Locale } from '@/src/lib/i18n';
import { getTranslations, type TranslationDictionary } from '@/src/lib/translations';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationDictionary;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: getTranslations(DEFAULT_LOCALE),
});

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  useEffect(() => {
    if (initialLocale) return;
    const storedLocale = getStoredLocale();
    if (storedLocale !== locale) {
      setLocaleState(storedLocale);
    }
  }, [initialLocale, locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setStoredLocale(next);
  }, []);

  const t = useMemo(() => getTranslations(locale), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
