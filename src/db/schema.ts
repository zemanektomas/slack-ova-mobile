// SQLite schema pro lokální mirror serverové DB + lokální stav (outbox, cache).
// Spouští se při startu, idempotentně (CREATE IF NOT EXISTS).

export const SCHEMA_VERSION = 3;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS slacklines (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  state TEXT,
  region TEXT,
  sector TEXT,
  length REAL,
  height REAL,
  author TEXT,
  name_history TEXT,
  date_tense TEXT,
  time_approach TEXT,
  time_tensioning TEXT,
  rating INTEGER,
  cover_image_url TEXT,
  restriction TEXT,
  type TEXT,
  created_by_id TEXT,
  updated_by_id TEXT,
  server_updated_at TEXT,
  source TEXT NOT NULL DEFAULT 'csv',
  external_id TEXT,
  -- v3: slackmap-specific rich fields (api.slackmap.com/line/{id}/details)
  anchors_info TEXT,    -- popis kotev
  access_info TEXT,     -- popis přístupu
  is_measured INTEGER   -- 0/1/NULL (NULL = neuvedeno; false = "Not Measured" warning)
);

CREATE TABLE IF NOT EXISTS points (
  id INTEGER PRIMARY KEY,
  description TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS components (
  id INTEGER PRIMARY KEY,
  slackline_id INTEGER NOT NULL,
  point_id INTEGER NOT NULL,
  component_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crossings (
  id INTEGER PRIMARY KEY,
  slackline_id INTEGER NOT NULL,
  user_id TEXT,
  date TEXT,
  style TEXT,
  accent_description TEXT,
  rating INTEGER,
  image_url TEXT,
  project INTEGER,
  server_updated_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS pending_mutations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempted_at TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS cached_images (
  url TEXT PRIMARY KEY,
  local_path TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_points_bbox ON points(latitude, longitude);
CREATE INDEX IF NOT EXISTS ix_components_type ON components(component_type, slackline_id);
CREATE INDEX IF NOT EXISTS ix_components_slackline ON components(slackline_id);
CREATE INDEX IF NOT EXISTS ix_crossings_slackline ON crossings(slackline_id);
CREATE INDEX IF NOT EXISTS ix_crossings_user ON crossings(user_id);
`;
