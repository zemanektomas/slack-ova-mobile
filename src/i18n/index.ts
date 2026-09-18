// i18n setup. Detekce jazyka:
//   1) AsyncStorage 'slackline_lang' (uživatelův explicitní výběr — má přednost)
//   2) fallback 'en' (v0.8.0+ international default, uživatel si CS/PL přepne v Settings)
//
// v0.7.x-: auto-detekce ze systému (cs→CS, pl→PL, else→EN).
// Změněno v v0.8.0: apka je pozicovaná mezinárodně (Slackmap complement),
// EN default nezmátne cizince ani mezinárodní testery Play Console.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
