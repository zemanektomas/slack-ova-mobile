# Slackline.Ova — mobil

Tož, naša mobilna apka. Offline mapa slacklin v telefonu — z lesa, bez signalu,
bez čekani na 4G. Otevřeš, vidiš co kde visi, kolik je to do nejbližšiho špagatu.

Vznikla na ostravske slackline scene (Sl.Ova), ale data su globalni:
[slack.cz](https://slack.cz) pro Česko, [slackmap.com](https://slackmap.com)
pro celej svět.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Google Play](https://img.shields.io/badge/Google%20Play-Slackline.Ova-0e8a16?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=cz.slackline.ova)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](https://play.google.com/store/apps/details?id=cz.slackline.ova)

## Co umi

Plnohodnotny opis je na **[slacklineova.cz](https://slacklineova.cz)**. Tož
kratce: offline mapa, bottom sheet se seznamem, hledani, navigovani k parkovani
přes Mapy.cz / Google Maps / Locus / Sygic, čerň-bila paleta, čeština / english
/ polski.

## Staženi

**[Slackline.Ova na Google Play](https://play.google.com/store/apps/details?id=cz.slackline.ova)** — to je hlavni cesta, tam si to stahneš normalně jak jinu apku.

> ⚠️ **APK z GitHub Releases — od 30. 9. 2026 už nepůjdů nainstalovat.**
> Google zavadi [Android Developer Verification](https://developer.android.com/developer-verification)
> a APK z neregistrovanych zdrojů na běžnych Androidech zablokuje.
> Slackline.Ova mame na Google Play zaregistrovanu, tož přes obchod to jede
> dal bez problemu. Starše APK v Releases zůstanů jak archiv.

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
