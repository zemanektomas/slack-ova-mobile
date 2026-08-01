# ISA Safety Companion — Content

Bezpečnostní příručka pro highline v aplikaci Slackline.Ova.

## Struktura

- **`cards.ts`** — TypeScript definice 6 karet (data-driven UI)
- **`translations.{cs,en,pl}.json`** — i18n obsah karet (bude mergnutý do hlavních `src/i18n/*.json`)
- **`README.md`** — tato dokumentace

## Karty (v0.7.0)

| ID | Kategorie | Ikona | Zdroj |
|---|---|---|---|
| `isa21-limits` | limits | gauge | ISA:21 (2023) §1.3, Příloha 2 |
| `serene` | checklist | shield-check | ISA Rigger Cert syllabus |
| `snare-sane` | checklist | shield-star | Balance Community — Building Highline Anchors |
| `nylon-rule` | rule | alert-decagram | ISA:21 (2023) Příloha 5 |
| `wind` | thresholds | weather-windy | ISA Wind Advisory 2020 |
| `rlt` | lifetime | calendar-clock | ISA:21 (2023) Příloha 4 |

## Copyright & attribution

Obsah je **pedagogical adaptation** oficiálních ISA standardů. Original ISA texty jsou copyright **International Slackline Association**.

**Postup:**
1. Vlastní přeformulace v CS/EN/PL (fair use / educational)
2. Attribute source každé karty (viz `reference.source` v `cards.ts`)
3. Uživatel má vždy odkaz na oficiální ISA:21 PDF pro autoritativní texty

## Roadmap

- **v0.7.0** — 6 basic karet (read-only + session mode) + session persistence
  do SQLite (`isa_check_sessions`, schema v4) + best-effort GPS log + history view
- **v0.8.0** — Anchor angle calculator (force per leg podle úhlu)
- **v0.9.0** — MA / pulley calculator, force estimator (Jörren data)
- **v1.0.0** — Weather API integrace (Open-Meteo), session export JSON/CSV

## ISA endorsement plan

Po passing ISA Rigger Cert (16.-18.8.2026) kontaktovat ISA (Thomas Buckingham) s návrhem oficiální endorsement:
- Slackline.Ova má 8000+ lajn ze slackmap
- Autor je ISA Instructor C + Rigger Cert
- Open source (Apache 2.0), CS+EN+PL

**Cíl:** ISA newsletter feature + oficiální kontent review.
