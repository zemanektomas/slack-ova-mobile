/**
 * User experience level store — F5 v0.7.3.
 *
 * Rozděluje features / warnings v apce podle úrovně uživatele:
 *   - 'beginner'  — Začátečník (prohlížet, warnings, komunita, glossary)
 *   - 'walker'    — Chodec (default, všechny základní features)
 *   - 'rigger'    — Rigger (advanced anchor, rescue, bolting reference — bez advisories)
 *
 * Pojmenování v0.7.16 podle domény (dřív novice/normal/pro). Staré hodnoty
 * z AsyncStorage se při hydrate mapují, aby existujícím uživatelům nespadla
 * úroveň na default.
 *
 * Persistuje v AsyncStorage. Default: 'walker' pro existující uživatele,
 * 'beginner' pro první instalaci (bez onboarding markeru).
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserLevel = 'beginner' | 'walker' | 'rigger';

/** Hodnoty uložené před v0.7.16. */
const LEGACY: Record<string, UserLevel> = { novice: 'beginner', normal: 'walker', pro: 'rigger' };

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
  level: 'walker',            // default do doby než hydrate načte z AsyncStorage
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
      // První instalace (žádný onboarding marker) → default 'beginner'
      // Existující uživatel (má marker) → uložený level, s mapováním starých názvů
      const stored = levelRaw ? (LEGACY[levelRaw] ?? (levelRaw as UserLevel)) : null;
      const level: UserLevel = stored ?? (seen ? 'walker' : 'beginner');
      set({ level, onboardingSeen: seen });
    } catch {}
  },
}));
