// Import linií ze Slackmap (https://slackmap.com).
// Hlavní cesta: bundled JSON v assets/seed/slackmap_world.json (build-time fetch).
// Pull-to-refresh: stáhne čerstvá data z netu (data.slackmap.com).
// Synthetic SQLite id: záporné čísla od -1 dolů (aby se nepralo se slack.cz int ID).

import { getDb, setMeta } from './index';
import { useSyncStore } from '../store/syncStore';
import { isoToCountryName } from './countryNames';

const LINES_URL = 'https://data.slackmap.com/geojson/lines/all.geojson';
const DETAIL_URL = (id: string) => `https://api.slackmap.com/line/${id}/details`;

interface BundledLine {
  id: string;        // slackmap external id
  c: string | null;  // country
  l: string | null;  // length "170.0m"
  lt: string | null; // line type code
  coords: number[][]; // [[lon,lat],[lon,lat]]
}

interface BundledDetail {
  name: string | null;
  description: string | null;
  height: number | null;
  length: number | null;
  type: string | null;
  restriction: string | null;
  anchorsInfo: string | null;
  accessInfo: string | null;
  isMeasured: boolean | null;
}

interface BundledPayload {
  version: number;
  fetched_at: string;
  detail_countries: string[];
  lines: BundledLine[];
  details: Record<string, BundledDetail>;
}

interface SlackmapFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString' | 'Point';
    coordinates: number[][] | number[];
  };
  properties: {
    id: string;
    ft?: string;      // feature type 'l'/'s'/'g'
    l?: string;       // length "170.0m"
    lt?: string;      // line type 'h' = highline
    c?: string;       // country ISO-2
  };
}

interface SlackmapDetail {
  id: string;
  name?: string;
  description?: string;
  type?: string;        // highline / midline / waterline / longline
  length?: number;
  height?: number;
  accessInfo?: string;
  anchorsInfo?: string;
  gearInfo?: string;
  contactInfo?: string;
  restrictionLevel?: string;
  restrictionInfo?: string;
  extraInfo?: string;
  isMeasured?: boolean;
  images?: { url: string }[];
  anchorImages?: { url: string }[];
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  geoJson?: any;
}

function lengthFromString(s?: string | null): number | null {
  if (!s) return null;
  const m = /([\d.]+)/.exec(s);
  return m ? parseFloat(m[1]) : null;
}

function mapLineType(lt?: string | null): string | null {
  // Slackmap kódy: h = highline, w = waterline, m = midline, l = longline
  switch (lt) {
    case 'h': return 'highline';
    case 'w': return 'waterline';
    case 'm': return 'midline';
    case 'l': return 'longline';
    default:  return null;
  }
}

async function loadBundledPayload(): Promise<BundledPayload> {
  // Metro řeší .json import přímo — vrátí už parsovaný objekt, žádný asset registry
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const payload = require('../../assets/seed/slackmap_world.json') as BundledPayload;
  return payload;
}

// Načte data ze sítě (pull-to-refresh) — vrátí stejný BundledPayload tvar.
async function fetchPayloadFromNetwork(): Promise<BundledPayload> {
  const res = await fetch(LINES_URL);
  if (!res.ok) throw new Error(`Slackmap GeoJSON HTTP ${res.status}`);
  const json = await res.json() as { features: SlackmapFeature[] };
  const lines: BundledLine[] = json.features
    .filter((f) => f.geometry?.type === 'LineString' && f.properties?.id)
    .map((f) => ({
      id: f.properties.id,
      c: f.properties.c ?? null,
      l: f.properties.l ?? null,
      lt: f.properties.lt ?? null,
      coords: f.geometry.coordinates as number[][],
    }));
  return {
    version: 1,
    fetched_at: new Date().toISOString(),
    detail_countries: [],
    lines,
    details: {},
  };
}

