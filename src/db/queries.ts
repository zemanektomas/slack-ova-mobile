import { getDb } from './index';
import type { MapBounds, SlacklineListItem, SortKey, SortDir } from '../types';
import type { SourceFilter } from '../store/mapStore';

const SORT_COLUMNS: Record<SortKey, string> = {
  name: 's.name',
  length: 's.length',
  height: 's.height',
  rating: 's.rating',
  distance: 'distance', // computed
};

// Fallback název pro lajny s prázdným `name` — typicky 50 % Slackmap lajn.
// Skládá `type · state · length` z toho co máme. Příklady:
//   "highline · Česká republika · 170m"
//   "longline · Polsko · 49m"
//   "Slackmap" (poslední záchranná síť pokud nic není)
function nameFallback(r: { name?: string | null; type?: string | null; state?: string | null; length?: number | null }): string {
  const trimmed = r.name?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  const parts = [
    r.type || null,
    r.state || null,
    r.length ? `${Math.round(r.length)}m` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Slackline';
}

interface QueryByBoundsArgs {
  bounds: MapBounds | null;     // null = bez bbox filtru (zobrazit vše) — používá se dokud není mapa
  sortBy: SortKey;
  sortDir: SortDir;
  center?: { lat: number; lon: number }; // pro sort by distance
  limit?: number;
  search?: string;
  sourceFilter?: SourceFilter;
}

// Vrátí slacklines, jejichž first_anchor_point je uvnitř bbox (nebo všechny pokud bounds === null).
// Toto je hot path — volá se na každý map move/zoom.
export async function queryByBounds(args: QueryByBoundsArgs): Promise<SlacklineListItem[]> {
  const db = await getDb();
  const {
    bounds,
    sortBy,
    sortDir,
    center,
    limit = 1000,
    search,
    sourceFilter = 'all',
  } = args;
  const col = SORT_COLUMNS[sortBy] ?? 's.name';
  const dir = sortDir === 'desc' ? 'DESC' : 'ASC';

  // Distance výpočet: Haversine ne, jen euclidean ve stupních — pro řazení v ČR stačí.
  const distanceExpr = center
    ? `((p.latitude - ${center.lat}) * (p.latitude - ${center.lat}) +
       (p.longitude - ${center.lon}) * (p.longitude - ${center.lon}))`
    : '0';

  const boundsClause = bounds
    ? 'AND p.latitude BETWEEN ? AND ? AND p.longitude BETWEEN ? AND ?'
    : '';
  const boundsParams = bounds
    ? [bounds.sw.lat, bounds.ne.lat, bounds.sw.lon, bounds.ne.lon]
    : [];

  const searchClause = search ? `AND (s.name LIKE ? OR s.region LIKE ? OR s.sector LIKE ?)` : '';
  const searchParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

  const sourceClause = sourceFilter !== 'all' ? `AND s.source = ?` : '';
  const sourceParams = sourceFilter !== 'all' ? [sourceFilter] : [];

  const sql = `
    SELECT
      s.id, s.name, s.state, s.region, s.length, s.height, s.rating, s.date_tense, s.source, s.type,
      p.id AS a1_id, p.latitude AS a1_lat, p.longitude AS a1_lon, p.description AS a1_desc,
      p2.id AS a2_id, p2.latitude AS a2_lat, p2.longitude AS a2_lon, p2.description AS a2_desc,
      ${distanceExpr} AS distance
    FROM slacklines s
    JOIN components c ON c.slackline_id = s.id AND c.component_type = 'first_anchor_point'
    JOIN points p ON p.id = c.point_id
    LEFT JOIN components c2 ON c2.slackline_id = s.id AND c2.component_type = 'second_anchor_point'
    LEFT JOIN points p2 ON p2.id = c2.point_id
    WHERE 1=1
      ${boundsClause}
      ${searchClause}
      ${sourceClause}
    ORDER BY ${col} ${dir} NULLS LAST
    LIMIT ?
  `;

  const params = [
    ...boundsParams,
    ...searchParams,
    ...sourceParams,
    limit,
  ];

  const rows = await db.getAllAsync<any>(sql, params);

  return rows.map((r) => ({
    id: r.id,
    name: nameFallback(r),
    state: r.state,
    region: r.region,
    length: r.length,
    height: r.height,
    rating: r.rating,
    date_tense: r.date_tense,
    source: r.source as 'csv' | 'slackmap',
    type: r.type ?? null,
    distance_km: center ? haversineKm(center.lat, center.lon, r.a1_lat, r.a1_lon) : null,
    first_anchor: {
      id: r.a1_id,
      description: r.a1_desc,
      latitude: r.a1_lat,
      longitude: r.a1_lon,
    },
    second_anchor: r.a2_id !== null && r.a2_id !== undefined
      ? { id: r.a2_id, description: r.a2_desc, latitude: r.a2_lat, longitude: r.a2_lon }
      : null,
  }));
}

// Haversine v km. SQL distanceExpr je euclidean ve stupních (pro sort dostačující),
// ale pro UI display potřebujeme reálné km — degree-distance je v různých zeměpisných
// šířkách různý, řazení by se nelíšilo, ale uživatel chce vidět "12 km", ne "0.18°²".
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function getSlacklineCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM slacklines');
  return row?.n ?? 0;
}

import type { SlacklineDetail, PointResponse } from '../types';

export async function getSlacklineDetail(id: number): Promise<SlacklineDetail | null> {
  const db = await getDb();
  const sl = await db.getFirstAsync<any>(
    'SELECT * FROM slacklines WHERE id = ?',
    id,
  );
  if (!sl) return null;

  const points = await db.getAllAsync<any>(
    `SELECT c.component_type, p.id, p.description, p.latitude, p.longitude
     FROM components c JOIN points p ON p.id = c.point_id
     WHERE c.slackline_id = ?`,
    id,
  );

  const findPoint = (type: string): PointResponse | null => {
    const r = points.find((p) => p.component_type === type);
    if (!r) return null;
    return { id: r.id, description: r.description, latitude: r.latitude, longitude: r.longitude };
  };

  return {
    id: sl.id,
    name: nameFallback(sl),
    description: sl.description,
    state: sl.state,
    region: sl.region,
    sector: sl.sector,
    length: sl.length,
    height: sl.height,
    author: sl.author,
    name_history: sl.name_history,
    date_tense: sl.date_tense,
    time_approach: sl.time_approach,
    time_tensioning: sl.time_tensioning,
    rating: sl.rating,
    cover_image_url: sl.cover_image_url,
    restriction: sl.restriction,
    type: sl.type,
    source: (sl.source as 'csv' | 'slackmap') ?? 'csv',
    external_id: sl.external_id ?? null,
    anchors_info: sl.anchors_info ?? null,
    access_info: sl.access_info ?? null,
    is_measured: sl.is_measured ?? null,
    first_anchor_point: findPoint('first_anchor_point'),
    second_anchor_point: findPoint('second_anchor_point'),
    parking_spot: findPoint('parking_spot'),
  };
}

// Vrátí true pokud má slackline načtené i detail-only sloupce (description / parking_spot).
// Když ne, je čas zavolat fetchAndCacheDetail().
export async function hasDetailCached(id: number): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ description: string | null }>(
    'SELECT description FROM slacklines WHERE id = ?',
    id,
  );
  // description je nejtypičtější detail-only pole; pokud je null po listing-only sync, ještě jsme nestáhli detail
  return row?.description !== null && row?.description !== undefined;
}

