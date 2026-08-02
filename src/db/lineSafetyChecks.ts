/**
 * Per-line Safety Check — persistence (F5 v0.7.2).
 *
 * Kontroly vázané na konkrétní slacklines.id (na rozdíl od per-card sessions
 * v isaSessions.ts, které jsou obecné bez vazby na lajnu).
 *
 * Use case: user si otevře detail lajny, klikne "Zahájit kontrolu", projde
 * pre-generated checklist (vygenerovaný podle parametrů lajny), uloží stav.
 * Při dalším otevření detailu vidí "Naposled zkontrolováno: 15.5.2026 ✓".
 */

import { getDb } from './index';

export type CheckType = 'quick' | 'full';
export type GateStatus = 'complete' | 'partial' | 'skipped';

export interface GatesStatus {
  a?: GateStatus | null;
  b?: GateStatus | null;
  c?: GateStatus | null;
}

export interface LogData {
  tension_kn?: number | null;
  duration_hours?: number | null;
  incident?: boolean;
  incident_note?: string | null;
  lead_rigger?: string | null;
}

export interface LineSafetyCheck {
  id: number;
  slackline_id: number;
  timestamp: string;
  cards_used: string[];                          // parsed z JSON
  items_checked: Record<string, string[]>;       // cardId → [itemId, ...]
  total_items: number;
  checked_items: number;
  overall_status: 'complete' | 'partial';
  gps_lat: number | null;
  gps_lon: number | null;
  note: string | null;
  // v6: Full rig log mode
  check_type: CheckType;
  gates_status: GatesStatus | null;
  log_data: LogData | null;
}

export interface SaveLineSafetyCheckInput {
  slacklineId: number;
  cardsUsed: string[];
  itemsChecked: Record<string, string[]>;
  totalItems: number;
  gpsLat?: number | null;
  gpsLon?: number | null;
  note?: string | null;
  // v6:
  checkType?: CheckType;
  gatesStatus?: GatesStatus | null;
  logData?: LogData | null;
}

export async function saveLineSafetyCheck(input: SaveLineSafetyCheckInput): Promise<number> {
  const db = await getDb();
  const timestamp = new Date().toISOString();
  const checkedCount = Object.values(input.itemsChecked).reduce((acc, arr) => acc + arr.length, 0);
  const status: 'complete' | 'partial' = checkedCount >= input.totalItems ? 'complete' : 'partial';

  const result = await db.runAsync(
    `INSERT INTO line_safety_checks
       (slackline_id, timestamp, cards_used, items_checked, total_items,
        checked_items, overall_status, gps_lat, gps_lon, note,
        check_type, gates_status, log_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slacklineId,
      timestamp,
      JSON.stringify(input.cardsUsed),
      JSON.stringify(input.itemsChecked),
      input.totalItems,
      checkedCount,
      status,
      input.gpsLat ?? null,
      input.gpsLon ?? null,
      input.note ?? null,
      input.checkType ?? 'quick',
      input.gatesStatus ? JSON.stringify(input.gatesStatus) : null,
      input.logData ? JSON.stringify(input.logData) : null,
    ],
  );
  return result.lastInsertRowId as number;
}

export async function listLineSafetyChecks(slacklineId: number, limit = 30): Promise<LineSafetyCheck[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM line_safety_checks WHERE slackline_id = ? ORDER BY timestamp DESC LIMIT ?`,
    [slacklineId, limit],
  );
  return rows.map(parseRow);
}

export async function getLastLineSafetyCheck(slacklineId: number): Promise<LineSafetyCheck | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM line_safety_checks WHERE slackline_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [slacklineId],
  );
  return row ? parseRow(row) : null;
}

export async function countLineSafetyChecks(slacklineId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM line_safety_checks WHERE slackline_id = ?`,
    [slacklineId],
  );
  return row?.n ?? 0;
}

export async function deleteLineSafetyCheck(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM line_safety_checks WHERE id = ?', [id]);
}

// -----------------------------------------------------------------------------

function parseRow(row: any): LineSafetyCheck {
  let cardsUsed: string[] = [];
  let itemsChecked: Record<string, string[]> = {};
  let gatesStatus: GatesStatus | null = null;
  let logData: LogData | null = null;
  try { cardsUsed = JSON.parse(row.cards_used ?? '[]'); } catch {}
  try { itemsChecked = JSON.parse(row.items_checked ?? '{}'); } catch {}
  try { gatesStatus = row.gates_status ? JSON.parse(row.gates_status) : null; } catch {}
  try { logData = row.log_data ? JSON.parse(row.log_data) : null; } catch {}

  return {
    id: row.id,
    slackline_id: row.slackline_id,
    timestamp: row.timestamp,
    cards_used: cardsUsed,
    items_checked: itemsChecked,
    total_items: row.total_items,
    checked_items: row.checked_items,
    overall_status: row.overall_status,
    gps_lat: row.gps_lat,
    gps_lon: row.gps_lon,
    note: row.note,
    check_type: (row.check_type ?? 'quick') as CheckType,
    gates_status: gatesStatus,
    log_data: logData,
  };
}
