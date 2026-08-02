/**
 * User experience level store — F5 v0.7.3.
 *
 * Rozděluje features / warnings v apce podle úrovně uživatele:
 *   - 'novice'      — Nováček (chodit / prohlížet, warnings, komunita, glossary)
 *   - 'normal'      — Normál (default, všechny základní features)
 *   - 'pro'         — Profi (advanced anchor, rescue, bolting reference — bez advisories)
 *
 * Persistuje v AsyncStorage. Default: 'normal' pro existující uživatele,
 * 'novice' pro první instalaci (bez onboarding markeru).
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserLevel = 'novice' | 'normal' | 'pro';

const STORAGE_KEY = 'user_level';
const ONBOARDING_KEY = 'onboarding_seen';

interface LevelState {
  level: UserLevel;
  onboardingSeen: boolean;
  setLevel: (level: UserLevel) => void;
  setOnboardingSeen: (seen: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useLevelStore = create<LevelState>((set) => ({
  level: 'normal',            // default do doby než hydrate načte z AsyncStorage
  onboardingSeen: true,        // default true aby se onboarding nezobrazil až po hydrate
  setLevel: (level) => {
    set({ level });
    AsyncStorage.setItem(STORAGE_KEY, level).catch(() => {});
  },
  setOnboardingSeen: (seen) => {
    set({ onboardingSeen: seen });
    AsyncStorage.setItem(ONBOARDING_KEY, seen ? '1' : '0').catch(() => {});
  },
  hydrate: async () => {
    try {
      const [levelRaw, onboardingRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      const seen = onboardingRaw === '1';
      // První instalace (žádný onboarding marker) → default level 'novice'
      // Existující uživatel (má marker) → drží uložený level nebo 'normal'
      const level: UserLevel = (levelRaw as UserLevel | null)
        ?? (seen ? 'normal' : 'novice');
      set({ level, onboardingSeen: seen });
    } catch {}
  },
}));
