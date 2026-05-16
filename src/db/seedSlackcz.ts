// Naplni SQLite z fresh slack.cz JSON snapshotu (assets/seed/slackcz.json).
// Snapshot generuje `apps/slackcz-scraper` (fetch-catalog + fetch-details).
//
// Predtim jsme pouzivali CSV exportu z neznameho stari. Tento JSON je vzdy
// aktualni (npm run fetch:all v scraper repu).
//
// JSON schema (v2):
//   {
//     version: 2,
//     fetched_at, details_fetched_at,
//     count,
//     highlines: [{
//       id, jmeno, delka, vyska, stat, oblast, kraj, hodnoceni, kotveni,
//       info (HTML), pointOneInfo, pointTwoInfo, autor, nameHistory,
//       datum: { date }, typ, timeApproach, timeTensioning,
//       point1: { lat, lng }, point2?: { lat, lng }, parking?: { lat, lng }
//     }]
//   }

import { getDb, setMeta } from './index';
import { useSyncStore } from '../store/syncStore';

interface SlackczPoint {
  lat: string | number;
  lng: string | number;
}
interface SlackczLine {
  id: number;
  jmeno: string | null;
  delka: string | null;
  vyska: string | null;
  stat: string | null;
  oblast: string | null;
  kraj: string | null;
  hodnoceni: number | null;
  kotveni: string | null;
  info: string | null;
  pointOneInfo: string | null;
  pointTwoInfo: string | null;
  autor: string | null;
  nameHistory: string | null;
  datum: { date: string } | null;
  typ: number | null;
  timeApproach: string | null;
  timeTensioning: string | null;
  point1?: SlackczPoint | null;
  point2?: SlackczPoint | null;
  parking?: SlackczPoint | null;
}
interface SlackczPayload {
  version: number;
  fetched_at: string;
  count: number;
  highlines: SlackczLine[];
}

// Defenzivni coerce — slack.cz JSON ma volne typy (sometimes number where string,
// sometimes empty string where null). Hod vse na string/number tolerantne.
const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  if (v.trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = typeof v === 'string' ? v : String(v);
  const trimmed = s.trim();
  return trimmed === '' ? null : trimmed;
};
// Slack.cz `info` (description) je HTML escaped — `&iacute;` → `í` atd.
// Plus obsahuje samotne HTML tagy (<p>, <br>). Pro mobilku stačí decode hlavnich
// entit + strip tagů.
const decodeHtml = (s: string | null): string | null => {
  if (!s) return s;
  return s
    .replace(/<\/?[a-z][^>]*>/gi, '') // strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í')
    .replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&yacute;/g, 'ý').replace(/&Yacute;/g, 'Ý')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú')
    .replace(/&scaron;/g, 'š').replace(/&Scaron;/g, 'Š')
    .replace(/&ccaron;/g, 'č').replace(/&Ccaron;/g, 'Č')
    .replace(/&rcaron;/g, 'ř').replace(/&Rcaron;/g, 'Ř')
    .replace(/&zcaron;/g, 'ž').replace(/&Zcaron;/g, 'Ž')
    .replace(/&ecaron;/g, 'ě').replace(/&Ecaron;/g, 'Ě')
    .replace(/&ucirc;/g, 'û').replace(/&ouml;/g, 'ö')
    .replace(/\s+/g, ' ')
    .trim() || null;
};

// Metro bundler imports JSON files inline jako JS module — neni potreba
// Asset.fromModule / FileSystem.readAsStringAsync. Stací `require()` a máme
// parsed object hned. 283 kB JSON → bundle se zvětší o stejně, zatim OK.
function loadPayload(): SlackczPayload {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../assets/seed/slackcz.json') as SlackczPayload;
}

