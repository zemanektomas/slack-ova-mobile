/**
 * ISA Warnings — auto-fetch při startu, SQLite cache 7 dní.
 *
 * SlackData API `/api/isawarning/` obsahuje 82+ gear-focused ISA warnings/recalls
 * navázaných na konkrétní gear (webbing/weblock/roller/leashring/grip/treepro).
 * Kazdý warning drží manufacturer + model pro fuzzy match s bundled materials.json.
 *
 * Startup flow (_layout.tsx):
 *   1. refreshIfStale() — pokud last fetch > 7 dní, fetch a upsert do SQLite
 *   2. Vsechny GearScreen views (L1 badge / L2 icon / L3 banner) ctou z SQLite
 *   3. Pri offline / API down = stará data zůstavaji dostupná
 */

import { getDb, getMeta, setMeta } from '../db';
import Constants from 'expo-constants';
import type { SlackDataGearType } from './slackdata';

const DEFAULT_BASE = 'https://slackdata.org';
const BASE: string =
  (Constants.expoConfig?.extra as { slackDataBaseUrl?: string } | undefined)?.slackDataBaseUrl
  ?? DEFAULT_BASE;

const REFRESH_TTL_MS = 7 * 24 * 3600 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const META_KEY_LAST_FETCH = 'isa_warnings_last_fetch';

export interface ISAWarning {
  source_id: string;
  status: string;                     // 'Warning' | 'Recall' | 'Notice'
  gear_type: SlackDataGearType | null;
  gear_id: number | null;
  date_iso: string | null;
  product_type: string | null;
  manufacturer: string | null;
  model: string | null;
  in_production: boolean | null;
  description: string;
  solution: string | null;
  product_image: string | null;
  links: string[] | null;
}

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

/** Stáhne všechny stránky (limit=100 max) a vrátí kompletní seznam. */
async function fetchAllWarnings(): Promise<ISAWarning[]> {
  const pageSize = 100;
  const maxPages = 10; // 1000 warnings safety (aktualne ~82)
  const results: ISAWarning[] = [];

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const url = `${BASE}/api/isawarning/?limit=${pageSize}&offset=${offset}`;
    try {
      const resp = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
      if (resp.status !== 200) break;
      const body = (await resp.json()) as ISAWarning[];
      if (!Array.isArray(body) || body.length === 0) break;
      results.push(...body);
      if (body.length < pageSize) break;
    } catch {
      break;
    }
  }
  return results;
}

