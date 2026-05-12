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

  // Logo má alpha kanál (průhledné rohy okolo kruhu). Canvasy MUSÍME mít
  // transparentní (0x00000000), jinak Jimp.composite() smaže alpha logo bílou
  // a kruh získá viditelný čtvercový rám.

  // 1) icon.png — 1024x1024 transparent canvas, logo přes celou plochu
  const SIZE = 1024;
  const ICON_LOGO_W = SIZE;
  const iconScaled = logo.clone().resize(ICON_LOGO_W, Jimp.AUTO);
  const icon = await new Jimp(SIZE, SIZE, 0x00000000); // transparent
  icon.composite(iconScaled, (SIZE - iconScaled.bitmap.width) / 2, (SIZE - iconScaled.bitmap.height) / 2);
  await icon.writeAsync(path.join(ASSETS_DIR, 'icon.png'));
  console.log('icon.png hotovo (transparent canvas)');

  // 2) adaptive-icon.png — 1024x1024 transparent canvas, logo v safe zone.
  // Android použije adaptiveIcon.backgroundColor z app.json jako pozadí
  // a tuto bitmapu jako foreground v safe zone (~720×720).
  const ADAPTIVE_LOGO_W = Math.floor(SIZE * 0.66);
  const adaptiveScaled = logo.clone().resize(ADAPTIVE_LOGO_W, Jimp.AUTO);
  const adaptive = await new Jimp(SIZE, SIZE, 0x00000000); // transparent
  adaptive.composite(
    adaptiveScaled,
    (SIZE - adaptiveScaled.bitmap.width) / 2,
    (SIZE - adaptiveScaled.bitmap.height) / 2,
  );
  await adaptive.writeAsync(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('adaptive-icon.png hotovo (transparent canvas)');

  // 3) splash.png — copy 1:1 from source (logo už je transparent, Expo splash
  // s resizeMode='contain' ho dotáhne podle telefonu).
  await logo.clone().writeAsync(path.join(ASSETS_DIR, 'splash.png'));
  console.log('splash.png hotovo (source 1:1)');

  console.log('Hotovo. Pro načtení nových ikon spusť expo run:android.');
}

main().catch((e) => {
  console.error('Chyba:', e);
  process.exit(1);
});
