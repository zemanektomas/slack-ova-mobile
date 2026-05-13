---
title: Feature Graphic — banner do Play Store
---

# Feature Graphic — 1024 × 500 px

Google Play vyžaduje **feature graphic** (banner co se zobrazí nahoře na store stránce). Bez něj **app nepublishneš**.

- **Rozměry:** 1024 × 500 px **přesně**
- **Formát:** PNG nebo JPG, max 15 MB
- **Žádný text:** Google doporučuje minimum textu (~3-5 slov max). Velký nápis by konkuroval s názvem apky a screenshoty.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ 1024 × 500                                                   │
│                                                              │
│  ┌─────┐                                                     │
│  │     │   SLACKLINE.OVA                                     │
│  │ LOGO│                                                     │
│  │ Sl. │   Slackline map • offline                           │
│  │ Ova │                                                     │
│  └─────┘                                                     │
│                                       [mapa ČR pozadí       │
│                                        s decentními         │
│                                        markery]              │
└──────────────────────────────────────────────────────────────┘
```

### Doporučené prvky

1. **Pozadí (full bleed):** screenshot mapy ČR / Ostravy z apky v **light** theme, **mírně rozostřený** (Gaussian blur 4-6px) ať konkuruje s overlay textem
2. **Logo Sl.Ova** (z `assets/source/sl-ova-logo.png`):
   - Velikost: ~280-320 px na výšku, levá strana
   - Padding zleva: ~80 px, vertikálně vystředěno
3. **Title text:**
   - **"SLACKLINE.OVA"** — bold, sans-serif, černá barva (na světlém pozadí), ~64 px font
   - Pod ním: **"Slackline map · offline"** — regular, ~28 px, dark gray
4. **Žádný marketing text** — Google to neuvítá

### Color palette (sladěno s logem)

- **Background blur:** šedé tóny z mapy (žádné saturované barvy)
- **Text:** `#111827` slate-900 na light pozadí
- **Logo:** beze změny, transparent okraje
- **Akcenty:** žádné — držet se čerň-bíla paleta apky

### Co NEDĚLAT

- ❌ **Žádné screenshoty UI uvnitř** banneru — Play Store je má v jiné sekci
- ❌ **Žádný "Download now" / "5 stars" text** — Google to odmítne (policy)
- ❌ **Žádné emoji** — vypadá to amatérsky
- ❌ **Žádný gradient přechod** — drž se čisté čb estetiky

## Nástroje

### Canva (free, doporučeno)
1. [canva.com/design](https://canva.com) → Create design → Custom size → 1024 × 500 px
2. Upload `assets/source/sl-ova-logo.png` jako element
3. Upload screenshot mapy jako background, aplikuj Blur efekt (Edit photo → Blur → 5)
4. Přidej textové bloky podle layoutu výše
5. Export jako PNG, max quality
6. Save do `docs/feature-graphic.png` (committable do repa)

### Figma (zdarma pro 3 projekty)
- Stejný postup, ale precizní typografie
- Pokud máš figma účet, řekni jaký font preferuješ a já napíšu specifikaci

### Photoshop / Affinity
- Pokud umíš a máš licenci. Layered PSD do `assets/source/` pro budoucí edity.

## Příklad hotových feature graphics (inspirace)

Vyhledej v Play Store apky:
- **Strava** — sportovní app, mapa pozadí + logo. Čistý stylový banner.
- **Komoot** — outdoor mapa, podobná philosophy.
- **Mapy.cz** — banner v duchu modré, ale layout stejný (logo + slogan + mapa pozadí).

Slackline.Ova banner by se měl podobat těmto — funkční, minimalistický, žádný hype.

## Kdy hotové

Až vytvoříš feature-graphic.png, dej mi vědět + uploadneme do repa pod `docs/assets/feature-graphic.png` ať je verzovaný a hostovaný přes GitHub Pages.

Play Console pak v sekci **Main store listing → Graphics → Feature graphic** drag-and-drop nahraješ.
