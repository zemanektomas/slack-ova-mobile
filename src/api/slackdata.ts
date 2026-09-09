/**
 * SlackData API klient — v0.8.0 rozjezd (ADR-057).
 *
 * Endpoint: GET {BASE}/api/{type}/{id}
 * type ∈ webbing | weblock | roller | leashring | grip | treepro | brand | isawarning
 *
 * Read-only (POST/PUT/PATCH/DELETE vracejí 405 — hostovaný katalog je immutable).
 * Bez auth, veřejné.
 *
 * Data pod CC BY-SA 4.0 — atribuce ISA + odkaz povinná v UI (Nastavení → Zdroje dat).
 *
 * Kešuje do SQLite tabulky `slackdata_cache` (schema v8):
 *   endpoint TEXT PK, payload TEXT (JSON), status INTEGER, fetched_at TEXT (ISO 8601).
 * TTL 30 dní. Při offline / API down se čte i starší cache; pokud nic, vrací null
 * a caller spadne na bundled `materials.json` (jak požaduje ADR-055).
 *
 * ⚠️ ID není stabilní — Dylan Furlong warning ze SlackData Discordu (ADR-053).
 * Párovat na `slackdata_ref`, ale při každém fetch ověřit `brand + name` proti tomu,
 * co drží `gear` řádek. Rozdíl = seed order drift → volat sa searchByBrandModel().
 */

import Constants from 'expo-constants';
import { getDb } from '../db';

/** Fallback URL — přepsatelné přes app.json `extra.slackDataBaseUrl`. Doména se možná změní. */
const DEFAULT_BASE = 'https://slackdata.org';
const BASE: string =
  (Constants.expoConfig?.extra as { slackDataBaseUrl?: string } | undefined)?.slackDataBaseUrl
  ?? DEFAULT_BASE;

const CACHE_TTL_MS = 30 * 24 * 3600 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

export type SlackDataGearType =
  | 'webbing'
  | 'weblock'
  | 'roller'
  | 'leashring'
  | 'grip'
  | 'treepro';

/**
 * Sdílená hlavička každé odpovědi — `brand_name` je ODVOZENÉ pole ze serveru.
 * Ověřeno curl proti slackdata.org 9.9.2026 — API vrací všechna pole vždycky (nullované,
 * kde produkt hodnotu nemá), takže `undefined` je zbytečné, jen `T | null`.
 */
interface SlackDataBase {
  id: number;
  name: string;
  brand_name?: string;
  isa_certified: boolean | null;
  active: boolean | null;
  isa_warning: string | null;         // nejhorší severita z ISAGearWarning na tento gear ('Warning' | 'Recall' | 'Notice' | null)
  release_date: number | null;        // unix ms
  product_url: string | null;
  price: number | null;
  currency: string | null;
  description: string | null;
  notes: string | null;
  colors: string[] | null;
  version: string | null;
  weight: number | null;              // g/m u webbing, g u ostatních
  material: string[] | null;          // POZOR: ARRAY (webbing typicky ['Polyester'], mix pro blend)
  breaking_strength: number | null;   // kN, MBS
}

/** Stretch bod z SlackData `webbings.json` — u 93/246 popruhů 3+ body (ADR-055). */
export interface StretchPoint {
  kn: number;
  percent: number;
}

/**
 * ⚠️ POZOR: `stretch` v raw odpovědi je **JSON STRING**, ne pole.
 * Použij `parseStretch()` na `raw.stretch` po fetch.
 */
export interface SlackDataWebbingRaw extends SlackDataBase {
  webbing_construction: string | null;
  width: number | null;               // mm
  thickness: number | null;           // mm
  stretch: string | null;             // JSON string — parsuj přes parseStretch()
  classification: 'A+' | 'A' | 'B' | 'C' | null;
  gear_sellers: unknown;              // nespecifikováno v API
}

