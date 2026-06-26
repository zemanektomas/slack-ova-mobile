// React hook pro Cognito OAuth flow přes deep link pattern.
// PKCE Authorization Code grant: apka otevře browser na auth.slacklineinternational.org,
// uživatel se přihlásí, Cognito přesměruje na http://localhost:5173?code=...,
// Android intent filter (AndroidManifest.xml) přesměruje URL zpět do MainActivity,
// apka vymění code za JWT (id_token + access_token + refresh_token).
//
// Workaround pro ISA Cognito whitelist: použijeme `http://localhost:5173` jako
// redirect URI (whitelisted v ISA Cognito clientu pro Vite dev server). Místo
// custom scheme `slacklineova://` (potřebuje ISA whitelist, neprošlo).
//
// Změna oproti původnímu (expo-auth-session promptAsync):
// - Místo `WebBrowser.openAuthSessionAsync` (Custom Tab čeká vlastní callback)
//   používáme `WebBrowser.openBrowserAsync` (otevře standardní browser) +
//   `Linking.addEventListener('url')` (deep link listener).
// - Pro HTTP URL redirect Custom Tab to neumí intercept-ovat — místo toho
//   Chrome dispatch URL přes Android intent filter, apka dostane deep link.

import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { exchangeCodeAsync } from 'expo-auth-session';
import { COGNITO, decodeIdToken } from './cognito';
import { useAuthStore } from '../store/authStore';

// Web browser session cleanup po návratu z OAuth (Android/iOS specific)
WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: COGNITO.authorizationEndpoint,
  tokenEndpoint: COGNITO.tokenEndpoint,
};

// REDIRECT_URI = `http://localhost:5173` — whitelisted v ISA Cognito (Vite dev port).
// Android intent filter v AndroidManifest.xml dispatchne URL zpět do MainActivity.
const REDIRECT_URI = 'http://localhost:5173';

// PKCE: vygeneruj code_verifier (random 43-128 char string) + code_challenge (SHA256)
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  // 32 random bytes → base64url ~43 chars (RFC 7636)
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const verifier = base64UrlEncode(randomBytes);
  // SHA256 of verifier, base64url encoded
  const challengeBuffer = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  // Convert base64 → base64url (URL-safe)
  const challenge = challengeBuffer.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}

function base64UrlEncode(bytes: Uint8Array): string {
  // Convert bytes to base64
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = globalThis.btoa(binary);
  // Convert base64 → base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface UseSlackmapAuth {
  /** True když hook ready (vždy true v této variantě). */
  ready: boolean;
  /** Spustí login flow — otevře browser na Cognito Hosted UI. */
  signIn: () => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Sign out: vymaž lokální tokeny + Cognito session přes logout URL. */
  signOut: () => Promise<void>;
}

export function useSlackmapAuth(): UseSlackmapAuth {
  const setSession = useAuthStore((s) => s.setSession);
  const storeSignOut = useAuthStore((s) => s.signOut);
  const [pendingVerifier, setPendingVerifier] = useState<string | null>(null);
  // Resolver pro signIn() — promise se vyřeší až přijde deep link callback
  const signInResolver = useRef<((r: { ok: true } | { ok: false; error: string }) => void) | null>(null);

  // Deep link listener — když Android dispatchne `http://localhost:5173?code=...` do apky,
  // tady to chytíme, vyměníme code za tokeny a vyřešíme signIn() promise.
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      console.log('[auth] deep link received:', url);
      if (!url.startsWith(REDIRECT_URI)) return;

      // Extract code from URL
      const codeMatch = url.match(/[?&]code=([^&]+)/);
      const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;
      const errorMatch = url.match(/[?&]error=([^&]+)/);
      const error = errorMatch ? decodeURIComponent(errorMatch[1]) : null;

      if (error) {
        console.warn('[auth] OAuth error:', error);
        signInResolver.current?.({ ok: false, error });
        signInResolver.current = null;
        return;
      }

      if (!code || !pendingVerifier) {
        console.warn('[auth] missing code or verifier');
        signInResolver.current?.({ ok: false, error: 'missing_code' });
        signInResolver.current = null;
        return;
      }

      // Close browser (Chrome stuck on localhost) — uživatel se vrátí do apky
      try { WebBrowser.dismissBrowser(); } catch {}

      // Exchange code for tokens
      try {
        const tokens = await exchangeCodeAsync(
          {
            clientId: COGNITO.clientId,
            code,
            redirectUri: REDIRECT_URI,
            extraParams: { code_verifier: pendingVerifier },
          },
          discovery,
        );
        await persistTokens(tokens);
        signInResolver.current?.({ ok: true });
      } catch (err: any) {
        console.warn('[auth] token exchange failed', String(err));
        signInResolver.current?.({ ok: false, error: err?.message ?? 'token_exchange_failed' });
      } finally {
        signInResolver.current = null;
        setPendingVerifier(null);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    // Také zkontroluj initial URL (pokud apka byla spuštěna deep linkem)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [pendingVerifier]);

  const signIn = async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      // 1. Generate PKCE pair
      const { verifier, challenge } = await generatePKCE();
      setPendingVerifier(verifier);

      // 2. Construct authorization URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: COGNITO.clientId,
        redirect_uri: REDIRECT_URI,
        scope: COGNITO.scopes.join(' '),
        code_challenge: challenge,
        code_challenge_method: 'S256',
        identity_provider: COGNITO.identityProvider,
      });
      const authUrl = `${COGNITO.authorizationEndpoint}?${params.toString()}`;
      console.log('[auth] opening browser:', authUrl);

      // 3. Open browser (standard, ne Custom Tab — aby Android dispatch HTTP redirect skrz intent filter)
      const promise = new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
        signInResolver.current = resolve;
      });

      await WebBrowser.openBrowserAsync(authUrl, {
        // showTitle: true,
        enableBarCollapsing: false,
      });

      // openBrowserAsync se vrátí jakmile browser je zavřený (uživatel back / dismiss).
      // Pokud uživatel nedokončí auth, signInResolver nikdy nevolán — timeout fallback.
      const timeoutPromise = new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
        setTimeout(() => resolve({ ok: false, error: 'timeout_or_dismissed' }), 300_000); // 5 min
      });

      return await Promise.race([promise, timeoutPromise]);
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'unknown' };
    }
  };

  const signOut = async () => {
    await storeSignOut();
    const logoutUrl =
      `${COGNITO.logoutEndpoint}?client_id=${COGNITO.clientId}` +
      `&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;
    try {
      await WebBrowser.openBrowserAsync(logoutUrl);
    } catch {
      // best-effort
    }
  };

  return {
    ready: true,
    signIn,
    signOut,
  };

  async function persistTokens(tokens: { idToken?: string }) {
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
