// On-device ML Kit translation pro user-submitted texty ze Slackmap.com
// (description, anchorsInfo, accessInfo). Detekuje zdrojový jazyk a pokud se
// liší od UI jazyka, přeloží lokálně přes Google ML Kit (offline po prvním
// stažení modelu).
//
// První tap "Translate" stáhne jazykový model pro source ↔ target pár (~30 MB,
// chce WiFi). Další překlady jsou instant offline.
//
// Note: Mobile-only, neexistuje v Expo Go (native module). Bare workflow OK.

import TranslateText, { TranslateLanguage } from '@react-native-ml-kit/translate-text';
import IdentifyLanguage from '@react-native-ml-kit/identify-languages';

export type SupportedLang = 'en' | 'cs' | 'pl';

// Map našich app langs na ML Kit TranslateLanguage enum.
const LANG_MAP: Record<SupportedLang, TranslateLanguage> = {
  en: TranslateLanguage.ENGLISH,
  cs: TranslateLanguage.CZECH,
  pl: TranslateLanguage.POLISH,
};

// ML Kit support: 59 jazyků, my všechny nepřeložíme do UI jazyka, ale stačí
// pokrýt nejčastější ve Slackmap popisech (EN dominuje, pak PL/DE/CZ/FR/ES/IT).
const TRANSLATABLE_LANGS: Record<string, TranslateLanguage> = {
  en: TranslateLanguage.ENGLISH,
  cs: TranslateLanguage.CZECH,
  pl: TranslateLanguage.POLISH,
  de: TranslateLanguage.GERMAN,
  fr: TranslateLanguage.FRENCH,
  es: TranslateLanguage.SPANISH,
  it: TranslateLanguage.ITALIAN,
  pt: TranslateLanguage.PORTUGUESE,
  ru: TranslateLanguage.RUSSIAN,
  nl: TranslateLanguage.DUTCH,
  sk: TranslateLanguage.SLOVAK,
  sl: TranslateLanguage.SLOVENIAN,
  hr: TranslateLanguage.CROATIAN,
  hu: TranslateLanguage.HUNGARIAN,
  ro: TranslateLanguage.ROMANIAN,
  no: TranslateLanguage.NORWEGIAN,
  sv: TranslateLanguage.SWEDISH,
  da: TranslateLanguage.DANISH,
  fi: TranslateLanguage.FINNISH,
};

export interface TranslateResult {
  text: string;
  sourceLang: string; // BCP-47 code (např. "en")
  targetLang: SupportedLang;
}

export class UnsupportedSourceLangError extends Error {
  constructor(public readonly sourceLang: string) {
    super(`Unsupported source language: ${sourceLang}`);
    this.name = 'UnsupportedSourceLangError';
  }
}

/**
 * Přeloží text na zařízení přes ML Kit. Stáhne model při prvním použití
 * (pokud uživatel není na WiFi, může spotřebovat data — `requireWifi: true`
 * tomu zabrání, ale překlad pak failne dokud user neni na WiFi).
 *
 * @param text — text k překladu (Slackmap description / anchorsInfo / accessInfo)
 * @param targetLang — UI jazyk (kam chceme přeložit)
 * @param requireWifi — povolit stažení modelu jen na WiFi (default true)
 * @returns přeložený text + detected source language
 * @throws `UnsupportedSourceLangError` pokud zdrojový jazyk není podporován
 */
export async function translateOnDevice(
  text: string,
  targetLang: SupportedLang,
  requireWifi = true,
): Promise<TranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { text: trimmed, sourceLang: 'und', targetLang };
  }

  // Detekce zdrojového jazyka. ML Kit vrací 'und' pokud si není jistý.
  const detected = await IdentifyLanguage.identify(trimmed);
  if (detected === 'und') {
    throw new UnsupportedSourceLangError('und');
  }

  // Pokud zdroj = target, není co překládat.
  if (detected === targetLang) {
    return { text: trimmed, sourceLang: detected, targetLang };
  }

  const sourceMlkit = TRANSLATABLE_LANGS[detected];
  if (!sourceMlkit) {
    throw new UnsupportedSourceLangError(detected);
  }
  const targetMlkit = LANG_MAP[targetLang];

  // ⚠️ ML Kit `TranslateText.translate()` vrací string PŘÍMO, ne objekt!
  // (Ověřeno přes npm doc — `const translatedText = await TranslateText.translate({...})`.)
  // V0.6.0 měl bug kde jsem to parsoval jako `{ result }` nebo `{ text }` → vždy fallback
  // na originál text. Fix od v0.6.1.
  const translated = (await TranslateText.translate({
    text: trimmed,
    sourceLanguage: sourceMlkit,
    targetLanguage: targetMlkit,
    downloadModelIfNeeded: true,
    requireWifi,
  })) as unknown as string;

  return {
    text: typeof translated === 'string' && translated ? translated : trimmed,
    sourceLang: detected,
    targetLang,
  };
}
