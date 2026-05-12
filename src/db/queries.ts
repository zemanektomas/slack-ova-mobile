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

interface QueryByBoundsArgs {
  bounds: MapBounds | null;     // null = bez bbox filtru (zobrazit vše) — používá se dokud není mapa
  sortBy: SortKey;
  sortDir: SortDir;
  center?: { lat: number; lon: number }; // pro sort by distance
  limit?: number;
  search?: string;
  sourceFilter?: SourceFilter;
  stateFilter?: string | null;   // přesné porovnání s slacklines.state
  regionFilter?: string | null;  // přesné porovnání s slacklines.region
  sectorFilter?: string | null;  // přesné porovnání s slacklines.sector
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
    stateFilter,
    regionFilter,
    sectorFilter,
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

  const stateClause = stateFilter ? `AND s.state = ?` : '';
  const stateParams = stateFilter ? [stateFilter] : [];

  const regionClause = regionFilter ? `AND s.region = ?` : '';
  const regionParams = regionFilter ? [regionFilter] : [];

  const sectorClause = sectorFilter ? `AND s.sector = ?` : '';
  const sectorParams = sectorFilter ? [sectorFilter] : [];

  const sql = `
    SELECT
      s.id, s.name, s.state, s.region, s.length, s.height, s.rating, s.date_tense, s.source,
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
      ${stateClause}
      ${regionClause}
      ${sectorClause}
    ORDER BY ${col} ${dir} NULLS LAST
    LIMIT ?
  `;

  const params = [
    ...boundsParams,
    ...searchParams,
    ...sourceParams,
    ...stateParams,
    ...regionParams,
    ...sectorParams,
    limit,
  ];

  const rows = await db.getAllAsync<any>(sql, params);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    state: r.state,
    region: r.region,
    length: r.length,
    height: r.height,
    rating: r.rating,
    date_tense: r.date_tense,
    source: r.source as 'csv' | 'slackmap',
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
    name: sl.name,
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

// --- Filtr helpery: distinct state/region/sector pro cascading picker ---

export async function getDistinctStates(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ state: string }>(
    `SELECT DISTINCT state FROM slacklines
     WHERE state IS NOT NULL AND state != ''
     ORDER BY state`,
  );
  return rows.map((r) => r.state);
}

export async function getDistinctRegions(state?: string | null): Promise<string[]> {
  const db = await getDb();
  const sql = state
    ? `SELECT DISTINCT region FROM slacklines
       WHERE region IS NOT NULL AND region != '' AND state = ?
       ORDER BY region`
    : `SELECT DISTINCT region FROM slacklines
       WHERE region IS NOT NULL AND region != ''
       ORDER BY region`;
  const rows = await db.getAllAsync<{ region: string }>(sql, state ? [state] : []);
  return rows.map((r) => r.region);
}

export async function getDistinctSectors(
  state?: string | null,
  region?: string | null,
): Promise<string[]> {
  const db = await getDb();
  const clauses: string[] = ["sector IS NOT NULL", "sector != ''"];
  const params: string[] = [];
  if (state) {
    clauses.push('state = ?');
    params.push(state);
  }
  if (region) {
    clauses.push('region = ?');
    params.push(region);
  }
  const sql = `SELECT DISTINCT sector FROM slacklines
               WHERE ${clauses.join(' AND ')}
               ORDER BY sector`;
  const rows = await db.getAllAsync<{ sector: string }>(sql, params);
  return rows.map((r) => r.sector);
}
