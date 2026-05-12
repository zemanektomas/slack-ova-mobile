# Slackline.Ova — mobil

Tož, naša mobilna apka. V telefonu mapa lajn a seznam co je v okoli — bez signalu, bez netu, bez čekani na 4G. Vlez do lesa, otevři apku, vidiš co kde visi a kolik je to do nejbližšiho špagatu. Včil. A to je všecko, co chceš, ni?

Vznikla na ostravske slackline scene (Sl.Ova), ale data su globalni — slack.cz pro Česko + slackmap.com pro celej svět. Tuž špagatisti z Brna, Polska aji Argentyny, vitejte tež.

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey)
![Expo SDK](https://img.shields.io/badge/Expo%20SDK-51-000020)

## Co umi

- **Pulka mapy, pulka seznam** — tří-pozični přepinač (50/50 nebo mapa velka nebo list velky, podle nalady)
- **Filtruje podle vyřezu mapy** — když posuneš mapu k Beskydam, vidiš jen lajny v Beskydach
- **Řazeni:** název / dluha / vyška / rating / vzdalenost od středu mapy
- **Mapy.cz** letecka / turisticka + **OSM** jako zaloha (přepinač s ikonkami)
- **Tmavy / světly motiv** podle telefonu (sam si vibere)
- **Tvoja poloha** — červeny bod + halo, tlačítko "Najdi mě" tě zacentruje
- **Inline detail** — klikneš na lajnu v seznamu a vyroluje se ti pod ní karta s kotvami, omezenim a popisem. V mapě a v listu se ti rozsviti žlutě, ať vidiš o čem je řeč
- **Hledani + filtry** — najdeš lajnu podle nazvu, regionu nebo sektoru. Kaskadove filtry stat → region → sektor, pro lidi co maj radi pořadek
- **GPS auto-detekce** — při prvnim spušteni si apka tichoučko zystí v jake jsi zemi a nastavi ti filter. Žadny obtěžovani povolenkami, jen pokud sis GPS dal dřiv pro „Najdi mě"
- **Plně offline** — SQLite jako jediný zdroj pravdy, žadne čekani na server

## Datove zdroje

Tuž ja, kde se ty lajny berou.

| Zdroj | Linii | Detaily | Pokryti |
|---|---|---|---|
| **slack.cz** | 239 | častečne (kotvy + parametry) | jen Česko |
| **slackmap.com** | 7810 | všecky (nazev, popis, vyška, omezeni) | celej svět |

Oba zdroje su zabalene přimo v APK (build-time v `assets/seed/`). Apka funguje **offline od prvni chvile** — ani prvni start nepotřebuje internet. Když potahneš seznam dolů (pull-to-refresh), dotahne se ti čerstvejši slackmap geometry z `data.slackmap.com`, ale to je nadstavba. Bez signalu pojede furt.

Barevne rozliseni v mapě:
- **modra** — slack.cz
- **indigo** — Slackmap
- **žluta** — pravě vybrana lajna

## Staženi (Android)

Tuž poslechni dobře, neni to slozite:

**Aktualni APK ke staženi:** [github.com/zemanektomas/slack-ova-mobile/releases/latest](https://github.com/zemanektomas/slack-ova-mobile/releases/latest)

1. Otevři ten link v Chromu na Androidu
2. Klikneš na `slackline-ova-<verze>.apk` v sekci Assets — stahne se taka kupa bitu, ~130 MB
3. Po staženi tap na soubor v Chromu → Android se zeptá esli muže instalovat „Z neznameho zdroje" — povol Chromu (jednorazově, šak co)
4. Tap **Instalovat** → ikona Slackline.Ova se ti objevi na ploše a hotovo

**iOS verze zatim neni**, plánujem do Faze 4. Apple Developer učet stoji $99/rok a jak by řek mama na ten kufer mineralek — naco to teho kupovat tolik. Až pozdějc.

### Aktualizace

Nova verze přyjde stejnu cestu — stahneš novejši APK, Android nabidne přepis stare instalace. Data v SQLite se ti zachovaju, pokud se nezměnilo schema.

---

## Tech stack (pro vyvojaře)

- **React Native + Expo SDK 51** (bare workflow přes `expo prebuild` + `expo run:android`)
- **TypeScript**
- **MapLibre GL** (`@maplibre/maplibre-react-native` v10) — raster tiles
- **expo-sqlite** — lokální SQLite, source of truth
- **expo-location** — GPS poloha
- **@expo/vector-icons** (MaterialCommunityIcons)
- **Zustand** — state management (mapa, filter, theme, auth)
- **expo-router** — file-based navigation
- **papaparse** — CSV parsing pro slack.cz seed

## Setup pro vývoj

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

# Regeneruje app icon + splash ze Sl.Ova loga
node scripts/make-icons.js
```

## Struktura

```
src/
├── api/          REST klient, sync engine (zatím nepoužívaný)
├── app/          expo-router pages
├── components/   InlineDetail, FilterSheet
├── db/           SQLite schema, queries, seed (CSV + Slackmap), reverseGeocode
├── map/          MapLibre integrace, useLocation
├── screens/      HomeScreen, DetailScreen
├── store/        Zustand (auth, map, sync)
├── types/        TS interfaces
└── theme.ts      Dark/light theme tokens

assets/
├── icon.png, splash.png, adaptive-icon.png
├── source/sl-ova-logo.png                          (zdrojové logo, transparent)
└── seed/
    ├── slacklines.csv, points.csv, components.csv  (slack.cz, 239 linií)
    └── slackmap_world.json                          (Slackmap, 7810 linií + detaily)

scripts/
├── fetch-slackmap.js     Stáhne aktuální Slackmap data
└── make-icons.js         Generuje icon/splash ze Sl.Ova loga
```

## Známe limity

Šak nic neni dokonale, tož co se ti teda nelibi:

- **Žádné mutace** — apka jen čte. Crossings, edit lajn, OAuth login = ještě neni (čeká na Fázi 3). Až přijde, řešime přes deeplink na web nebo lokální outbox.
- **Online tiles** — offline MBTiles ještě neni, Mapy.cz / OSM tile servery potřebuju signal. V lese to znamená šedu plochu, dokud se nedostaneš ku 4G.
- **expo-sqlite Windows dev quirk** — pokud vyvíjíš na Windows + Node 22+, Metro dev server může brečet na chybějící `.js` extensions v `node_modules/expo-sqlite/build/`. CI build na Linuxu i hotové APK jsou OK. Tož řešeni: ručně přidat `.js` k relativním importům v těch souborech. (V CI to nepatchujeme — udělali jsme tu chybu jednou a Hermes JSI install na release buildu padl, vyřešeno odstraněním patche z workflow.)

## Roadmap

Detaily v [issues](https://github.com/zemanektomas/slack-ova-mobile/issues) a [milestones](https://github.com/zemanektomas/slack-ova-mobile/milestones).

**Hotovo (F2 — MVP):**
- Kompletni offline UI s dvěma datovymi zdroji
- Search + cascading filtry
- GPS auto-detect výchozího filteru
- CI/CD pipeline + první veřejny release v0.3.0

**Dál (F3):**
- Google OAuth (proč by mama nemohla videt, kdo jí přidal lajnu)
- Crossings UI — kdo a kdy lajnu chodil
- Sync mutací na server (s rozumem, ne každy update spěšně)

**Pozdějc (F4):**
- iOS přes EAS Build → TestFlight
- Offline MBTiles pro Česko (vyžaduje hosting tile balíčku)
- Detail tabs: Crossings, Photos, History, Statistics
- Image caching pro fotky lajn

## Datove zdroje a atribuce

- **slack.cz** — slack.cz komunita ([web](https://slack.cz)). Historicka data exportovana z webove aplikace [kratocpa/slackline-app](https://github.com/kratocpa/slackline-app). Tomas Krato je legenda.
- **Slackmap** — [slackmap.com](https://slackmap.com), provozuje International Slackline Association. Veřejny GeoJSON na `data.slackmap.com`, detaily přes `api.slackmap.com` (bez auth pro read).
- **Mapy.cz** — Seznam.cz a.s., podklady © OpenStreetMap contributors.
- **Reverse geocoding** — OpenStreetMap Nominatim (jen pro auto-detekci země při prvnim startu, max 1 req/sec, fair use).

## Licence

Apache License 2.0 — viz [LICENSE](LICENSE). Tož čerpaj, hraj sy, jen jak něco predelaš, zostan se s nama o spolupracu.

---

*Autor: Tomáš Zemánek. S láskou a paru piviskama pro slackliny v Ostravě a celosvětově.*