/** Webbing s parsed stretch polem — vrácené z fetchWebbing(). */
export interface SlackDataWebbing extends Omit<SlackDataWebbingRaw, 'stretch'> {
  stretch: StretchPoint[] | null;
}

export interface SlackDataWeblock extends SlackDataBase {
  style: string | null;               // 'Tensionable Weblock' | 'Fixed' | ...
  width_min: number | null;           // mm (ne _mm suffix v API)
  width_max: number | null;           // mm
  front_pin: string | null;           // 'Push Pin' | ...
  attachment_point: string | null;    // 'Pin' | ...
  gear_sellers: unknown;
}

export interface SlackDataISAWarning {
  source_id: string;
  status: string;                     // 'Warning' | 'Recall' | 'Notice'
  gear_type: SlackDataGearType | null;
  gear_id: number | null;
  date: string | null;                // "07.11.24" formát
  date_iso: string | null;            // "2024-11-07"
  product_type: string | null;        // 'Webbing' | 'Weblock' | ...
  manufacturer: string | null;
  model: string | null;
  in_production: boolean | null;
  description: string;
  solution: string | null;
  product_image: string | null;
  links: string[] | null;
}

/** Rozparsuje JSON string `stretch` z raw odpovědi. Nikdy neháže; při fail vrátí null. */
export function parseStretch(raw: string | null | undefined): StretchPoint[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Ověř tvar — pole objektů s číselným kn a percent.
    const clean = parsed.filter(
      (p): p is StretchPoint =>
        typeof p === 'object' && p !== null
        && typeof (p as StretchPoint).kn === 'number'
        && typeof (p as StretchPoint).percent === 'number',
    );
    return clean.length > 0 ? clean : null;
  } catch {
    return null;
  }
}

/**
 * Zapíše odpověď do cache. Používáme `INSERT OR REPLACE` — endpoint je PK.
 */
async function writeCache(endpoint: string, payload: unknown, status: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO slackdata_cache (endpoint, payload, status, fetched_at) VALUES (?, ?, ?, ?)',
    [endpoint, JSON.stringify(payload), status, new Date().toISOString()],
  );
}

interface CacheHit {
  payload: unknown;
  status: number;
  fetchedAt: number;                  // epoch ms
  stale: boolean;                     // starší než CACHE_TTL_MS
}

