import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  // Read current schema version (0 = fresh DB, missing sync_meta row)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT);
  `);
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    'schema_version',
  );
  const current = row ? parseInt(row.value, 10) : 0;

  if (current < 2) {
    // v2: přidat source + external_id na slacklines (pro Slackmap import)
    try {
      await db.execAsync(`ALTER TABLE slacklines ADD COLUMN source TEXT NOT NULL DEFAULT 'csv'`);
    } catch {}
    try {
      await db.execAsync(`ALTER TABLE slacklines ADD COLUMN external_id TEXT`);
    } catch {}
  }
  if (current < 3) {
    // v3: rich slackmap fields (anchors / access popis + isMeasured warning)
    try { await db.execAsync(`ALTER TABLE slacklines ADD COLUMN anchors_info TEXT`); } catch {}
    try { await db.execAsync(`ALTER TABLE slacklines ADD COLUMN access_info TEXT`); } catch {}
    try { await db.execAsync(`ALTER TABLE slacklines ADD COLUMN is_measured INTEGER`); } catch {}
  }
  // Index na source — vytvoříme až po migraci (sloupec teď určitě existuje)
  try {
    await db.execAsync(`CREATE INDEX IF NOT EXISTS ix_slacklines_source ON slacklines(source)`);
  } catch {}
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_dbPromise) return _dbPromise;
  _dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('slackline.db');
    await db.execAsync(SCHEMA_SQL);
    await migrate(db);
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
      ['schema_version', String(SCHEMA_VERSION)],
    );
    _db = db;
    return db;
  })();
  return _dbPromise;
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    [key, value],
  );
}
