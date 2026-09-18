---
title: Slackline.Ova — Offline slackline companion
description: Offline-first Android app for slackliners — multi-source map, ISA safety reference, gear log, training resources.
---

# Slackline.Ova

**Offline-first slackline companion for Android.**
**Map, safety, gear and training — no signal required.**

[![Google Play](https://img.shields.io/badge/Google%20Play-Slackline.Ova-0e8a16?logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=cz.slackline.ova)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](https://github.com/zemanektomas/slack-ova-mobile/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)](https://play.google.com/store/apps/details?id=cz.slackline.ova)

---

## What it is

Slackline.Ova is a mobile companion for slackliners in the field — the
places where phone signal usually is not. It started as an offline map for
the Czech Republic (Sl.Ova, Ostrava scene) and grew into a **multi-source
aggregator** with safety reference, gear tracking and curated training
material.

Complementary to [Slackmap](https://slackmap.com) and
[ISA](https://slacklineinternational.org) — a national and regional
mobile-offline layer, not a competitor. Slackmap stays the source of truth
for global line submissions; local information belongs on a local platform.

## Features

### Map

- Every public line from [slack.cz](https://slack.cz),
  [slackmap.com](https://slackmap.com) and [SlackData](https://slackdata.org)
  bundled inside the app.
- Anchors, lengths, heights, descriptions, parking.
- Full-screen map with a bottom sheet list — drag to resize.
- Bounds-driven filtering — the list updates as you pan.
- Marker color by type — highlines stand out, others are muted.
- Sort by distance from you or by any column.
- Inline detail on tap — anchors, description, source link.
- One **Navigate** button per line — Android picker (Mapy.cz, Google Maps,
  Sygic, Locus, Waze — whatever you have installed).
- Map styles: OSM (default), Mapy.cz satellite, Mapy.cz terrain.
- Czech / English / Polish UI. Dark and light theme follow the system.

### ISA Safety Companion

Offline reference cards and calculators citing ISA:21, ISA:37, ISA:41 and
related standards — a pocket reference for people who already know what
they're doing. Not a replacement for training or ISA certification.

### Rig Log — *in development*

Per-line safety check and a full rig record. Photo-documented anchors,
weather, tension, incidents, and lead rigger identity.

### Gear — *in development*

Material catalog (webbings, weblocks, connectors, harnesses) with ISA
warnings and recalls from SlackData. Your own inventory with usage history
and RLT (recommended lifetime) tracking.

### Training — *planned*

Curated external educational resources — postures, techniques, knots. Not
safety-critical rigging — personal-growth material for slackliners at every
level.

## Privacy

We do **not** collect any personal data. No accounts, no tracking, no ads,
no analytics. GPS only shows your position on the map — it is never
transmitted anywhere. Full details: [Privacy Policy](privacy.md).

## Download

**[Google Play — Slackline.Ova](https://play.google.com/store/apps/details?id=cz.slackline.ova)** — the primary distribution channel.

iOS: not yet. Planned via EAS Build and TestFlight.

## Open source

Apache 2.0. Code, issues, releases and roadmap:
[github.com/zemanektomas/slack-ova-mobile](https://github.com/zemanektomas/slack-ova-mobile)

## Support the project

[buymeacoffee.com/slacklineova](https://buymeacoffee.com/slacklineova) —
covers store fees so the app stays free and open source.

---

## Attribution

- **slack.cz** — Czech slackline community ([slack.cz](https://slack.cz)).
- **Slackmap** — International Slackline Association
  ([slackmap.com](https://slackmap.com)), data CC BY-SA 4.0.
- **SlackData** — International Slackline Association
  ([slackdata.org](https://slackdata.org)), data CC BY-SA 4.0.
- **Mapy.cz** — Seznam.cz a.s., basemaps © OpenStreetMap contributors.
- **OpenStreetMap** — © OSM contributors, ODbL.

*Built by Tomáš Zemánek in Ostrava, Czech Republic.*
*For slackliners, by slackliners.*
