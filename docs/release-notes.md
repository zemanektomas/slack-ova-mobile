---
title: Release notes pro Play Console
---

# Release notes — co napsat do Play Console při uploadu AAB

Když uploaduješ AAB do Internal Testing, Play Console chce **"What's new in this version"** text per jazyk. Limit **500 znaků** per jazyk.

Tady jsou hotové texty co můžeš copy-paste-nout.

---

## v0.4.1 (current — Internal Testing první build)

### English (en-US)
```
First Internal Testing release.

Features:
• Full-screen map with bottom sheet list
• Black & white palette
• Map style + data source in Settings
• Czech / English language switch
• Column table for comparing slacklines
• Tap logo to center map on your location

Data: 8049 slacklines from slack.cz and slackmap.com — fully offline.

Source: github.com/zemanektomas/slack-ova-mobile
```
(~425 znaků)

### Czech (cs-CZ)
```
První Internal Testing build.

Co umí:
• Mapa přes celou obrazovku + bottom sheet
• Černobílá paleta
• Podklad mapy + zdroj dat v Nastavení
• Čeština / English přepínač
• Sloupcová tabulka pro porovnání lajn
• Tap na logo centruje mapu na tvou polohu

Data: 8049 slacklines ze slack.cz a slackmap.com — plně offline.

Zdroj: github.com/zemanektomas/slack-ova-mobile
```
(~395 znaků)

---

## Šablona pro budoucí verze

Pro každou další verzi se hodí jednoduchá struktura. Hlavní:
- **Vsuvka co se změnilo** — buď bullet seznam (max 5-6 položek) nebo 2-3 věty
- **Pokud je to bug fix** — řekni co se opravilo
- **Pokud je to nová feature** — krátký popis hodnoty pro uživatele

### v0.x.y šablona EN
```
What's new:
• [Feature 1]
• [Bug fix 1]
• [Improvement 1]

[Optional: link na changelog / GitHub release]
```

### v0.x.y šablona CS
```
Co se změnilo:
• [Funkce 1]
• [Oprava 1]
• [Vylepšení 1]

[Volitelně: odkaz na changelog]
```

---

## Tipy

- **Žádné emoji** — vypadá to amatérsky a Google to občas pruhuje
- **Pište v první osobě uživatele** — "see your location" místo "the user can see"
- **Buďte upřímní** — pokud je něco rozbité, řekni to ("known issue: map tiles slow on Pre-Android-12")
- **Marketing slovník OFF** — žádné "revolutionary", "game-changing"
- **Limit 500 znaků** — Play Console odřízne delší. Pokud bys měl víc co říct, dej zkrácený souhrn + odkaz na GitHub release notes

## Kde release notes jdou

- **Internal Testing release dialog** — Play Console → Testing → Internal testing → Create release → "Release notes" sekce
- **Production release** — stejný UI ale Production track
- **Google neukáže staré release notes** v jednom kuse — jen aktuální verze

## Pro CI auto-generation (později)

Pokud chceš ať CI automaticky vyplní release notes z **GitHub release notes** (z `generate_release_notes: true` v workflow), je k tomu plugin `gh-action-android-publisher` nebo `Triple-T/gradle-play-publisher`. Setup vyžaduje Service Account JSON z Play Console → po identity verify projdeme.
