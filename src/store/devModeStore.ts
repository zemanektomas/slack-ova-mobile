/**
 * Dev Mode toggle — v0.7.29.
 *
 * OFF (default): apka ma cistou hlavni UX
 *   - Bottom bar: 3 taby (Lajny / ISA / Nastaveni)
 *   - Settings: Slackmap sign-in schovany (ceka na ISA whitelist redirect URI)
 *   - Settings: sekce "Rozsirene" ukazuje jen Dev Mode toggle
 *
 * ON: zpristupni WIP featury + diagnostiku
 *   - Bottom bar: 5 tabu (+ Vybaveni + Reporty placeholder screens)
 *   - Settings: Slackmap sign-in viditelny (i kdyz nefunguje)
 *   - Settings: sekce "Rozsirene" ukazuje DB schema verzi, bundled counts, atd.
 *
 * Po plnem vypousteni Vybaveni + Reporty (v0.8.0 / v0.8.2) presuneme ty taby
 * mimo Dev Mode gate.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dev_mode';

interface DevModeState {
  devMode: boolean;
  setDevMode: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useDevModeStore = create<DevModeState>((set) => ({
  devMode: false,
  setDevMode: (devMode) => {
    set({ devMode });
    AsyncStorage.setItem(STORAGE_KEY, devMode ? '1' : '0').catch(() => {});
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === '1') set({ devMode: true });
    } catch {}
  },
}));
