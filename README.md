# Slackline.Ova

**Offline-first slackline companion for Android. Multi-source map, safety reference, gear log, training resources.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Google Play](https://img.shields.io/badge/Google%20Play-Slackline.Ova-0e8a16?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=cz.slackline.ova)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](https://play.google.com/store/apps/details?id=cz.slackline.ova)

Slackline.Ova started as an offline map for the Czech Republic (Sl.Ova, Ostrava
scene) and grew into a multi-source mobile companion — map, safety reference,
gear log, and curated training resources — for slackliners in the field.

## What it does

- **Map.** Every public line from [slack.cz](https://slack.cz),
  [slackmap.com](https://slackmap.com) and [SlackData](https://slackdata.org)
  bundled inside the app: anchors, lengths, heights, descriptions, parking.
  Works without signal once installed.
- **ISA Safety Companion.** Offline reference cards and calculators citing
  ISA:21, ISA:37, ISA:41 and related standards. A pocket reference, not a
  replacement for training or certification.
- **Rig Log.** Per-line safety check and a full rig record for riggers
  *(in development)*.
- **Gear.** Material catalog, personal inventory, RLT tracking
  *(in development)*.
- **Training.** Curated external educational resources — postures, techniques,
  knots *(planned)*.
- **Offline & private.** No accounts, no analytics, no ads, no tracking.

## Positioning

Slackline.Ova is a **mobile-offline aggregator** — complementary to
[Slackmap](https://slackmap.com) and [ISA](https://slacklineinternational.org)
infrastructure, not a competitor. Slackmap remains the source of truth for
global line submissions. National and regional information (Czech regulations,
LZS air-safety notifications, local communities, national gear catalogs)
belongs on a national/mobile platform, and that is where this app fits.

## Download

**[Google Play — Slackline.Ova](https://play.google.com/store/apps/details?id=cz.slackline.ova)** — primary distribution.

iOS: not yet. Planned via EAS Build and TestFlight once demand justifies the
Apple Developer fee.

> APK sideload from GitHub Releases is no longer supported due to Google's
> [Android Developer Verification](https://developer.android.com/developer-verification)
> (effective 30 September 2026). The Play Store distribution is unaffected.

## Tech

React Native + Expo SDK 51, TypeScript, MapLibre GL, `@gorhom/bottom-sheet`,
`expo-sqlite` as the single source of truth. Bare workflow via `expo prebuild`.

## Development

```bash
npm install --legacy-peer-deps
cp .env.example .env  # add EXPO_PUBLIC_MAPY_CZ_API_KEY from developer.mapy.cz
npx expo run:android
```

Requires Node 18+, Android Studio (Java 17 in `jbr/`), and a Mapy.cz API key.

## Data sources

- **slack.cz** — Czech slackline community. Scraped via
  [`apps/slackcz-scraper/`](https://github.com/zemanektomas/slack-ova-mobile/tree/main/apps)
  from the public `/highlines/` page (no REST API is available).
- **Slackmap** — [slackmap.com](https://slackmap.com), International Slackline
  Association. Public GeoJSON at `data.slackmap.com` and line details at
  `api.slackmap.com`. Data licensed under **CC BY-SA 4.0**.
- **SlackData** — [slackdata.org](https://slackdata.org), ISA. Gear catalog,
  warnings and recalls. Data licensed under **CC BY-SA 4.0**.
- **Mapy.cz** — Seznam.cz a.s., basemaps © OpenStreetMap contributors.
- **OpenStreetMap** — © OSM contributors, ODbL.

Line data is bundled at build time (see `assets/seed/`) and refreshed on
demand from the network.

## License and trademarks

Source code is licensed under the [Apache License 2.0](LICENSE). Attribution
requirements are listed in [`NOTICE`](NOTICE).

The name **Slackline.Ova**, the logo, and the Ostrava silhouette artwork are
trademarks of Tomáš Zemánek and are **not** covered by the Apache 2.0
license. Forks and derivative works must adopt a different name and branding.

## Roadmap

See [issues](https://github.com/zemanektomas/slack-ova-mobile/issues) and
[milestones](https://github.com/zemanektomas/slack-ova-mobile/milestones).

## Support

Free and open source. If it helps you in the field, a coffee for the
maintainer covers store fees and keeps everything free:

[**buymeacoffee.com/slacklineova**](https://buymeacoffee.com/slacklineova)

---

*Built by Tomáš Zemánek in Ostrava, Czech Republic. For slackliners, by slackliners.*
