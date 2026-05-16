// Build-time skript: stáhne aktuální Slackmap data a uloží do assets/seed/slackmap_world.json.
// Geometry pro celý svět + detaily (name/description/height/restriction) pro CZ.
//
// Spouštět: node scripts/fetch-slackmap.js
// Pak rebuild apky (expo run:android) — JSON se zabalí do APK.

const fs = require('fs');
const path = require('path');
const https = require('https');

const LINES_URL = 'https://data.slackmap.com/geojson/lines/all.geojson';
const DETAIL_URL = (id) => `https://api.slackmap.com/line/${id}/details`;
const DETAIL_COUNTRIES = null; // null = všechny země

const OUT_PATH = path.join(__dirname, '..', 'assets', 'seed', 'slackmap_world.json');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept-Encoding': 'gzip' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      let stream = res;
      const enc = res.headers['content-encoding'];
      if (enc === 'gzip') {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      }
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchDetail(id) {
  try {
    const text = await get(DETAIL_URL(id));
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('Stahuji world GeoJSON...');
  const geoText = await get(LINES_URL);
  const geo = JSON.parse(geoText);
  const lines = geo.features.filter(
    (f) => f.geometry?.type === 'LineString' && f.properties?.id,
  );
  console.log(`World lines: ${lines.length}`);

  // Zúžíme features na to, co potřebujeme — šetří velikost JSONu
  const minimal = lines.map((f) => ({
    id: f.properties.id,
    c: f.properties.c ?? null,
    l: f.properties.l ?? null,
    lt: f.properties.lt ?? null,
    coords: f.geometry.coordinates, // [[lon,lat],[lon,lat]]
  }));

  // Stáhni detaily pro všechny linie
  const targets = DETAIL_COUNTRIES === null
    ? minimal
    : minimal.filter((m) => DETAIL_COUNTRIES.includes(m.c));
  console.log(`Stahuji ${targets.length} detailů (všechny země)...`);

  const detailMap = {};
  const BATCH = 15; // o něco rychlejší
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((m) => fetchDetail(m.id)));
    for (let j = 0; j < batch.length; j++) {
      const d = results[j];
      if (!d) continue;
      detailMap[batch[j].id] = {
        name: d.name ?? null,
        description: d.description ?? null,
        height: d.height ?? null,
        length: d.length ?? null,
        type: d.type ?? null,
        // restrictionLevel 'none' (bez doplňujícího info) = žádné omezení — neukládat
        // jako varování. Skutečné warningy mají level 'partial' nebo 'full', případně
        // 'none' s doplňujícím komentářem (např. "none: Check BMC for nesting bird info").
        restriction: (() => {
          const lvl = d.restrictionLevel;
          const info = d.restrictionInfo;
          if (lvl === 'none' && !info) return null;
          return [lvl, info].filter(Boolean).join(': ') || null;
        })(),
        // Rozšířená pole z slackmap API (api.slackmap.com/line/{id}/details):
        //   anchorsInfo — popis kotev (např. "1. side: 2 bolts for main, backup to the tree")
        //   accessInfo — popis přístupu (např. "Path on both sides")
        //   isMeasured — false = upozornění "Not Measured" v UI
        anchorsInfo: d.anchorsInfo ?? null,
        accessInfo: d.accessInfo ?? null,
        isMeasured: d.isMeasured ?? null,
      };
    }
    process.stdout.write(`  ${Math.min(i + BATCH, targets.length)}/${targets.length}\r`);
  }
  console.log();

  const payload = {
    version: 1,
    fetched_at: new Date().toISOString(),
    detail_countries: DETAIL_COUNTRIES === null ? 'all' : DETAIL_COUNTRIES,
    lines: minimal,
    details: detailMap,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload));
  const sizeKB = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
  console.log(`Hotovo: ${OUT_PATH} (${sizeKB} kB, ${lines.length} linií, ${Object.keys(detailMap).length} detailů)`);
}

main().catch((e) => {
  console.error('Chyba:', e);
  process.exit(1);
});
