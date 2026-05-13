---
title: Slackline.Ova — Slackline map for slackliners
description: Offline-first slackline map for Android. 8049 slackline locations from slack.cz and slackmap.com worldwide. Free, open source, no tracking.
---

# Slackline.Ova

**Offline slackline map for Android. 8049 lines from Czechia and worldwide.**
**Mapa slacklines pro Android. 8049 lajn z Česka a celého světa.**

[![Latest release](https://img.shields.io/github/v/release/zemanektomas/slack-ova-mobile?label=Latest%20APK&color=0e8a16)](https://github.com/zemanektomas/slack-ova-mobile/releases/latest)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](https://github.com/zemanektomas/slack-ova-mobile/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](https://github.com/zemanektomas/slack-ova-mobile/releases/latest)

---

## English

### What it does

Slackline.Ova is an offline-first slackline map. Find every public slackline in Czechia and 7810 lines worldwide — anchor points, lengths, heights, descriptions, ratings, parking spots. Works without signal once installed.

**Features:**

- **Full-screen map with bottom sheet list** — drag handle to resize, three positions (mostly hidden / half / full list)
- **Bounds-driven filtering** — pan the map to your region, list updates instantly
- **Column table** — length, height, rating stacked side-by-side for easy comparison
- **Mapy.cz** satellite / terrain + **OSM** as default — switch in Settings (gear icon)
- **Source filter** — All / slack.cz / Slackmap, hidden in Settings
- **Black-and-white palette** matching the Sl.Ova logo
- **Dark / light theme** following system preference
- **Your location** — tap the logo in the top-left to recenter the map
- **Inline detail** — tap a list row to expand a card with anchors, restrictions, description
- **Search + cascading filters** — name, country, region, sector
- **GPS auto-detect** of default country filter at first launch (silent, uses OSM Nominatim)
- **Czech / English switch** in Settings (system locale detected by default)
- **Default location: Ostrava** zoom 10 — fits the Sl.Ova community origin
- **Fully offline** — SQLite is the source of truth, no server required

### Data sources

| Source | Lines | Details | Coverage |
|---|---|---|---|
| **slack.cz** | 239 | partial (anchors + parameters) | Czechia only |
| **slackmap.com** | 7810 | full (name, description, height, restrictions) | worldwide |

Both sources are bundled inside the APK (build-time in `assets/seed/`). The app works **offline from the first launch** — no internet needed for the initial start. Pull-to-refresh fetches fresh Slackmap geometry from `data.slackmap.com`, but that's a bonus.

### Download

**Latest APK:** [github.com/zemanektomas/slack-ova-mobile/releases/latest](https://github.com/zemanektomas/slack-ova-mobile/releases/latest) (~130 MB)

Steps:
1. Open the link in Chrome on Android
2. Tap `slackline-ova-<version>.apk` in the Assets section
3. After download, tap the file → Android may ask permission to install from "Unknown source" — allow Chrome (once)
4. Tap **Install** — the Slackline.Ova icon appears on your home screen

**iOS:** not yet available. Planned for a later phase (depends on Apple Developer account and EAS Build via TestFlight).

**Google Play Store:** preparing Internal Testing track — see [GitHub issues](https://github.com/zemanektomas/slack-ova-mobile/issues).

### Privacy

We do **not** collect any personal data. Everything happens on your device. No accounts, no tracking, no ads, no analytics.

GPS location is used only to show your position on the map — never transmitted anywhere. Full details: [Privacy Policy](privacy.md).

### Open source

Apache License 2.0. Code, issues, releases: [github.com/zemanektomas/slack-ova-mobile](https://github.com/zemanektomas/slack-ova-mobile)

### Contact

Tomáš Zemánek — `tomas.zemanek at tz3 dot cz`

---

## Česky

### Co to umí

Slackline.Ova je offline-first mapa slacklines. Najdeš v ní všechny veřejné lajny v České republice a 7810 lajn po světě — anchor body, délky, výšky, popisy, hodnocení, parkoviště. Funguje bez signálu jakmile je nainstalována.

**Funkce:**

- **Mapa přes celou obrazovku + bottom sheet se seznamem** — drag handle, tři velikosti (skoro skrytý / půl-na-půl / list přes celou plochu)
- **Filtruje podle výřezu mapy** — když posuneš mapu k Beskydám, vidíš jen lajny v Beskydách
- **Tabulkový seznam** — délka, výška, rating pod sebou ve sloupcích, ať jdou snadno porovnat
- **Mapy.cz** letecká / turistická + **OSM** (default) — přepneš v Nastavení (ozubené kolo)
- **Filtr zdroje** Vše / slack.cz / Slackmap — taky v Nastavení
- **Černobíla paleta** sladěná s logem Sl.Ova
- **Tmavý / světlý motiv** podle telefonu (sám si vybere)
- **Tvoje poloha** — tap na logo v levém rohu mapy tě zacentruje
- **Inline detail** — klikneš na lajnu v seznamu a vyroluje se ti pod ní karta s kotvami, omezením a popisem
- **Hledání + filtry** — najdeš lajnu podle názvu, regionu nebo sektoru. Kaskádové filtry stát → region → sektor
- **GPS auto-detekce** výchozí země při prvním spuštění (tichý, OSM Nominatim)
- **Čeština / English** přepínač v Nastavení — apka pozná systémový jazyk a vybere si sama
- **Výchozí místo: Ostrava** zoom 10
- **Plně offline** — SQLite jako jediný zdroj pravdy, žádné čekání na server

### Datové zdroje

| Zdroj | Lajny | Detaily | Pokrytí |
|---|---|---|---|
| **slack.cz** | 239 | částečné (kotvy + parametry) | jen Česko |
| **slackmap.com** | 7810 | všechny (název, popis, výška, omezení) | celý svět |

Oba zdroje jsou zabaleny přímo v APK (build-time v `assets/seed/`). Aplikace funguje **offline od první chvíle** — ani první start nepotřebuje internet. Pull-to-refresh dotahuje čerstvější Slackmap geometry z `data.slackmap.com`, ale to je nadstavba.

### Stáhnout

**Aktuální APK:** [github.com/zemanektomas/slack-ova-mobile/releases/latest](https://github.com/zemanektomas/slack-ova-mobile/releases/latest) (~130 MB)

Postup:
1. Otevři odkaz v Chrome na Androidu
2. Tap na `slackline-ova-<verze>.apk` v sekci Assets
3. Po stažení tap na soubor → Android se zeptá jestli může instalovat „Z neznámého zdroje" — povol Chrome (jednorázově)
4. Tap **Instalovat** → ikona Slackline.Ova se objeví na ploše

**iOS:** zatím není. Plánujem do pozdější fáze (vyžaduje Apple Developer účet a EAS Build přes TestFlight).

**Google Play Store:** připravujem Internal Testing track — viz [GitHub issues](https://github.com/zemanektomas/slack-ova-mobile/issues).

### Soukromí

Nesbíráme žádné osobní údaje. Všechno se děje v tvém telefonu. Žádné účty, žádné sledování, žádné reklamy, žádná analytika.

GPS poloha slouží jen k zobrazení tvé polohy v mapě — nikam se neposílá. Detail: [Privacy Policy](privacy.md).

### Open source

Apache License 2.0. Kód, issues, releases: [github.com/zemanektomas/slack-ova-mobile](https://github.com/zemanektomas/slack-ova-mobile)

### Kontakt

Tomáš Zemánek — `tomas.zemanek at tz3 dot cz`

---

## Attribution

- **slack.cz** — Czech slackline community ([slack.cz](https://slack.cz))
- **Slackmap** — [slackmap.com](https://slackmap.com), International Slackline Association (ISA)
- **Mapy.cz** — Seznam.cz a.s., © OpenStreetMap contributors
- **OpenStreetMap** — © OpenStreetMap contributors, ODbL license
- **OSM Nominatim** — reverse geocoding service

*Made by Tomáš Zemánek. For slackliners, by slackliners.*