export async function seedFromSlackmap(opts: { fromNetwork?: boolean } = {}): Promise<{ slacklines: number; points: number; components: number }> {
  const syncStore = useSyncStore.getState();
  syncStore.setSyncing(true);
  syncStore.setError(null);

  try {
    const payload = opts.fromNetwork
      ? await fetchPayloadFromNetwork()
      : await loadBundledPayload();

    const allLines = payload.lines;

    const db = await getDb();

    // Pojistka: pokud z předchozího pokusu zůstala otevřená transakce
    // (např. po hot reload nebo crash uvnitř withTransactionAsync), zavři ji.
    // SQLite tu transakci jinak drží, dokud handle neumře, a všechny další
    // BEGIN selžou na "cannot start a transaction within a transaction".
    try { await db.execAsync('ROLLBACK'); } catch {}

    // Smaž předchozí slackmap data.
    // Krok 1: zjisti, které body patří ke slackmap (přes components → slacklines.source).
    // Slackmap body mají id < 0 (synthetic), CSV body mají id > 0. Stačí mazat negative IDs.
    await db.runAsync(`DELETE FROM components WHERE slackline_id < 0`);
    await db.runAsync(`DELETE FROM points WHERE id < 0`);
    await db.runAsync(`DELETE FROM slacklines WHERE source = 'slackmap'`);

    // Min existing IDs po vyčištění (mimo transakci)
    const minRow = await db.getFirstAsync<{ m: number | null }>(`SELECT MIN(id) AS m FROM slacklines`);
    let nextSlId = Math.min(-1, (minRow?.m ?? 0) - 1);
    const minPointRow = await db.getFirstAsync<{ m: number | null }>(`SELECT MIN(id) AS m FROM points`);
    let nextPointId = Math.min(-1, (minPointRow?.m ?? 0) - 1);
    const minCompRow = await db.getFirstAsync<{ m: number | null }>(`SELECT MIN(id) AS m FROM components`);
    let nextCompId = Math.min(-1, (minCompRow?.m ?? 0) - 1);

    let insertedSlacklines = 0;
    let insertedPoints = 0;
    let insertedComponents = 0;

    await db.withTransactionAsync(async () => {

      for (const f of allLines) {
        const coords = f.coords;
        if (!coords || coords.length < 2) continue;
        const [a1, a2] = coords;
        if (!a1 || !a2) continue;

        const slId = nextSlId--;
        const externalId = f.id;
        const isoCountry = f.c;
        const stateName = isoToCountryName(isoCountry);  // "CZ" -> "Česká republika"
        const detail = payload.details[externalId];
        const lineLength = detail?.length ?? lengthFromString(f.l);
        const lineType = detail?.type ?? mapLineType(f.lt);

        // Použij reálný název z bundled detailu, jinak placeholder "Česká republika · highline · 170m".
        // 50 % slackmap lajn má name === "" (prázdný string, ne null) — `??` na to nereaguje,
        // proto explicit trim() check.
        const placeholderParts = [
          stateName,
          lineType === 'highline' ? 'highline' : null,
          lineLength ? `${lineLength}m` : null,
        ].filter(Boolean);
        const realName = detail?.name?.trim();
        const name = (realName && realName.length > 0)
          ? realName
          : (placeholderParts.length > 0 ? placeholderParts.join(' · ') : `Slackmap ${externalId}`);

        await db.runAsync(
          `INSERT INTO slacklines
           (id, name, description, state, length, height, type, restriction,
            anchors_info, access_info, is_measured,
            source, external_id, server_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?,  ?, ?, ?,  'slackmap', ?, ?)`,
          [
            slId, name, detail?.description ?? null, stateName,
            lineLength, detail?.height ?? null, lineType, detail?.restriction ?? null,
            detail?.anchorsInfo ?? null,
            detail?.accessInfo ?? null,
            detail?.isMeasured === true ? 1 : (detail?.isMeasured === false ? 0 : null),
            externalId, new Date().toISOString(),
          ],
        );
        insertedSlacklines++;

        // anchor 1
        const p1Id = nextPointId--;
        await db.runAsync(
          `INSERT INTO points (id, latitude, longitude) VALUES (?, ?, ?)`,
          [p1Id, a1[1], a1[0]],
        );
        insertedPoints++;
        await db.runAsync(
          `INSERT INTO components (id, slackline_id, point_id, component_type)
           VALUES (?, ?, ?, 'first_anchor_point')`,
          [nextCompId--, slId, p1Id],
        );
        insertedComponents++;

        // anchor 2
        const p2Id = nextPointId--;
        await db.runAsync(
          `INSERT INTO points (id, latitude, longitude) VALUES (?, ?, ?)`,
          [p2Id, a2[1], a2[0]],
        );
        insertedPoints++;
        await db.runAsync(
          `INSERT INTO components (id, slackline_id, point_id, component_type)
           VALUES (?, ?, ?, 'second_anchor_point')`,
          [nextCompId--, slId, p2Id],
        );
        insertedComponents++;
      }
    });

    await setMeta('seeded_from_slackmap', 'bundled-v3');
    syncStore.setLastSyncAt(new Date().toISOString());

    return { slacklines: insertedSlacklines, points: insertedPoints, components: insertedComponents };
  } catch (err: any) {
    console.warn('[slackmap] seed failed', String(err));
    syncStore.setError(err?.message ?? 'Slackmap seed failed');
    throw err;
  } finally {
    syncStore.setSyncing(false);
  }
}

