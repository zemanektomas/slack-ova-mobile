// Auth store pro přihlášení do Slackmap přes ISA AWS Cognito.
// JWT (Cognito ID token) v expo-secure-store, použije se pro write API
// (POST /line, PUT /line/{id}). Read endpointy fungují i bez auth.
//
// Token life: 1 hodina. Refresh handling: zatím re-login (Cognito refresh tokeny
// odložené do v0.6.x — pro POC stačí re-login button když JWT expiroval).

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'slackmap_jwt';
const EXPIRES_KEY = 'slackmap_jwt_expires';
const USER_EMAIL_KEY = 'slackmap_user_email';
const USER_SUB_KEY = 'slackmap_user_sub';

// JWT claims co nás zajímají (decoded z Cognito ID tokenu).
// sub = stable user UUID, email = display, exp = epoch seconds.
interface SlackmapUser {
  sub: string;
  email: string;
}

interface AuthState {
  user: SlackmapUser | null;
  jwt: string | null;
  // Epoch seconds (z claims.exp). Pro kontrolu před každým API call.
  expiresAt: number | null;
  isHydrating: boolean;
  isAuthenticated: () => boolean;
  hydrate: () => Promise<void>;
  setSession: (jwt: string, expiresAt: number, user: SlackmapUser) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  jwt: null,
  expiresAt: null,
  isHydrating: true,
  // True jen pokud máme JWT A nevypršel. Komponenty se podle toho můžou
  // rozhodnout zda nabízet Add Line / Edit či redirectovat na login.
  isAuthenticated: () => {
    const { jwt, expiresAt } = get();
    if (!jwt || !expiresAt) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    // 60s buffer — pokud token expiruje za méně než minutu, prakticky neplatný
    return expiresAt > nowSec + 60;
  },
  hydrate: async () => {
    try {
      const [jwt, expiresStr, email, sub] = await Promise.all([
        SecureStore.getItemAsync(JWT_KEY),
        SecureStore.getItemAsync(EXPIRES_KEY),
        SecureStore.getItemAsync(USER_EMAIL_KEY),
        SecureStore.getItemAsync(USER_SUB_KEY),
      ]);
      const expiresAt = expiresStr ? parseInt(expiresStr, 10) : null;
      const user = email && sub ? { email, sub } : null;
      set({ jwt, expiresAt, user, isHydrating: false });
    } catch {
      set({ isHydrating: false });
    }
  },
  setSession: async (jwt, expiresAt, user) => {
    await Promise.all([
      SecureStore.setItemAsync(JWT_KEY, jwt),
      SecureStore.setItemAsync(EXPIRES_KEY, String(expiresAt)),
      SecureStore.setItemAsync(USER_EMAIL_KEY, user.email),
      SecureStore.setItemAsync(USER_SUB_KEY, user.sub),
    ]);
    set({ jwt, expiresAt, user });
  },
  signOut: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(JWT_KEY),
      SecureStore.deleteItemAsync(EXPIRES_KEY),
      SecureStore.deleteItemAsync(USER_EMAIL_KEY),
      SecureStore.deleteItemAsync(USER_SUB_KEY),
    ]);
    set({ jwt: null, expiresAt: null, user: null });
  },
}));
