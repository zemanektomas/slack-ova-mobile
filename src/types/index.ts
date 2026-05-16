// TS typy zrcadlí webový frontend (apps/slackline-app/frontend/src/types/index.ts).
// Plán (ADR-005): nahradit symlinkem nebo shared/types/ package.

export interface PointResponse {
  id: number;
  description?: string | null;
  latitude: number;
  longitude: number;
}

export interface SlacklineListItem {
  id: number;
  name: string;
  state?: string | null;
  region?: string | null;
  length?: number | null;
  height?: number | null;
  rating?: number | null;
  date_tense?: string | null;
  source?: 'csv' | 'slackmap';
  type?: string | null;  // 'highline' / 'longline' / 'waterline' / 'midline' / 'other' / ...
  first_anchor?: PointResponse | null;
  second_anchor?: PointResponse | null;
}

export interface SlacklineDetail {
  id: number;
  name: string;
  description?: string | null;
  state?: string | null;
  region?: string | null;
  sector?: string | null;
  length?: number | null;
  height?: number | null;
  author?: string | null;
  name_history?: string | null;
  date_tense?: string | null;
  time_approach?: string | null;
  time_tensioning?: string | null;
  rating?: number | null;
  cover_image_url?: string | null;
  restriction?: string | null;
  type?: string | null;
  source?: 'csv' | 'slackmap';
  external_id?: string | null;
  // v3: rich slackmap fields (api.slackmap.com/line/{id}/details)
  anchors_info?: string | null;
  access_info?: string | null;
  is_measured?: number | null;  // 0/1/null (SQLite ukládá INTEGER, ne boolean)
  first_anchor_point?: PointResponse | null;
  second_anchor_point?: PointResponse | null;
  parking_spot?: PointResponse | null;
}

export interface CrossingItem {
  id: number;
  slackline_id: number;
  date?: string | null;
  style?: string | null;
  accent_description?: string | null;
  rating?: number | null;
  image_url?: string | null;
  project?: boolean | null;
  user?: { id: string; username: string; avatar_url?: string | null } | null;
}

export interface MapBounds {
  sw: { lat: number; lon: number };
  ne: { lat: number; lon: number };
}

export type SortKey = 'name' | 'length' | 'height' | 'rating' | 'distance';
export type SortDir = 'asc' | 'desc';