/** Uloží warnings do SQLite (INSERT OR REPLACE na source_id). */
async function upsertWarnings(warnings: ISAWarning[]): Promise<void> {
  if (warnings.length === 0) return;
  const db = await getDb();
  // Batch v transaction pro rychlost.
  await db.execAsync('BEGIN TRANSACTION');
  try {
    for (const w of warnings) {
      await db.runAsync(
        `INSERT OR REPLACE INTO isa_warnings
         (source_id, status, gear_type, gear_id, date_iso, product_type,
          manufacturer, model, in_production, description, solution, product_image, links)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          w.source_id,
          w.status,
          w.gear_type,
          w.gear_id,
          w.date_iso,
          w.product_type,
          w.manufacturer,
          w.model,
          w.in_production === null ? null : w.in_production ? 1 : 0,
          w.description,
          w.solution,
          w.product_image,
          w.links ? JSON.stringify(w.links) : null,
        ],
      );
    }
    await db.execAsync('COMMIT');
  } catch (err) {
    await db.execAsync('ROLLBACK');
    throw err;
  }
}

/**
 * Refresh warnings pokud se cache stala starou (>7 dní) nebo je prázdná.
 * Volá se ze startupu (_layout.tsx). Non-blocking — chybu ignoruje.
 */
export async function refreshIfStale(force: boolean = false): Promise<{ fetched: number; stale: boolean }> {
  const lastFetch = await getMeta(META_KEY_LAST_FETCH);
  const stale = !lastFetch || Date.now() - new Date(lastFetch).getTime() > REFRESH_TTL_MS;

  if (!stale && !force) return { fetched: 0, stale: false };

  try {
    const warnings = await fetchAllWarnings();
    if (warnings.length > 0) {
      await upsertWarnings(warnings);
      await setMeta(META_KEY_LAST_FETCH, new Date().toISOString());
    }
    return { fetched: warnings.length, stale: true };
  } catch {
    return { fetched: 0, stale: true };
  }
}

/** Vsechny warnings z SQLite cache. */
export async function getAllWarnings(): Promise<ISAWarning[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    source_id: string;
    status: string;
    gear_type: string | null;
    gear_id: number | null;
    date_iso: string | null;
    product_type: string | null;
    manufacturer: string | null;
    model: string | null;
    in_production: number | null;
    description: string;
    solution: string | null;
    product_image: string | null;
    links: string | null;
  }>('SELECT * FROM isa_warnings ORDER BY date_iso DESC');
  return rows.map((r) => ({
    ...r,
    gear_type: r.gear_type as SlackDataGearType | null,
    in_production: r.in_production === null ? null : r.in_production === 1,
    links: r.links ? JSON.parse(r.links) : null,
  }));
}

/**
 * Fuzzy match — najdi warnings pro daný brand + model.
 * Case-insensitive substring match. Použito v L2/L3 GearScreen pro items z materials.json.
 */
export async function findWarningsForItem(brand: string, model: string): Promise<ISAWarning[]> {
  const db = await getDb();
  const b = brand.trim().toLowerCase();
  const m = model.trim().toLowerCase();
  const rows = await db.getAllAsync<{
    source_id: string;
    status: string;
    gear_type: string | null;
    gear_id: number | null;
    date_iso: string | null;
    product_type: string | null;
    manufacturer: string | null;
    model: string | null;
    in_production: number | null;
    description: string;
    solution: string | null;
    product_image: string | null;
    links: string | null;
  }>('SELECT * FROM isa_warnings WHERE manufacturer IS NOT NULL AND model IS NOT NULL');
  const matches = rows.filter(
    (r) =>
      (r.manufacturer?.toLowerCase() ?? '').includes(b)
      && (r.model?.toLowerCase() ?? '').includes(m),
  );
  return matches.map((r) => ({
    ...r,
    gear_type: r.gear_type as SlackDataGearType | null,
    in_production: r.in_production === null ? null : r.in_production === 1,
    links: r.links ? JSON.parse(r.links) : null,
  }));
}

/** Vsechny warnings BEZ manufacturer+model (obecne, ne per-gear). */
export async function getUnmatchedWarnings(): Promise<ISAWarning[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    source_id: string;
    status: string;
    gear_type: string | null;
    gear_id: number | null;
    date_iso: string | null;
    product_type: string | null;
    manufacturer: string | null;
    model: string | null;
    in_production: number | null;
    description: string;
    solution: string | null;
    product_image: string | null;
    links: string | null;
  }>('SELECT * FROM isa_warnings WHERE manufacturer IS NULL OR model IS NULL ORDER BY date_iso DESC');
  return rows.map((r) => ({
    ...r,
    gear_type: r.gear_type as SlackDataGearType | null,
    in_production: r.in_production === null ? null : r.in_production === 1,
    links: r.links ? JSON.parse(r.links) : null,
  }));
}

/** Nejhorší severity z vice warnings — pro L2 ikona a L1 badge coloring. */
export function worstSeverity(warnings: ISAWarning[]): 'Recall' | 'Warning' | 'Notice' | null {
  if (warnings.length === 0) return null;
  if (warnings.some((w) => w.status === 'Recall')) return 'Recall';
  if (warnings.some((w) => w.status === 'Warning')) return 'Warning';
  return 'Notice';
}