// Lazy detail pro konkrétní linii (název, popis, height).
// Volá se z DetailScreen / InlineDetail při prvním otevření.
export async function fetchAndCacheSlackmapDetail(slacklineId: number): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ external_id: string | null; source: string }>(
    `SELECT external_id, source FROM slacklines WHERE id = ?`,
    slacklineId,
  );
  if (!row || row.source !== 'slackmap' || !row.external_id) return;
  await fetchAndStoreOne(db, slacklineId, row.external_id);
}

async function fetchAndStoreOne(
  db: Awaited<ReturnType<typeof getDb>>,
  slacklineId: number,
  externalId: string,
): Promise<boolean> {
  try {
    const res = await fetch(DETAIL_URL(externalId));
    if (!res.ok) return false;
    const d = await res.json() as SlackmapDetail;
    await db.runAsync(
      `UPDATE slacklines SET
         name = COALESCE(?, name),
         description = ?,
         height = ?,
         length = COALESCE(?, length),
         type = COALESCE(?, type),
         restriction = ?
       WHERE id = ?`,
      [
        d.name ?? null,
        d.description ?? null,
        d.height ?? null,
        d.length ?? null,
        d.type ?? null,
        [d.restrictionLevel, d.restrictionInfo].filter(Boolean).join(': ') || null,
        slacklineId,
      ],
    );
    return true;
  } catch (e) {
    return false;
  }
}

// Bulk background fetch pro konkrétní zemi (např. CZ).
// Spouští se po startu apky — paralelně po batchích 10, mezi batchemi krátký sleep.
// Vlastní meta klíč zabrání opakování.
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;

export async function prefetchDetailsForCountry(countryIso: string): Promise<{ done: number; failed: number; skipped: number }> {
  const db = await getDb();
  const metaKey = `slackmap_details_prefetched_${countryIso}`;
  const already = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    metaKey,
  );
  if (already) return { done: 0, failed: 0, skipped: 0 };

  // Po normalizaci state v seedu používáme českou name ("Česká republika"), ne ISO.
  // Tato funkce přijímá ISO-2 ze zvyklosti, mapujeme na cílový string.
  const stateName = isoToCountryName(countryIso);

  // Najdi všechny slackmap linie pro tuto zemi, které ještě nemají description
  const rows = await db.getAllAsync<{ id: number; external_id: string }>(
    `SELECT id, external_id FROM slacklines
     WHERE source = 'slackmap' AND state = ? AND description IS NULL AND external_id IS NOT NULL`,
    stateName,
  );
  if (rows.length === 0) {
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
      [metaKey, new Date().toISOString()],
    );
    return { done: 0, failed: 0, skipped: 0 };
  }

  let done = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((r) => fetchAndStoreOne(db, r.id, r.external_id)),
    );
    for (const ok of results) ok ? done++ : failed++;
    if (i + BATCH_SIZE < rows.length) {
      await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
    }
  }

  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    [metaKey, new Date().toISOString()],
  );

  return { done, failed, skipped: 0 };
}
