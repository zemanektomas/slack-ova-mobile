/**
 * Slackmap community API client — F5 v0.7.3.
 *
 * Endpoint: GET https://api.slackmap.com/communities/country/{countryCode}
 *
 * Returns ISA members + slackline groups per country (FB / IG / web / email).
 * Kešuje v SQLite (sync_meta) — data se moc nemění, refresh nepovinný.
 */

import { getMeta, setMeta } from '../db';

export interface ISAMember {
  name: string;
  email?: string;
  country: string;
  memberType?: string;         // 'active' | 'partner' | ...
  infoUrl?: string;
  groupId?: string;
}

export interface SlacklineGroup {
  id: string;
  name: string;
  createdDateTime?: string;
  updatedDateTime?: string;
  email?: string;
  webpage?: string;
  facebookGroup?: string;
  facebookPage?: string;
  instagram?: string;
  youtube?: string;
}

export interface CommunityData {
  name: string;                // country name
  isaMembers: ISAMember[];
  slacklineGroups: SlacklineGroup[];
}

const BASE = 'https://api.slackmap.com';
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;  // 7 dní — data se mění zřídka

/**
 * Načte community per country, s SQLite cache.
 * Klíč: `community_{countryCode}`, s timestamp `community_{code}_fetched_at`.
 * Pokud cache <7 dní, vrací cache. Jinak fetch + update cache.
 * Při network fail: vrací cache (i staré) nebo null.
 */
export async function getCommunityForCountry(
  countryCode: string,
  forceRefresh = false,
): Promise<CommunityData | null> {
  const code = countryCode.toUpperCase();
  const cacheKey = `community_${code}`;
  const timestampKey = `community_${code}_fetched_at`;

  if (!forceRefresh) {
    // Zkus cache
    try {
      const [cached, fetchedAt] = await Promise.all([
        getMeta(cacheKey),
        getMeta(timestampKey),
      ]);
      if (cached && fetchedAt) {
        const age = Date.now() - parseInt(fetchedAt, 10);
        if (age < CACHE_TTL_MS) {
          return JSON.parse(cached);
        }
      }
    } catch {}
  }

  // Fetch fresh
  try {
    const url = `${BASE}/communities/country/${code}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    // Persist to cache
    await Promise.all([
      setMeta(cacheKey, JSON.stringify(data)),
      setMeta(timestampKey, String(Date.now())),
    ]);
    return data as CommunityData;
  } catch (err) {
    // Fallback: vrátí staré cache i kdyby byla starší než TTL
    try {
      const cached = await getMeta(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  }
}

/** Extract country code from line state (CZ, PL, SK, etc.). Best-effort. */
export function extractCountryCode(state?: string | null): string | null {
  if (!state) return null;
  const s = state.trim();
  // ISO code (2-letter)
  if (/^[A-Z]{2}$/i.test(s)) return s.toUpperCase();
  // České názvy → CZ
  if (/česk|čechy|morav|slezsk/i.test(s)) return 'CZ';
  // Polské
  if (/pols|polan|polska/i.test(s)) return 'PL';
  // Slovenské
  if (/slove|slovak|slovensk/i.test(s)) return 'SK';
  // Německé
  if (/germ|deutsch|něme|niem/i.test(s)) return 'DE';
  // Rakouské
  if (/austri|öster|rakou/i.test(s)) return 'AT';
  // Maďarské
  if (/hung|magyar|maďar/i.test(s)) return 'HU';
  return null;
}
