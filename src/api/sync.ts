// Sync engine — verze bez serverových sync endpointů.
// Při prvním spuštění (nebo pull-to-refresh) stáhne kompletní snapshot
// přes existující REST endpointy a uloží do lokálního SQLite.
//
// Pozn.: tohle není pravý delta-sync. Re-download = celá DB znovu.
// Až budou /api/v1/sync endpointy (viz projektová dokumentace, sekce 4), tahle logika se nahradí.

import { api } from './client';
import { getDb, setMeta } from '../db';
import { useSyncStore } from '../store/syncStore';
import type { SlacklineListItem } from '../types';

const PAGE_SIZE = 1000; // backend nemá explicitní limit, ale stránkuj pro jistotu

interface SlacklinesResponse {
  items: any[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

async function fetchAllSlacklines(): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const { data } = await api.get<SlacklinesResponse>('/slacklines', {
      params: { page, page_size: PAGE_SIZE, sort_by: 'id', sort_dir: 'asc' },
    });
    all.push(...data.items);
    if (page >= data.pages || data.items.length === 0) break;
    page++;
  }
  return all;
}

async function fetchSlacklineDetail(id: number): Promise<any | null> {
  try {
    const { data } = await api.get(`/slacklines/${id}`);
    return data;
  } catch {
    return null;
  }
}

export async function runSync(opts: { withDetails?: boolean } = {}): Promise<void> {
  const syncStore = useSyncStore.getState();
  if (syncStore.syncing) return;

  syncStore.setSyncing(true);
  syncStore.setError(null);

  try {
    // Krok 1: list endpoint vrátí všechny slacklines vč. first_anchor + second_anchor.
    // To stačí pro mapu a seznam.
    const list: SlacklineListItem[] = await fetchAllSlacklines();

    const db = await getDb();
    await db.withTransactionAsync(async () => {
      // Vyprázdnit a znovu naplnit. Žádné delta — celý snapshot.
      await db.execAsync('DELETE FROM components');
      await db.execAsync('DELETE FROM points');
      await db.execAsync('DELETE FROM slacklines');

      for (const sl of list) {
        await db.runAsync(
          `INSERT OR REPLACE INTO slacklines
           (id, name, state, region, length, height, rating, date_tense, server_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sl.id, sl.name, sl.state ?? null, sl.region ?? null,
            sl.length ?? null, sl.height ?? null, sl.rating ?? null,
            sl.date_tense ?? null, new Date().toISOString(),
          ],
        );

        // first_anchor + second_anchor jako points + components
        for (const [comp_type, anchor] of [
          ['first_anchor_point', (sl as any).first_anchor],
          ['second_anchor_point', (sl as any).second_anchor],
        ] as const) {
          if (!anchor) continue;
          await db.runAsync(
            'INSERT OR REPLACE INTO points (id, description, latitude, longitude) VALUES (?, ?, ?, ?)',
            [anchor.id, anchor.description ?? null, anchor.latitude, anchor.longitude],
          );
          await db.runAsync(
            `INSERT OR REPLACE INTO components (id, slackline_id, point_id, component_type)
             VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM components), ?, ?, ?)`,
            [sl.id, anchor.id, comp_type],
          );
        }
      }
    });

    // Krok 2 (volitelně): stahování detailů pro description, parking_spot, atd.
    // Pro MVP může být lazy on-demand. Pokud chceme vše do offline cache, projedeme všechny.
    if (opts.withDetails) {
      for (const sl of list) {
        const detail = await fetchSlacklineDetail(sl.id);
        if (!detail) continue;
        await db.runAsync(
          `UPDATE slacklines SET description = ?, sector = ?, author = ?, name_history = ?,
             time_approach = ?, time_tensioning = ?, cover_image_url = ?, restriction = ?, type = ?
           WHERE id = ?`,
          [
            detail.description ?? null, detail.sector ?? null, detail.author ?? null,
            detail.name_history ?? null, detail.time_approach ?? null,
            detail.time_tensioning ?? null, detail.cover_image_url ?? null,
            detail.restriction ?? null, detail.type ?? null, sl.id,
          ],
        );
        if (detail.parking_spot) {
          await db.runAsync(
            'INSERT OR REPLACE INTO points (id, description, latitude, longitude) VALUES (?, ?, ?, ?)',
            [detail.parking_spot.id, detail.parking_spot.description ?? null,
             detail.parking_spot.latitude, detail.parking_spot.longitude],
          );
          await db.runAsync(
            `INSERT OR REPLACE INTO components (id, slackline_id, point_id, component_type)
             VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM components), ?, ?, ?)`,
            [sl.id, detail.parking_spot.id, 'parking_spot'],
          );
        }
      }
    }

    const now = new Date().toISOString();
    await setMeta('last_sync_at', now);
    syncStore.setLastSyncAt(now);
  } catch (err: any) {
    syncStore.setError(err?.message ?? 'Sync failed');
  } finally {
    syncStore.setSyncing(false);
  }
}

// Helper pro lazy fetch detailu — když user otevře DetailScreen a v lokální DB chybí description.
export async function fetchAndCacheDetail(id: number): Promise<void> {
  const detail = await fetchSlacklineDetail(id);
  if (!detail) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE slacklines SET description = ?, sector = ?, author = ?, name_history = ?,
       time_approach = ?, time_tensioning = ?, cover_image_url = ?, restriction = ?, type = ?
     WHERE id = ?`,
    [
      detail.description ?? null, detail.sector ?? null, detail.author ?? null,
      detail.name_history ?? null, detail.time_approach ?? null,
      detail.time_tensioning ?? null, detail.cover_image_url ?? null,
      detail.restriction ?? null, detail.type ?? null, id,
    ],
  );
}
