// Připraví ikony pro apku z https://slack.cz/img/slack1.png.
// Output: assets/icon.png, assets/adaptive-icon.png, assets/splash.png
//
// Pouštět: node scripts/make-icons.js
// Vyžaduje jen jimp-compact, který je v node_modules díky Expo.

const fs = require('fs');
const path = require('path');
const https = require('https');
const Jimp = require('jimp-compact');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const TMP_PATH = path.join(__dirname, '..', '.tmp-slack-logo.png');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Stahuji slack1.png...');
  await download('https://slack.cz/img/slack1.png', TMP_PATH);

  const logo = await Jimp.read(TMP_PATH);
  console.log(`Logo: ${logo.bitmap.width}x${logo.bitmap.height}`);

  // 1) icon.png — 1024x1024 čtverec, bílé pozadí, logo vycentrované (max 80% šíře)
  const SIZE = 1024;
  const LOGO_W = Math.floor(SIZE * 0.85);
  const scaled = logo.clone().resize(LOGO_W, Jimp.AUTO);
  const icon = await new Jimp(SIZE, SIZE, 0xffffffff);
  icon.composite(scaled, (SIZE - scaled.bitmap.width) / 2, (SIZE - scaled.bitmap.height) / 2);
  await icon.writeAsync(path.join(ASSETS_DIR, 'icon.png'));
  console.log('icon.png hotovo');

  // 2) adaptive-icon.png — 1024x1024, ale "safe area" je středních 432×432.
  // Logo musí být menší aby se vlezlo do středu.
  const ADAPTIVE_LOGO_W = Math.floor(SIZE * 0.65);
  const adaptiveScaled = logo.clone().resize(ADAPTIVE_LOGO_W, Jimp.AUTO);
  const adaptive = await new Jimp(SIZE, SIZE, 0xffffffff);
  adaptive.composite(
    adaptiveScaled,
    (SIZE - adaptiveScaled.bitmap.width) / 2,
    (SIZE - adaptiveScaled.bitmap.height) / 2,
  );
  await adaptive.writeAsync(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('adaptive-icon.png hotovo');

  // 3) splash.png — 1242x2436 (iPhone X format, Expo doporučení), bílé pozadí, logo vycentrované
  const SPLASH_W = 1242;
  const SPLASH_H = 2436;
  const SPLASH_LOGO_W = Math.floor(SPLASH_W * 0.7);
  const splashScaled = logo.clone().resize(SPLASH_LOGO_W, Jimp.AUTO);
  const splash = await new Jimp(SPLASH_W, SPLASH_H, 0xffffffff);
  splash.composite(
    splashScaled,
    (SPLASH_W - splashScaled.bitmap.width) / 2,
    (SPLASH_H - splashScaled.bitmap.height) / 2,
  );
  await splash.writeAsync(path.join(ASSETS_DIR, 'splash.png'));
  console.log('splash.png hotovo');

  fs.unlinkSync(TMP_PATH);
  console.log('Hotovo. Pro načtení nových ikon spusť expo run:android.');
}

main().catch((e) => {
  console.error('Chyba:', e);
  process.exit(1);
});
