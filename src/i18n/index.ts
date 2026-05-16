// i18n setup. Detekce jazyka:
//   1) AsyncStorage 'slackline_lang' (uživatelův explicitní výběr)
//   2) systémový locale (expo-localization)
//   3) fallback 'cs'

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import cs from './cs.json';
import en from './en.json';
import pl from './pl.json';

export const LANG_KEY = 'slackline_lang';
export type Lang = 'cs' | 'en' | 'pl';

export async function detectInitialLang(): Promise<Lang> {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (stored === 'cs' || stored === 'en' || stored === 'pl') return stored;
  } catch {}
  const sys = Localization.getLocales()?.[0]?.languageCode;
  if (sys === 'cs') return 'cs';
  if (sys === 'pl') return 'pl';
  return 'en';
}

export async function initI18n() {
  const lang = await detectInitialLang();
  await i18n.use(initReactI18next).init({
    resources: { cs: { translation: cs }, en: { translation: en }, pl: { translation: pl } },
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
  return lang;
}

export async function setLang(lang: Lang) {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {}
}

export default i18n;
