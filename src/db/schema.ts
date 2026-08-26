// SQLite schema pro lokální mirror serverové DB + lokální stav (outbox, cache).
// Spouští se při startu, idempotentně (CREATE IF NOT EXISTS).

export const SCHEMA_VERSION = 7;

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

-- v4: ISA Safety Companion — session log (per-card, obecná kontrola)
CREATE TABLE IF NOT EXISTS isa_check_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_items INTEGER NOT NULL,
  checked_items INTEGER NOT NULL,
  checked_ids TEXT NOT NULL,   -- JSON array of item ids
  gps_lat REAL,
  gps_lon REAL,
  note TEXT
);

-- v5: Per-line Safety Check (F5 v0.7.2) — kontrola vázaná na konkrétní lajnu
-- v6: Rozšíření o Full rig log mode (check_type, gates_status, log_data)
CREATE TABLE IF NOT EXISTS line_safety_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slackline_id INTEGER NOT NULL,       -- FK na slacklines.id
  timestamp TEXT NOT NULL,              -- ISO — dokončení kontroly
  cards_used TEXT NOT NULL,             -- JSON: [cardId, ...] které byly v checklistu
  items_checked TEXT NOT NULL,          -- JSON: {cardId: [itemId, ...]} co uživatel odškrtl
  total_items INTEGER NOT NULL,         -- celkem bodů v checklistu
  checked_items INTEGER NOT NULL,       -- kolik z nich odškrtnuto
  overall_status TEXT NOT NULL,         -- 'complete' | 'partial'
  gps_lat REAL,
  gps_lon REAL,
  note TEXT,
  -- v6 (rig log mode):
  check_type TEXT NOT NULL DEFAULT 'quick',  -- 'quick' | 'full'
  gates_status TEXT,                    -- JSON: {a, b, c} → 'complete'|'partial'|'skipped'|null
  log_data TEXT                         -- JSON: {tension_kn, duration_hours, incident, incident_note, lead_rigger}
);

-- v7: F5 Gear + Reports (Vybaveni + Reporty taby, v0.8.0)
-- Master data: uzivatelovo vybaveni per kus.
-- 6 kategorii (Q9 = C funkcni): webbing / anchor_system / personal / rescue / tools / other
-- Prefill z assets/materials.json (Q8 = D bundled + user overlay), material_id = FK do JSON.
CREATE TABLE IF NOT EXISTS gear (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,                 -- 'webbing' | 'anchor_system' | 'personal' | 'rescue' | 'tools' | 'other'
  subtype TEXT,                           -- 'weblock' | 'shackle' | 'carabiner' | 'harness' | 'pas' | 'leash' | 'ring' | 'sling' | ...
  material_family TEXT,                   -- 'nylon' | 'polyester' | 'uhmwpe' | 'aluminum' | 'steel' | ...
  webbing_type TEXT,                      -- 'A+' | 'A' | 'B' | 'C' (jen pro webbing)
  brand TEXT,
  model TEXT,
  serial TEXT,
  length_m REAL,
  width_mm REAL,
  mbs_kn REAL,
  wll_kn REAL,
  purchase_date TEXT,                     -- ISO 8601
  first_use_date TEXT,
  retirement_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'retired' | 'lost' | 'sold' | 'damaged'
  color TEXT,
  photo_uri TEXT,                         -- fs://.../documentDirectory/gear/{id}/photo.jpg
  thumbnail_uri TEXT,                     -- 400x400 pro list view
  notes TEXT,
  rlt_days_estimate INTEGER,              -- default z materials.json.rlt_days_default, user override
  isa_cert TEXT,                          -- 'ISA:41 Type B' | 'ISA:51' | 'ISA:37' | ...
  material_id TEXT,                       -- FK do assets/materials.json (napr. 'slacktivity-y2k-25mm'), nebo NULL = user overlay
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- v7: Reports (rig + incident + near_miss v jedne tabulce, Q10 = D report typ s filter)
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                     -- 'rig' | 'incident' | 'near_miss'
  incident_category TEXT,                 -- pro type='incident' (fall/rescue/harness/weblock/anchor/webbing/environmental/vehicle/electrostatic/pre_accident/ppe/legal)
  linked_report_id INTEGER,               -- FK reports.id (incident linked to rig session)
  linked_gear_id INTEGER,                 -- FK gear.id (gear failure - napr. Al weblock crack)
  slackline_id INTEGER,                   -- FK slacklines.id (nebo NULL pro lajnu mimo mapu)
  line_name TEXT,                         -- fallback pokud slackline_id NULL
  session_date TEXT NOT NULL,             -- ISO 8601
  session_end TEXT,                       -- pro multi-day sessions (kurz apod.)
  payload TEXT NOT NULL,                  -- JSON: A-G struktura pro rig (ADR-051), incident spec pro incident
  status TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'committed' | 'archived'
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- v7: Junction table report <-> gear (kdo v reportu pouzil jaky gear + role)
-- Umoznuje historii pouziti per kus (cross-ref 4: Vybaveni <-> Reporty)
CREATE TABLE IF NOT EXISTS report_gear (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL,             -- FK reports.id
  gear_id INTEGER NOT NULL,               -- FK gear.id
  role TEXT,                              -- 'main' | 'backup' | 'leash' | 'anchor_a' | 'anchor_b' | 'rescue' | 'other'
  peak_tension_kn REAL,                   -- max namerena tenze pri teto session (kdyz je load cell)
  hours_used REAL                         -- doba expozice na lajne (pro RLT tracking)
);

CREATE INDEX IF NOT EXISTS ix_points_bbox ON points(latitude, longitude);
CREATE INDEX IF NOT EXISTS ix_components_type ON components(component_type, slackline_id);
CREATE INDEX IF NOT EXISTS ix_components_slackline ON components(slackline_id);
CREATE INDEX IF NOT EXISTS ix_crossings_slackline ON crossings(slackline_id);
CREATE INDEX IF NOT EXISTS ix_crossings_user ON crossings(user_id);
CREATE INDEX IF NOT EXISTS ix_isa_sessions_card ON isa_check_sessions(card_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS ix_line_safety_line ON line_safety_checks(slackline_id, timestamp DESC);
-- v7 indexy
CREATE INDEX IF NOT EXISTS ix_gear_category_status ON gear(category, status);
CREATE INDEX IF NOT EXISTS ix_gear_subtype ON gear(subtype);
CREATE INDEX IF NOT EXISTS ix_reports_type_date ON reports(type, session_date DESC);
CREATE INDEX IF NOT EXISTS ix_reports_slackline ON reports(slackline_id);
CREATE INDEX IF NOT EXISTS ix_reports_gear ON reports(linked_gear_id);
CREATE INDEX IF NOT EXISTS ix_report_gear_report ON report_gear(report_id);
CREATE INDEX IF NOT EXISTS ix_report_gear_gear ON report_gear(gear_id);
`;
