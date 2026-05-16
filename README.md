# Slackline.Ova — mobil

Tož, naša mobilna apka. Offline mapa slacklin v telefonu — z lesa, bez signalu,
bez čekani na 4G. Otevřeš, vidiš co kde visi, kolik je to do nejbližšiho špagatu.

Vznikla na ostravske slackline scene (Sl.Ova), ale data su globalni:
[slack.cz](https://slack.cz) pro Česko, [slackmap.com](https://slackmap.com)
pro celej svět.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/zemanektomas/slack-ova-mobile?label=Stahni%20APK&color=0e8a16)](https://github.com/zemanektomas/slack-ova-mobile/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](https://github.com/zemanektomas/slack-ova-mobile/releases/latest)

## Co umi

Plnohodnotny opis je na **[slacklineova.cz](https://slacklineova.cz)**. Tož
kratce: offline mapa, bottom sheet se seznamem, hledani, navigovani k parkovani
přes Mapy.cz / Google Maps / Locus / Sygic, čerň-bila paleta, čeština / english
/ polski.

## Staženi

Android APK na [Releases](https://github.com/zemanektomas/slack-ova-mobile/releases/latest).
Alternativně v [Google Play Internal Testing](https://play.google.com/apps/internaltest/4701714531864286688)
— opt-in přes Gmail.

iOS zatim ni — čeka na EAS Build a Apple Developer učet.

## Tech stack

React Native + Expo SDK 51, TypeScript, MapLibre GL, @gorhom/bottom-sheet,
expo-sqlite (single source of truth, plně offline). Bare workflow přes
`expo prebuild`. Detail v [`apps/mobile/`](https://github.com/zemanektomas/slack-ova-mobile)
struktuře.

## Setup pro vyvoj

```bash
npm install --legacy-peer-deps
cp .env.example .env  # vlož EXPO_PUBLIC_MAPY_CZ_API_KEY z developer.mapy.cz
npx expo run:android  # první build ~5 min, dalsi rychlejši
```

Vyžaduje Node 18+, Android Studio (Java 17 v `jbr/`), API klič Mapy.cz.

## Datove zdroje a atribuce

- **slack.cz** — slack.cz komunita. Data scrapujem přes
  [`apps/slackcz-scraper/`](https://github.com/zemanektomas/slack-ova-mobile/tree/main/apps)
  (samostatny tool v monorepu) z verejne `/highlines/` stranky. Žadne API,
  slack.cz nemá veřejny REST.
- **Slackmap** — [slackmap.com](https://slackmap.com), International Slackline
  Association. Verejny GeoJSON na `data.slackmap.com` + detail API na
  `api.slackmap.com/line/{hash}/details`.
- **Mapy.cz** — Seznam.cz a.s., podklady © OpenStreetMap contributors.
- **OpenStreetMap** — © OSM contributors, ODbL.

Oba zdroje su zabalene přimo v APK (build-time v `assets/seed/`).

## Roadmap

Detail v [issues](https://github.com/zemanektomas/slack-ova-mobile/issues) a
[milestones](https://github.com/zemanektomas/slack-ova-mobile/milestones).

## Licence

[Apache License 2.0](LICENSE). Tož čerpaj, hraj sy, jen jak něco predelaš,
zostan se s nama o spolupracu.

## Podpora

Apka je zadara a otevřeny zdroj. Pokud ti pomahá v terenu a chceš přispět na
poplatky pro Google Play a Apple App Store, tož muža kafe:

[**buymeacoffee.com/slacklineova**](https://buymeacoffee.com/slacklineova)

---

*Autor: Tomáš Zemánek. S láskou a paru piviskama pro slackliny v Ostravě
a celosvětově.*
