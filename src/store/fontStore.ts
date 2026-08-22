/**
 * Velikost písma — tři úrovně, v0.7.16.
 *
 * Důvod: "večer je to nečitelné na mobilu" (feedback 22.8.2026). Systémové
 * nastavení písma Androidu apka nerespektuje všude, a i kdyby, uživatel chce
 * zvětšit jen tuhle apku, ne celý telefon.
 *
 * Škála se používá jako násobitel u fontSize v seznamu a detailu — tam, kde
 * se reálně čte. Ikony a rozměry sloupců se nemění, jinak by se rozsypal
 * sloupcový layout.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSize = 'normal' | 'large' | 'xlarge';

/** Násobitel fontSize. Nad 1.3 se začne lámat sloupcová tabulka. */
export const FONT_SCALES: Record<FontSize, number> = {
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
};

const STORAGE_KEY = 'font_size';

interface FontState {
  fontSize: FontSize;
  /** Hotový násobitel — komponenty ho berou přímo, ať nepočítají samy. */
  fontScale: number;
  setFontSize: (size: FontSize) => void;
  hydrate: () => Promise<void>;
}

export const useFontStore = create<FontState>((set) => ({
  fontSize: 'normal',
  fontScale: 1,
  setFontSize: (fontSize) => {
    set({ fontSize, fontScale: FONT_SCALES[fontSize] });
    AsyncStorage.setItem(STORAGE_KEY, fontSize).catch(() => {});
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === 'normal' || raw === 'large' || raw === 'xlarge') {
        set({ fontSize: raw, fontScale: FONT_SCALES[raw] });
      }
    } catch {}
  },
}));
