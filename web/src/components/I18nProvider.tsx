'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { th, type Messages } from '@/messages/th';
import { en } from '@/messages/en';

type Locale = 'th' | 'en';
const Ctx = createContext<{ locale: Locale; t: Messages; setLocale: (l: Locale) => void }>({
  locale: 'th', t: th, setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th');
  useEffect(() => {
    const saved = localStorage.getItem('raksat_locale') as Locale | null;
    if (saved === 'th' || saved === 'en') setLocaleState(saved);
  }, []);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('raksat_locale', l);
    document.cookie = `raksat_locale=${l};path=/;max-age=31536000`;
  };
  return <Ctx.Provider value={{ locale, t: locale === 'en' ? en : th, setLocale }}>{children}</Ctx.Provider>;
}

export function useI18n() { return useContext(Ctx); }
