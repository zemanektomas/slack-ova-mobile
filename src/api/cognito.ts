// AWS Cognito OAuth (PKCE) konfigurace pro ISA Slackmap.
// Hodnoty objevené přes POC #44 — viz auth.slacklineinternational.org login URL
// kterou Slackmap web používá. Žádný API key, jen public client_id + standard
// PKCE flow.
//
// User pool: eu-central-1_iGaYGKeyJ (Cognito region eu-central-1).
// Identity provider: COGNITO (vlastní user pool ISA, ne federated Google).

export const COGNITO = {
  // Cognito Hosted UI doména
  domain: 'auth.slacklineinternational.org',
  // Public client ID — bezpečné committnut (žádné secret, PKCE chrání flow)
  clientId: '4f7vphq9s9ava93irhh2e7pieh',
  // Scopes co Slackmap web žádá
  scopes: ['email', 'openid', 'aws.cognito.signin.user.admin'],
  // ID provider hint (Cognito user pool, ne federated)
  identityProvider: 'COGNITO',
  // OAuth endpointy odvozené z domény
  authorizationEndpoint: 'https://auth.slacklineinternational.org/oauth2/authorize',
  tokenEndpoint: 'https://auth.slacklineinternational.org/oauth2/token',
  // Logout endpoint (volitelné, pro hard sign-out)
  logoutEndpoint: 'https://auth.slacklineinternational.org/logout',
} as const;

// Decode JWT claims (Cognito ID token).
// `id_token` má header.payload.signature části. Payload je base64url JSON,
// obsahuje { sub, email, email_verified, exp, iat, ... }.
export interface CognitoIdClaims {
  sub: string;          // stable user UUID
  email: string;
  email_verified: boolean;
  exp: number;          // epoch seconds expirace
  iat: number;          // epoch seconds issued
  iss: string;          // Cognito issuer URL
  aud: string;          // = clientId
}

// Base64url decode (RN nemá vestavěné `atob` v Hermes, používáme manuální).
// Standard base64 má `+ /` chars, base64url používá `- _`. Plus padding `=`.
function base64UrlDecode(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  // global.atob existuje v Hermes od RN 0.71+, naše SDK 51 ho má
  return globalThis.atob(s);
}

export function decodeIdToken(idToken: string): CognitoIdClaims | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
