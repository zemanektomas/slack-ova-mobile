// Generuje feature graphic banner 1024x500 pro Google Play Store.
//
// Layout: bílé pozadí + Sl.Ova logo zarovnané vlevo, vystředěné vertikálně.
// Bez textu — ten si dogeneruj ručně v Canvě / Midjourney pokud chceš.
//
// Spuštění: node scripts/make-feature-graphic.js
// Vyžaduje: jimp-compact (už je v node_modules díky Expo)

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const ROOT = path.join(__dirname, '..');
const SOURCE_LOGO = path.join(ROOT, 'assets', 'source', 'sl-ova-logo.png');
const OUTPUT = path.join(ROOT, 'docs', 'feature-graphic.png');

const WIDTH = 1024;
const HEIGHT = 500;

async function main() {
  if (!fs.existsSync(SOURCE_LOGO)) {
    throw new Error(`Source logo not found: ${SOURCE_LOGO}`);
  }
  console.log(`Building feature graphic ${WIDTH}x${HEIGHT}`);

  // 1) Bílé pozadí
  const canvas = new Jimp(WIDTH, HEIGHT, 0xffffffff);

  // 2) Logo — výška 420px (rezerva 40px nahoře/dole), zarovnané vlevo
  const LOGO_SIZE = 420;
  const logo = (await Jimp.read(SOURCE_LOGO)).resize(LOGO_SIZE, LOGO_SIZE);
  const LOGO_X = 80;
  const LOGO_Y = Math.round((HEIGHT - LOGO_SIZE) / 2);
  canvas.composite(logo, LOGO_X, LOGO_Y);

  console.log(`Logo: ${LOGO_SIZE}x${LOGO_SIZE} at ${LOGO_X}, ${LOGO_Y}`);

  // 3) Output
  await canvas.writeAsync(OUTPUT);

  const stats = fs.statSync(OUTPUT);
  console.log(`OK: ${OUTPUT} (${Math.round(stats.size / 1024)} KB)`);
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
