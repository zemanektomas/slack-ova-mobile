/**
 * ISA Safety Companion — session log persistence.
 *
 * Sessions ukládané do SQLite tabulky isa_check_sessions (schema v4).
 * Session = single card checklist run (např. SERENE check per anchor build).
 *
 * Používá se z ISASafetySheet v session mode:
 *   1. startSession(cardId) → sessionId
 *   2. (uživatel klikoteže checkboxy — state v UI paměti)
 *   3. saveSession(...) na "Uložit" → persist s timestamp + optional GPS
 *   4. listSessions(cardId) → historie pro daný checklist
 */

import { getDb } from './index';

export interface ISASession {
  id: number;
  card_id: string;
  started_at: string;
  completed_at: string | null;
  total_items: number;
  checked_items: number;
  checked_ids: string[];  // parsed from JSON
  gps_lat: number | null;
  gps_lon: number | null;
  note: string | null;
}

export interface SaveSessionInput {
  cardId: string;
  startedAt: string;
  totalItems: number;
  checkedIds: string[];
  gpsLat?: number | null;
  gpsLon?: number | null;
  note?: string | null;
}

export async function saveSession(input: SaveSessionInput): Promise<number> {
  const db = await getDb();
  const completedAt = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO isa_check_sessions
       (card_id, started_at, completed_at, total_items, checked_items, checked_ids, gps_lat, gps_lon, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.cardId,
      input.startedAt,
      completedAt,
      input.totalItems,
      input.checkedIds.length,
      JSON.stringify(input.checkedIds),
      input.gpsLat ?? null,
      input.gpsLon ?? null,
      input.note ?? null,
    ],
  );
  return result.lastInsertRowId as number;
}

export async function listSessions(cardId?: string, limit = 20): Promise<ISASession[]> {
  const db = await getDb();
  const rows = cardId
    ? await db.getAllAsync<any>(
        `SELECT * FROM isa_check_sessions WHERE card_id = ? ORDER BY completed_at DESC LIMIT ?`,
        [cardId, limit],
      )
    : await db.getAllAsync<any>(
        `SELECT * FROM isa_check_sessions ORDER BY completed_at DESC LIMIT ?`,
        [limit],
      );
  return rows.map(parseRow);
}

export async function countSessions(cardId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) as n FROM isa_check_sessions WHERE card_id = ?',
    [cardId],
  );
  return row?.n ?? 0;
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM isa_check_sessions WHERE id = ?', [id]);
}

// -----------------------------------------------------------------------------

function parseRow(row: any): ISASession {
  let checkedIds: string[] = [];
  try {
    checkedIds = JSON.parse(row.checked_ids ?? '[]');
  } catch {}
  return {
    id: row.id,
    card_id: row.card_id,
    started_at: row.started_at,
    completed_at: row.completed_at,
    total_items: row.total_items,
    checked_items: row.checked_items,
    checked_ids: checkedIds,
    gps_lat: row.gps_lat,
    gps_lon: row.gps_lon,
    note: row.note,
  };
}
