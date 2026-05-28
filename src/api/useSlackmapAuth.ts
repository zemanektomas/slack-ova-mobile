// React hook pro Cognito OAuth flow přes expo-auth-session.
// PKCE Authorization Code grant: apka otevře browser na auth.slacklineinternational.org,
// uživatel se přihlásí, Cognito přesměruje zpět na slacklineova:// scheme s code,
// expo-auth-session ho vymění za tokeny (id_token + access_token + refresh_token).
//
// `useAuthRequest` hook generuje PKCE pair (code_verifier + code_challenge) automaticky.
// Code verifier zůstává jen v paměti, není potřeba storage.

import { useEffect } from 'react';
import {
  AuthRequestConfig,
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
  ResponseType,
  TokenResponse,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { COGNITO, decodeIdToken } from './cognito';
import { useAuthStore } from '../store/authStore';

// Web browser session cleanup po návratu z OAuth (Android/iOS specific)
WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: COGNITO.authorizationEndpoint,
  tokenEndpoint: COGNITO.tokenEndpoint,
};

// Scheme app.json: 'slacklineova'. Cognito musí mít přidaný callback URL
// `slacklineova://` ve své App client config. ⚠ Pokud to ISA admin nepřidal,
// auth flow selže s 'redirect_uri_mismatch'. V tom případě je workaround
// použít `https://slacklineova.cz/auth/callback` (univerzální URL) + Universal
// Links — viz README pro setup.
const REDIRECT_URI = makeRedirectUri({
  scheme: 'slacklineova',
  // pro dev (Expo Go) by bylo path: 'redirect', ale my máme bare workflow
});

const requestConfig: AuthRequestConfig = {
  clientId: COGNITO.clientId,
  scopes: COGNITO.scopes as unknown as string[],
  redirectUri: REDIRECT_URI,
  responseType: ResponseType.Code,
  // PKCE auto-handled, code_challenge_method=S256
  usePKCE: true,
  // Force Cognito-native provider (skip social provider picker)
  extraParams: {
    identity_provider: COGNITO.identityProvider,
  },
};

export interface UseSlackmapAuth {
  /** True když auth request je ready (PKCE pair vygenerovaný). */
  ready: boolean;
  /** Spustí login flow — otevře browser na Cognito Hosted UI. */
  signIn: () => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Sign out: vymaž lokální tokeny + (volitelně) Cognito session přes logout URL. */
  signOut: () => Promise<void>;
}

export function useSlackmapAuth(): UseSlackmapAuth {
  const setSession = useAuthStore((s) => s.setSession);
  const storeSignOut = useAuthStore((s) => s.signOut);

  const [request, response, promptAsync] = useAuthRequest(requestConfig, discovery);

  // Při návratu z browseru zpracuj response. Pro success vymění code za tokeny.
  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') return;
    const code = response.params.code;
    const codeVerifier = request?.codeVerifier;
    if (!code || !codeVerifier) return;

    (async () => {
      try {
        const tokens = await exchangeCodeAsync(
          {
            clientId: COGNITO.clientId,
            code,
            redirectUri: REDIRECT_URI,
            extraParams: { code_verifier: codeVerifier },
          },
          discovery,
        );
        await persistTokens(tokens);
      } catch (err) {
        console.warn('[auth] token exchange failed', String(err));
      }
    })();
  }, [response, request?.codeVerifier]);

  const signIn = async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!request) return { ok: false, error: 'not_ready' };
    try {
      const result = await promptAsync();
      if (result.type === 'success') return { ok: true };
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { ok: false, error: 'cancelled' };
      }
      return { ok: false, error: `auth_${result.type}` };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'unknown' };
    }
  };

  const signOut = async () => {
    await storeSignOut();
    // Optional: open Cognito logout URL v browseru aby Hosted UI session
    // taky skončila. Bez tohoto by re-login mohl skip credentials prompt
    // (uživatel je pořád "přihlášený" na Cognito side).
    const logoutUrl =
      `${COGNITO.logoutEndpoint}?client_id=${COGNITO.clientId}` +
      `&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;
    try {
      await WebBrowser.openAuthSessionAsync(logoutUrl, REDIRECT_URI);
    } catch {
      // Sign out v store už proběhl, browser logout je best-effort
    }
  };

  return {
    ready: !!request,
    signIn,
    signOut,
  };

  async function persistTokens(tokens: TokenResponse) {
    if (!tokens.idToken) {
      console.warn('[auth] missing id_token in Cognito response');
      return;
    }
    const claims = decodeIdToken(tokens.idToken);
    if (!claims) {
      console.warn('[auth] cannot decode id_token claims');
      return;
    }
    await setSession(
      tokens.idToken,
      claims.exp,
      { sub: claims.sub, email: claims.email },
    );
  }
}
