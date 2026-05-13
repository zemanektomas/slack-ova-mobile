---
title: Screenshot checklist
---

# Screenshot checklist pro Play Store

7 záběrů co potřebuješ. Pořiď je z fyzického telefonu (Samsung SM-G980F → 1080×2400 nebo similar), Power + Volume Down. Lepší než emulátor protože vidíš reálnou UX.

## Setup před focením

1. **Nainstaluj v0.4.1 APK** ze stejného release co půjde do Play Store (konzistence)
2. **Nastav telefon na English locale** (Settings → System → Languages → English) — Play Store dělá z EN screenshotů default, CS přidáš později jako translation
3. **Theme:** Buď všechno light **NEBO** všechno dark. Mix vypadá chaoticky. Doporučuji **light** — slunce v lese, méně kontrastní, hezčí pro mapu.
4. **Letový režim ON** pro klidnou status bar (žádný blikající 4G signál), pak zapni WiFi pro tile fetch
5. **Status bar clean** — žádné nahlasné notifikace; pokud je Bluetooth ON a v notifikační liště nepotřebné ikonky, vypnout

## 7 záběrů

Pro každý záběr níže napsán:
- **Co zachytit** — popis scény
- **Klíčové prvky** — co MUSÍ být na obrazovce vidět
- **Caption EN/CS** — text který přidáš v Play Console pod screenshot (max 60 znaků)

---

### Screenshot 1: Map + Half sheet (úvodní záběr)

**Co:** Default po spuštění apky. Mapa zobrazuje Ostravu (default location), sheet je v 50% (Half). V listu by mělo být vidět 3-5 řádků slacklines.

**Klíčové prvky:**
- Logo v levém horním rohu mapy
- Markery (slate-800 + slate-400) viditelné
- Bottom sheet drag handle
- Search bar + filter + settings ikony
- Sort bar (Name / Length / Height / ★ / Distance)
- 3-5 řádků listu

**Caption EN:** `Map and slacklines list — three drag positions`
**Caption CS:** `Mapa a seznam slacklines — tři velikosti`

---

### Screenshot 2: Map + Expanded sheet (full list)

**Co:** Sheet přetažený nahoru na ~92 % (Expanded). Mapa skoro nezavidět, list dominantní s 10+ řádky.

**Klíčové prvky:**
- Tenký pruh mapy nahoře
- Drag handle vidět
- 10+ slacklines v tabulkovém layoutu
- Sloupce **Length / Height / ★** zarovnané pravo

**Caption EN:** `Tabular layout — compare lengths at a glance`
**Caption CS:** `Tabulkový seznam — porovnávej délky pod sebou`

---

### Screenshot 3: Inline detail rozbalený

**Co:** Tap na řádek (vyber slackline s description, např. nějaká z Beskyd / Brna / Ostravy). Rozbalený detail pod řádkem.

**Klíčové prvky:**
- Vybraný řádek bílo zvýrazněný v listu (`t.accent` bold name)
- Pod ním rozbalená karta (length / height / rating / type / description)
- Anchor coordinates (tap-able pro Mapy.cz)
- Source attribution dole ("Source: slack.cz" / "slackmap.com")

**Caption EN:** `Inline detail — anchors, description, parking`
**Caption CS:** `Inline detail — kotvy, popis, parkoviště`

---

### Screenshot 4: Settings sheet otevřený

**Co:** Tap ozubené kolo v search baru → SettingsSheet vyrolovaný.

**Klíčové prvky:**
- 3 řady chipů: **Map style** / **Data source** / **Language**
- Active chip vyznačený (černé pozadí, bílý text)
- Title "Map settings" nahoře
- Close X v rohu
- "Done" tlačítko dole

**Caption EN:** `Settings — map style, data source, language`
**Caption CS:** `Nastavení — podklad mapy, zdroj dat, jazyk`

---

### Screenshot 5: Filter sheet (cascading)

**Co:** Tap filter ikona → FilterSheet otevřený. Vyber Country = Czech Republic, vidět region chipy.

**Klíčové prvky:**
- 3 řady chipů: **Country** / **Region** / **Sector**
- Cascading vidět — pod Country jsou regiony jen z té země
- Aktivní country chip vyznačený
- "Done" + "Reset" buttony dole

**Caption EN:** `Filter by country, region, sector`
**Caption CS:** `Filtruj podle státu, regionu, sektoru`

---

### Screenshot 6: Marker tap (pravděpodobně přijde s detail expanze)

**Co:** Tap na marker na mapě → sheet vyjede na Half + řádek se rozbalí.

**Klíčové prvky:**
- Marker bíle obtočený (vybraný)
- Spojnice mezi anchor1 + anchor2 bíle
- Bottom sheet otevřený k té lajně
- Detail viditelný

**Caption EN:** `Tap a marker — list scrolls to the line`
**Caption CS:** `Tap na marker — list skočí na tu lajnu`

---

### Screenshot 7: Dark mode

**Co:** Přepni telefon na Dark theme (Settings → Display → Dark). Apka se automaticky překlopí.

**Klíčové prvky:**
- Pozadí UI tmavé
- Markery slate-200 (světlé)
- Moje poloha bílá s černým strokem
- Mapa pořád v light tile (Mapy.cz nemá dark style)

**Caption EN:** `Dark theme — follows system preference`
**Caption CS:** `Tmavý motiv — podle nastavení telefonu`

---

## Po focení

1. **Zkontroluj rozměry** — všechny obrázky by měly mít **stejnou velikost** (Android Studio dělá 1080×2400, Samsung snad taky). Play Console nepustí mix.
2. **Pořadí** — Play Console drag-and-drop, 1. screenshot = "Hero" co uvidí uživatel jako první. Doporučuji to pořadí výše.
3. **Cropping** — obvykle není potřeba. Pokud chceš odstranit status bar, oříznout ho **konzistentně** ze všech.
4. **Crash testing** — než uploaduješ, vyzkoušej že snapshots nejsou z buggy build (žádné error overlay, žádný red box v rohu)

## Kde uložit

V repo na: `docs/screenshots/01-home.png`, `02-list-expanded.png`, atd. Pages je pak může hostovat, kdyby ses chtěl podívat zpětně.

## Pomocné nástroje (volitelné)

- **Šedý frame okolo** — Material Studio (Android Studio plugin), generuje device frame okolo screenshotů. Vypadá jako "screen real estate context", ale Play Store to nechce.
- **Annotation arrows** — Skitch (free), užitečné pokud chceš ukázat "tady je drag handle"
- **Marketing variant** — Canva má free template "App Store Screenshots", přidá pozadí + text. Pro 1. submission zbytečné, ale pokud chceš profesionální look, **proto je**.