export async function seedFromSlackcz(): Promise<{ slacklines: number; points: number; components: number }> {
  const syncStore = useSyncStore.getState();
  syncStore.setSyncing(true);
  syncStore.setError(null);

  try {
    const payload = loadPayload();
    const db = await getDb();

    // Slack.cz IDs jsou kladne; smazem pouze slack.cz (id > 0). Slackmap (id < 0) nechame.
    // Defenzivni rollback pro pripad otevrene transakce po hot reload (viz slackmap.ts).
    try { await db.execAsync('ROLLBACK'); } catch {}

    // Z bezpecnosti: smazem points/components s positivnimi IDs, slacklines s pozitivnim id.
    // Slackmap synthetic ID jsou zaporne, takze se nedotknem.
    await db.execAsync(`DELETE FROM components WHERE slackline_id > 0`);
    await db.execAsync(`DELETE FROM points WHERE id > 0`);
    await db.execAsync(`DELETE FROM slacklines WHERE id > 0`);

    let insertedSlacklines = 0;
    let insertedPoints = 0;
    let insertedComponents = 0;

    // Point IDs musi byt unique. Slack.cz ma point_id zalozeny na point1.id v JSONu,
    // ale ne kazdy line ho ma — sami vyrabime sekvencni od 1, ne 0 (zaporne ID jsou slackmap).
    // Zacneme tedy od 1 nahoru.
    let nextPointId = 1;
    let nextCompId = 1;

    await db.withTransactionAsync(async () => {
      for (const h of payload.highlines) {
        // Slackline. Slack.cz katalog je vyhradne highline (URL `/highlines/`).
        const dateTense = h.datum?.date ? h.datum.date.split(' ')[0] : null;
        await db.runAsync(
          `INSERT OR REPLACE INTO slacklines
           (id, name, description, state, region, sector, length, height, author, name_history,
            date_tense, time_approach, time_tensioning, rating, type, source, server_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'highline', 'csv', ?)`,
          [
            h.id,
            str(h.jmeno) ?? `slack.cz ${h.id}`,
            decodeHtml(str(h.info)),
            str(h.stat),
            str(h.oblast),
            str(h.kraj),
            num(h.delka),
            num(h.vyska),
            str(h.autor),
            str(h.nameHistory),
            dateTense,
            str(h.timeApproach),
            str(h.timeTensioning),
            h.hodnoceni ?? null,
            new Date().toISOString(),
          ],
        );
        insertedSlacklines++;

        // Anchor 1
        if (h.point1?.lat && h.point1?.lng) {
          const pId = nextPointId++;
          await db.runAsync(
            `INSERT INTO points (id, description, latitude, longitude) VALUES (?, ?, ?, ?)`,
            [pId, str(h.pointOneInfo), num(h.point1.lat), num(h.point1.lng)],
          );
          insertedPoints++;
          await db.runAsync(
            `INSERT INTO components (id, slackline_id, point_id, component_type)
             VALUES (?, ?, ?, 'first_anchor_point')`,
            [nextCompId++, h.id, pId],
          );
          insertedComponents++;
        }

        // Anchor 2 (z detail fetch — neni v kazde lajne)
        if (h.point2?.lat && h.point2?.lng) {
          const pId = nextPointId++;
          await db.runAsync(
            `INSERT INTO points (id, description, latitude, longitude) VALUES (?, ?, ?, ?)`,
            [pId, str(h.pointTwoInfo), num(h.point2.lat), num(h.point2.lng)],
          );
          insertedPoints++;
          await db.runAsync(
            `INSERT INTO components (id, slackline_id, point_id, component_type)
             VALUES (?, ?, ?, 'second_anchor_point')`,
            [nextCompId++, h.id, pId],
          );
          insertedComponents++;
        }

        // Parking
        if (h.parking?.lat && h.parking?.lng) {
          const pId = nextPointId++;
          await db.runAsync(
            `INSERT INTO points (id, description, latitude, longitude) VALUES (?, ?, ?, ?)`,
            [pId, null, num(h.parking.lat), num(h.parking.lng)],
          );
          insertedPoints++;
          await db.runAsync(
            `INSERT INTO components (id, slackline_id, point_id, component_type)
             VALUES (?, ?, ?, 'parking_spot')`,
            [nextCompId++, h.id, pId],
          );
          insertedComponents++;
        }
      }
    });

    // slackcz-v1 = fresh JSON scrape s point2 + parking.
    await setMeta('seeded_from_csv', 'slackcz-v1');
    syncStore.setLastSyncAt(new Date().toISOString());

    return {
      slacklines: insertedSlacklines,
      points: insertedPoints,
      components: insertedComponents,
    };
  } catch (err: any) {
    syncStore.setError(err?.message ?? 'Slackcz seed failed');
    throw err;
  } finally {
    syncStore.setSyncing(false);
  }
}
