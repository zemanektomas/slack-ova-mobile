# Slackline.Ova — mobile

Offline-first mobilní aplikace pro slackliners. Ukazuje mapu se slacklines (Česko + svět), seznam viditelných linií filtrovaný podle výřezu mapy, detail jednotlivých linií s informacemi o kotvách. Vše bez internetu.

Vznikla na ostravské slackline scéně, ale data jsou globální (slack.cz pro ČR + slackmap.com world).

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey)
![Expo SDK](https://img.shields.io/badge/Expo%20SDK-51-000020)

## Funkce

- **Půlka mapy / půlka seznam** s tří-pozičním split toggle (50/50 / mapa velká / list velký)
- **Bounds-driven filtering** — list ukazuje jen linie ve výřezu mapy
- **Řazení:** název / délka / výška / rating / vzdálenost od středu mapy
- **Mapy.cz** letecká / turistická + **OSM** fallback (přepínač s ikonami)
- **Tmavý / světlý režim** podle nastavení telefonu
- **Vlastní poloha** (červený bod + halo, tlačítko "Najdi mě")
- **Inline detail** — tap na linii ji rozbalí pod řádkem + zvýrazní žlutě v mapě i v listu
- **Plně offline** — SQLite jako source of truth, žádné runtime API requests pro mapová data

## Datové zdroje

| Zdroj | Linie | Detaily | Pokrytí |
|---|---|---|---|
| **slack.cz** | 239 | částečné (kotvy + parametry) | jen ČR |
| **slackmap.com** | 7810 | všechny (name, description, height, restriction) | celý svět |

Oba zdroje jsou **build-time** zabalené v APK (CSV + JSON v `assets/seed/`). Aplikace funguje úplně offline od první chvíle. Pull-to-refresh dotáhne slackmap geometry aktualizace z `data.slackmap.com`.

Filtrování zdrojů v UI: **Vše** / **slack.cz** / **Slackmap**. Barevné rozlišení v mapě:
- modrá — slack.cz
- indigo — Slackmap
- žlutá — vybraná linie

## Stažení (Android)

Aktuální APK ke stažení: **[github.com/zemanektomas/slack-ova-mobile/releases/latest](https://github.com/zemanektomas/slack-ova-mobile/releases/latest)**

### Instalace na telefon

1. Otevři odkaz výše v Chrome na Androidu
2. Klikni na `slackline-ova-<verze>.apk` v sekci Assets — stáhne se ~130 MB
3. Po stažení tap na soubor v Chrome → Android požádá o povolení _„Install unknown apps“_ pro Chrome (jednorázově, povolit)
4. Tap **Instalovat** → ikona Slackline.Ova se objeví na ploše

iOS verze zatím není k dispozici (plánováno do F4).

### Aktualizace

Nová verze přijde stejnou cestou — stáhni novější APK, Android nabídne přepsání staré instalace. Data v SQLite se zachovají, pokud se neměnilo schema.

## Tech stack

- **React Native + Expo SDK 51** (bare workflow přes `expo prebuild` + `expo run:android`)
- **TypeScript**
- **MapLibre GL** (`@maplibre/maplibre-react-native` v10) — raster tiles
- **expo-sqlite** — lokální SQLite, source of truth
- **expo-location** — GPS poloha
- **@expo/vector-icons** (MaterialCommunityIcons)
- **Zustand** — state management (mapa, filter, theme, auth)
- **expo-router** — file-based navigation
- **papaparse** — CSV parsing pro slack.cz seed

## Setup

### Požadavky
- Node.js 18+ (testováno na 22)
- Android Studio (SDK 34, Build-Tools 34)
- Java 17+ (přibalená v Android Studio JBR)
- API klíč Mapy.cz — zdarma na https://developer.mapy.cz/

### Instalace
```bash
npm install --legacy-peer-deps
cp .env.example .env
# Otevři .env a vlož svůj EXPO_PUBLIC_MAPY_CZ_API_KEY
```

### Spuštění

```bash
# Build APK + instalace na připojený telefon (USB debugging)
npx expo run:android

# Dev server (hot reload pro JS)
npx expo start --dev-client
```

### Aktualizace dat

```bash
# Stáhne aktuální Slackmap data + detaily (~7800 linií, ~2 MB)
node scripts/fetch-slackmap.js

# Regeneruje app icon + splash ze slack.cz logo
node scripts/make-icons.js
```

## Struktura

```
src/
├── api/          REST klient, sync engine (zatím nepoužívaný)
├── app/          expo-router pages
├── components/   InlineDetail
├── db/           SQLite schema, queries, seed (CSV + Slackmap)
├── map/          MapLibre integrace, useLocation
├── screens/      HomeScreen, DetailScreen
├── store/        Zustand (auth, map, sync)
├── types/        TS interfaces
└── theme.ts      Dark/light theme tokens

assets/
├── icon.png, splash.png, adaptive-icon.png
└── seed/
    ├── slacklines.csv, points.csv, components.csv   (slack.cz, 239 linií)
    └── slackmap_world.json                          (Slackmap, 7810 linií + detaily)

scripts/
├── fetch-slackmap.js     Stáhne aktuální Slackmap data
└── make-icons.js          Generuje icon/splash z Sl.Ova loga
```

## Známé limity

- **Žádné mutace** — apka je read-only. Vytváření crossings, edit linií, OAuth login zatím neimplementováno (F3).
- **Online tiles** — offline MBTiles zatím není (vyžaduje hosting tiles serveru). Mapy.cz / OSM tedy potřebují signál.
- **expo-sqlite Windows dev quirk** — na Windows + Node 22+ může Metro dev server hlásit chybějící `.js` extensions v `node_modules/expo-sqlite/build/`. CI Linux build i hotové APK jsou OK. Pokud naroníš lokálně, doplň `.js` ručně k relativním importům v těch souborech.

## Roadmap

Detail v [issues](https://github.com/zemanektomas/slack-ova-mobile/issues) a [milestones](https://github.com/zemanektomas/slack-ova-mobile/milestones).

**Hotovo (F2 — MVP):** kompletní offline prohlížecí UI s oběma datovými zdroji.

**Další (F3):** Google OAuth, crossings UI, sync mutací zpět na server.

## Datové zdroje a atribuce

- **slack.cz** — slack.cz komunita ([web](https://slack.cz)). Stará data exportovaná z webové aplikace [kratocpa/slackline-app](https://github.com/kratocpa/slackline-app).
- **Slackmap** — [slackmap.com](https://slackmap.com) provozuje International Slackline Association. Veřejný GeoJSON na `data.slackmap.com`, detaily přes `api.slackmap.com` (bez auth pro read).
- **Mapy.cz** — Seznam.cz a.s., podklady © OpenStreetMap contributors.

## Licence

Apache License 2.0 — viz [LICENSE](LICENSE).
