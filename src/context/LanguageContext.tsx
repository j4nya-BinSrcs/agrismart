/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { getStoredItem, setStoredItem } from '../utils/storage';

const LANG_STORAGE_KEY = 'selected_language';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function isSupportedLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'hi' || value === 'gu';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const stored = getStoredItem<Language | null>(LANG_STORAGE_KEY, null);
    return isSupportedLanguage(stored) ? stored : 'en';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage;
    }
  }, [currentLanguage]);

  const setLanguage = useCallback((lang: Language) => {
    setCurrentLanguage(lang);
    setStoredItem(LANG_STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = translations[currentLanguage] || translations.en;
      return dict[key] ?? translations.en[key] ?? fallback ?? key;
    },
    [currentLanguage]
  );

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