async function readCache(endpoint: string): Promise<CacheHit | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ payload: string; status: number; fetched_at: string }>(
    'SELECT payload, status, fetched_at FROM slackdata_cache WHERE endpoint = ?',
    endpoint,
  );
  if (!row) return null;
  try {
    const fetchedAt = new Date(row.fetched_at).getTime();
    return {
      payload: JSON.parse(row.payload),
      status: row.status,
      fetchedAt,
      stale: Date.now() - fetchedAt > CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

/**
 * Wrapper kolem fetch s timeoutem — RN fetch nemá `AbortSignal.timeout` na SDK 51.
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Načte JSON z SlackData API s cache. Fresh cache → vrátí okamžitě.
 * Stale nebo miss → HTTP fetch. Pokud network fail → poslední cache (i stará), jinak null.
 *
 * `forceRefresh: true` obchází cache TTL a jde vždycky na síť (ale při fail stále fallback na cache).
 */
async function apiGet<T>(path: string, forceRefresh = false): Promise<T | null> {
  const url = `${BASE}${path}`;

  const cached = await readCache(url);
  if (cached && !cached.stale && !forceRefresh) {
    return cached.status === 200 ? (cached.payload as T) : null;
  }

  try {
    const resp = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
    if (resp.status === 200) {
      const body = (await resp.json()) as T;
      await writeCache(url, body, 200);
      return body;
    }
    // Neúspěšný status uložíme taky — negativní cache proti re-fetchováním 404.
    await writeCache(url, null, resp.status);
    return null;
  } catch {
    // Network fail: použij co je v cache i kdyby to bylo stale.
    if (cached && cached.status === 200) return cached.payload as T;
    return null;
  }
}

/** Detail jednoho kusu gearu. Vrátí null při 404 nebo network fail bez cache. */
export async function fetchGear(type: SlackDataGearType, id: number, forceRefresh = false)
  : Promise<SlackDataWebbing | SlackDataWeblock | null> {
  if (type === 'webbing') return fetchWebbing(id, forceRefresh);
  if (type === 'weblock') return fetchWeblock(id, forceRefresh);
  // Ostatní typy (roller/leashring/grip/treepro) dělíme až podle potřeby — MVP pokrývá dvě hlavní.
  return apiGet(`/api/${type}/${id}`, forceRefresh) as Promise<null>;
}

/** Webbing s parsed stretch polem. */
export async function fetchWebbing(id: number, forceRefresh = false): Promise<SlackDataWebbing | null> {
  const raw = await apiGet<SlackDataWebbingRaw>(`/api/webbing/${id}`, forceRefresh);
  if (!raw) return null;
  return { ...raw, stretch: parseStretch(raw.stretch) };
}

export function fetchWeblock(id: number, forceRefresh = false): Promise<SlackDataWeblock | null> {
  return apiGet<SlackDataWeblock>(`/api/weblock/${id}`, forceRefresh);
}

/**
 * Načte všechny ISA warnings, které se navazují na konkrétní gear (`gear_type`, `gear_id`).
 * Backend endpoint `/api/isawarning/` je stránkovaný CRUD — pro MVP taháme první stránku (100)
 * a filtrujeme klientsky. Pokud dataset naroste přes 100, přejít na server-side filter.
 */
export async function fetchISAWarningsForGear(
  type: SlackDataGearType,
  id: number,
): Promise<SlackDataISAWarning[]> {
  const list = await apiGet<SlackDataISAWarning[]>(`/api/isawarning/?limit=100`);
  if (!Array.isArray(list)) return [];
  return list.filter((w) => w.gear_type === type && w.gear_id === id);
}

/**
 * Vyhledá kusy dle brand + name substringu — používá se při seed order drift
 * (ID uložené v `gear.slackdata_ref` už neukazuje na stejný kus).
 * Backend nemá full-text search, takže táhneme první stránku a filtrujeme JS-em.
 * Pro MVP acceptable — 246 webbings / 127 weblocks.
 */
export async function searchByBrandModel(
  type: SlackDataGearType,
  brand: string,
  model: string,
): Promise<SlackDataBase[]> {
  const list = await apiGet<SlackDataBase[]>(`/api/${type}/?limit=500`);
  if (!Array.isArray(list)) return [];
  const b = brand.trim().toLowerCase();
  const m = model.trim().toLowerCase();
  return list.filter(
    (item) =>
      (item.brand_name?.toLowerCase() ?? '').includes(b)
      && item.name.toLowerCase().includes(m),
  );
}

/**
 * Ověří, že `slackdata_ref` v `gear` řádku pořád ukazuje na stejný kus.
 * Vrací true pokud brand + name sedí; jinak false (a caller by měl znovu párovat).
 */
export async function verifyGearRef(
  type: SlackDataGearType,
  id: number,
  expectedBrand: string,
  expectedName: string,
): Promise<boolean> {
  const item = await fetchGear(type, id);
  if (!item) return false;
  const bMatch = (item.brand_name ?? '').toLowerCase().trim() === expectedBrand.toLowerCase().trim();
  const nMatch = item.name.toLowerCase().trim() === expectedName.toLowerCase().trim();
  return bMatch && nMatch;
}

/** Atribuce pro UI (CC BY-SA 4.0). */
export const SLACKDATA_ATTRIBUTION = {
  source: 'SlackData (ISA)',
  url: 'https://slackdata.org',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

/** Ruční vymazání cache — pro tlačítko v Nastavení „Vymazat cache gearu". */
export async function clearSlackDataCache(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM slackdata_cache');
}
