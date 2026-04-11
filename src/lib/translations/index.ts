import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { ja } from './ja';
import { ko } from './ko';
import { ptBR } from './pt-BR';
import { ru } from './ru';
import type { TranslationDictionary } from './types';
import { vi } from './vi';
import { zhCN } from './zh-CN';

import type { Locale } from '@/src/lib/i18n';

const dictionaries: Record<Locale, TranslationDictionary> = {
  ja,
  en,
  'zh-CN': zhCN,
  es,
  'pt-BR': ptBR,
  vi,
  ko,
  ru,
  fr,
  de,
};

export function getTranslations(locale: Locale): TranslationDictionary {
  return dictionaries[locale] ?? dictionaries.ja;
}

export type { TranslationDictionary };
