---
title: Privacy Policy — Slackline.Ova
---

# Privacy Policy

**Last updated:** 13 May 2026
**Effective date:** 13 May 2026
**App:** Slackline.Ova (Android package `cz.slackline.ova`, iOS bundle `cz.slackline.ova`)
**Operator:** Tomáš Zemánek, Czech Republic — contact: tomas.zemanek at tz3 dot cz

---

## TL;DR

Slackline.Ova is an offline-first map of slacklines. **We do not collect, store, or transmit any personal data.** Everything happens on your device.

---

## English

### What data the app uses

Slackline.Ova reads two kinds of data on your device:

1. **Slackline location data** — a static dataset of public slackline locations, names, descriptions, and difficulty ratings, bundled with the app. Data sources:
   - [slack.cz](https://slack.cz) — Czech slackline community database (~239 lines)
   - [slackmap.com](https://slackmap.com) — international slackline registry (~7810 lines)
2. **Your device's GPS location** — only when you tap the GPS button on the map or when the app determines your default country on first launch. Used exclusively to show your position on the map and pre-select a country filter. **Your location is never sent to our servers (we have no servers) or any third party.**

### What the app does NOT do

- We do **not** collect any personally identifiable information (PII).
- We do **not** track your behavior, clicks, or usage.
- We do **not** use analytics, advertising SDKs, or trackers.
- We do **not** share data with third parties.
- We do **not** require an account or login.

### Third-party services

The app fetches map tiles (background imagery) over the internet from:

- **Mapy.cz** (Seznam.cz a.s.) — aerial and outdoor map tiles. Their privacy policy: <https://o.seznam.cz/ochrana-udaju/>
- **OpenStreetMap** — fallback map tiles. Their privacy policy: <https://wiki.osmfoundation.org/wiki/Privacy_Policy>
- **OpenStreetMap Nominatim** — used once on first app launch to reverse-geocode your GPS coordinates to a country name (so the country filter pre-selects "Czech Republic" if you are in CZ). Single request, no personal data attached. Their privacy policy: <https://osmfoundation.org/wiki/Privacy_Policy>

These services may log your IP address as part of normal HTTP traffic. The app does not send any other data to them.

### Permissions

- **Location (`ACCESS_FINE_LOCATION` on Android, `NSLocationWhenInUseUsageDescription` on iOS)** — only used to show your position on the map. Can be denied; the app works without it.
- **Internet** — for map tile fetching. Without internet, the bundled slackline data still works; only the map background may not load.

### Data retention

All data is stored **on your device** in a local SQLite database (`expo-sqlite`) and AsyncStorage. There is no remote server. If you uninstall the app, all data is removed by the operating system.

### Children

The app is not directed at children under 13, but contains no age-gated content and may be used by anyone.

### Contact

If you have any questions about this privacy policy, contact:
**Tomáš Zemánek** — tomas.zemanek at tz3 dot cz

---

## Česky

### Jaké údaje aplikace používá

Slackline.Ova používá v zařízení dva typy údajů:

1. **Data o slacklines** — statická databáze veřejných slacklines (poloha, jména, popisy, hodnocení) zabalená v aplikaci. Zdroje:
   - [slack.cz](https://slack.cz) — česká slackliner databáze (~239 lajn)
   - [slackmap.com](https://slackmap.com) — mezinárodní slackline registr (~7810 lajn)
2. **GPS poloha zařízení** — jen když ťukneš na GPS tlačítko v mapě nebo při prvním spuštění aplikace pro výchozí filtr země. Slouží výhradně k zobrazení tvé polohy v mapě a předvolbě filtru. **Tvá poloha se nikdy neposílá na naše servery (žádné nemáme) ani třetí straně.**

### Co aplikace NEDĚLÁ

- **Nesbíráme** žádné osobní údaje.
- **Nesledujeme** tvé chování, kliky, ani používání.
- **Nepoužíváme** analytiku, reklamní SDK ani trackery.
- **Nesdílíme** data se třetími stranami.
- **Nevyžadujeme** účet ani přihlášení.

### Třetí strany

Aplikace stahuje mapové dlaždice (podklad mapy) přes internet z:

- **Mapy.cz** (Seznam.cz a.s.) — letecké a turistické mapové dlaždice. Privacy: <https://o.seznam.cz/ochrana-udaju/>
- **OpenStreetMap** — záložní mapové dlaždice. Privacy: <https://wiki.osmfoundation.org/wiki/Privacy_Policy>
- **OpenStreetMap Nominatim** — používá se jednou při prvním spuštění k získání tvého státu z GPS souřadnic (aby se filtr země předvyplnil "Česká republika" v ČR). Jeden požadavek, bez osobních údajů. Privacy: <https://osmfoundation.org/wiki/Privacy_Policy>

Tyto služby si mohou logovat tvou IP adresu jako součást normálního HTTP provozu. Aplikace jim neposílá žádné další údaje.

### Oprávnění

- **Poloha (`ACCESS_FINE_LOCATION` na Androidu, `NSLocationWhenInUseUsageDescription` na iOS)** — slouží jen k zobrazení tvé polohy v mapě. Můžeš odmítnout; aplikace funguje i bez toho.
- **Internet** — pro stahování mapových dlaždic. Bez internetu funguje databáze slacklines, jen se nemusí načíst mapa.

### Uchovávání dat

Všechna data jsou uložená **v zařízení** v lokální SQLite databázi (`expo-sqlite`) a AsyncStorage. Žádný vzdálený server. Když aplikaci odinstaluješ, operační systém všechna data smaže.

### Děti

Aplikace není cílená na děti do 13 let, ale neobsahuje obsah omezený věkem a mohou ji používat všichni.

### Kontakt

V případě dotazů ohledně této privacy policy kontaktuj:
**Tomáš Zemánek** — tomas.zemanek at tz3 dot cz
