// Připraví ikony pro apku ze Sl.Ova loga (assets/source/sl-ova-logo.png).
// Output: assets/icon.png, assets/adaptive-icon.png, assets/splash.png
//
// Pouštět: node scripts/make-icons.js
// Vyžaduje jen jimp-compact, který je v node_modules díky Expo.

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const SOURCE_LOGO = path.join(ASSETS_DIR, 'source', 'sl-ova-logo.png');

async function main() {
  if (!fs.existsSync(SOURCE_LOGO)) {
    throw new Error(`Source logo not found: ${SOURCE_LOGO}`);
  }
  console.log(`Načítám: ${SOURCE_LOGO}`);

  const logo = await Jimp.read(SOURCE_LOGO);
  console.log(`Logo: ${logo.bitmap.width}x${logo.bitmap.height}`);

  // Logo má bílé pozadí a kruhový design. Pro icony bílé pozadí necháváme
  // (Android masky icon na tvar systému). Pro splash NEvkládáme do dalšího
  // bílého rámu — logo samo je 1024×1024 čtverec a Expo splash s
  // resizeMode='contain' ho dotáhne na obrazovku zachovávajíc poměr.

  // 1) icon.png — 1024x1024, logo orientačně přes celou plochu
  // (zoom 95% odřízne tenký bílý rámeček kolem logo SVG).
  const SIZE = 1024;
  const ICON_LOGO_W = Math.floor(SIZE * 0.95);
  const iconScaled = logo.clone().resize(ICON_LOGO_W, Jimp.AUTO);
  const icon = await new Jimp(SIZE, SIZE, 0xffffffff);
  icon.composite(iconScaled, (SIZE - iconScaled.bitmap.width) / 2, (SIZE - iconScaled.bitmap.height) / 2);
  await icon.writeAsync(path.join(ASSETS_DIR, 'icon.png'));
  console.log('icon.png hotovo');

  // 2) adaptive-icon.png — 1024x1024, ale "safe area" je středních ~720×720
  // (66% bezpečné pro všechny Android masky: circle, squircle, rounded square).
  // Logo necháváme větší, ať vyplní bezpečnou zónu.
  const ADAPTIVE_LOGO_W = Math.floor(SIZE * 0.66);
  const adaptiveScaled = logo.clone().resize(ADAPTIVE_LOGO_W, Jimp.AUTO);
  const adaptive = await new Jimp(SIZE, SIZE, 0xffffffff);
  adaptive.composite(
    adaptiveScaled,
    (SIZE - adaptiveScaled.bitmap.width) / 2,
    (SIZE - adaptiveScaled.bitmap.height) / 2,
  );
  await adaptive.writeAsync(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('adaptive-icon.png hotovo');

  // 3) splash.png — použijeme logo 1:1 jako ČTVEREC 1024×1024 (ne 1242×2436).
  // Expo splash screen s resizeMode='contain' ho dotáhne podle telefonu,
  // bílé pozadí zajišťuje app.json.splash.backgroundColor. Bez papírového
  // padding kolem se logo bude vyplňovat víc obrazovky.
  await logo.clone().writeAsync(path.join(ASSETS_DIR, 'splash.png'));
  console.log('splash.png hotovo (1024×1024, žádný extra padding)');

  console.log('Hotovo. Pro načtení nových ikon spusť expo run:android.');
}

main().catch((e) => {
  console.error('Chyba:', e);
  process.exit(1);
});
