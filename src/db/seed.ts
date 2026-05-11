// Naplní SQLite ze CSV souborů v assets/seed/.
// Použito místo runSync(), dokud nemáme backend (ADR-009 byl k REST snapshot,
// tohle je dočasná dev varianta — žádný backend, čistě offline UI test).

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { getDb, setMeta } from './index';
import { useSyncStore } from '../store/syncStore';

const FIELD_TYPE_MAP: Record<string, string> = {
  firstAnchorPoint: 'first_anchor_point',
  secondAnchorPoint: 'second_anchor_point',
  parkingSpot: 'parking_spot',
};

interface SlacklineRow {
  id: string; name: string; description: string; state: string; region: string; sector: string;
  length: string; height: string; author: string; name_history: string; date_tense: string;
  time_approach: string; time_tensioning: string; rating: string;
}
interface ComponentRow {
  id: string; entity_id: string; component_id: string; component_type: string; field: string; order: string;
}
interface PointRow {
  id: string; description: string; latitude: string; longitude: string;
}

async function loadCsv<T>(module: number): Promise<T[]> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const localUri = asset.localUri ?? asset.uri;
  const text = await FileSystem.readAsStringAsync(localUri);
  const result = Papa.parse<T>(text, { header: true, skipEmptyLines: true });
  return result.data;
}

const num = (v: string): number | null => {
  if (!v || v.trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v: string): number | null => {
  if (!v || v.trim() === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const str = (v: string): string | null => (v && v.trim() !== '' ? v : null);
// Decode HTML entities (CSV obsahuje &gt; &lt; &amp; atd.)
const decodeHtml = (s: string | null): string | null => {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

export async function seedFromCsv(): Promise<{ slacklines: number; points: number; components: number }> {
  const syncStore = useSyncStore.getState();
  syncStore.setSyncing(true);
  syncStore.setError(null);

  try {
    const [points, slacklines, components] = await Promise.all([
      loadCsv<PointRow>(require('../../assets/seed/points.csv')),
      loadCsv<SlacklineRow>(require('../../assets/seed/slacklines.csv')),
      loadCsv<ComponentRow>(require('../../assets/seed/components.csv')),
    ]);

    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM components');
      await db.execAsync('DELETE FROM points');
      await db.execAsync('DELETE FROM slacklines');

      for (const p of points) {
        const lat = num(p.latitude);
        const lon = num(p.longitude);
        if (lat === null || lon === null) continue;
        await db.runAsync(
          'INSERT OR REPLACE INTO points (id, description, latitude, longitude) VALUES (?, ?, ?, ?)',
          [int(p.id), str(p.description), lat, lon],
        );
      }

      for (const sl of slacklines) {
        await db.runAsync(
          `INSERT OR REPLACE INTO slacklines
           (id, name, description, state, region, sector, length, height, author, name_history,
            date_tense, time_approach, time_tensioning, rating, server_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            int(sl.id), sl.name, decodeHtml(str(sl.description)),
            str(sl.state), str(sl.region), str(sl.sector),
            num(sl.length), num(sl.height), str(sl.author),
            decodeHtml(str(sl.name_history)),
            str(sl.date_tense), str(sl.time_approach), str(sl.time_tensioning),
            int(sl.rating),
            new Date().toISOString(),
          ],
        );
      }

      for (const c of components) {
        const compType = FIELD_TYPE_MAP[c.field] ?? c.component_type;
        await db.runAsync(
          'INSERT OR REPLACE INTO components (id, slackline_id, point_id, component_type) VALUES (?, ?, ?, ?)',
          [int(c.id), int(c.entity_id), int(c.component_id), compType],
        );
      }
    });

    await setMeta('seeded_from_csv', new Date().toISOString());
    syncStore.setLastSyncAt(new Date().toISOString());

    return { slacklines: slacklines.length, points: points.length, components: components.length };
  } catch (err: any) {
    syncStore.setError(err?.message ?? 'Seed failed');
    throw err;
  } finally {
    syncStore.setSyncing(false);
  }
}
