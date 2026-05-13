---
title: Google Play Console — checklist krok-po-kroku
---

# Google Play Console — checklist

Přesný postup k získání aplikace do Internal Testing tracku. Po dokončení budou tví kámoši Android testeři moct nainstalovat verze přímo z Play Store (testing track), ne přes APK sideload.

---

## Fáze 1: Účet (jen ty, ~1-7 dní)

### 1. Vytvořit Google Play Developer účet

- URL: [play.google.com/console/signup](https://play.google.com/console/signup)
- **$25 jednorázový poplatek** (~600 Kč), platba kartou
- Vyber: **Individual** (osobní účet, ne firma) — pro hobby projekt jednoznačně
- Vyber **země: Czech Republic**
- Účet bude vázaný na tvůj Google email (pokud nemáš Gmail, vytvoř — kontakt v Play Console = tomas.zemanek@tz3.cz)

### 2. Identity verification

Google chce dokázat že nejsi spambot:
- Občanský průkaz (nebo pas) — nahraješ scan obou stran
- Adresa — taky se ověřuje, většinou OK
- Telefon — SMS verifikace
- **Doba zpracování:** 1-7 dní (většinou 2-3 dny)

### 3. Developer Distribution Agreement

Klikneš "Accept" — Google's developer ToS. Standardní.

---

## Fáze 2: Vytvoření aplikace (po verify, ~30 min)

### 4. Create app v Play Console

- Klikni **Create app**
- **App name:** `Slackline.Ova` (max 30 znaků)
- **Default language:** Czech (cs-CZ)
- **App or game:** App
- **Free or paid:** Free
- **Declarations:**
  - ☑ Developer Program Policies
  - ☑ US export laws
- **Create**

### 5. Vyplnit Store listing (Czech)

Vlevo navigace → **Grow → Store presence → Main store listing**:

- **App name:** `Slackline.Ova`
- **Short description (80 znaků):** _Mapa slacklines v ČR a po světě. Offline. Bez sledování. Pro slackliners._
- **Full description:** Copy-paste z [store-listing.md](store-listing.md) sekce "CS — Full description"
- **App icon:** Upload `assets/icon.png` (1024×1024, máš v repo)
- **Feature graphic:** **POTŘEBUJEME VYTVOŘIT** — 1024×500 banner. Doporučuju mapu + logo overlay. Zatím můžeš dát jednoduché:
  - Pozadí: screenshot mapy ČR s Brnem/Prahou/Ostravou viditelně
  - Logo Sl.Ova vlevo nahoře
  - Text "Slackline.Ova — mapa slacklines offline" v pravé části
- **Phone screenshots:** 4-7 obrázků (viz Fáze 4 níže)
- **Tablet screenshots:** volitelné, ale doporučené pro lepší rating
- **Application type:** App
- **Category:** Sports → Outdoor Recreation
- **Tags:** ✅ Outdoor, Sports, Maps & Navigation
- **Contact email:** tomas.zemanek@tz3.cz
- **External marketing:** nevyplňovat

### 6. Vyplnit anglickou verzi (Add translations)

- **Translations → Add translation → English (United States)**
- Stejný postup s EN texty z [store-listing.md](store-listing.md)

### 7. Vyplnit App content (povinné pro publish)

Vlevo → **Policy → App content**. Procházíš 6-7 sekcí, vyplníš dotazníky:

#### Privacy policy
- URL: **`https://zemanektomas.github.io/slack-ova-mobile/privacy`**
- (Hostováno přes GitHub Pages, automaticky po každém pushi do main)

#### Ads
- **Does your app contain ads?** → No

#### App access
- **Is your app restricted to selected users?** → All functionality available without restrictions

#### Content rating
Vyplníš dotazník:
- Category: **Reference, News, or Educational** (nebo Utility/Productivity)
- Violence, sexual content, profanity, drugs, gambling: **No** ve všem
- User-generated content: **No**
- Location sharing: **Yes** (GPS poloha) — ale **Not shared with other users**
- Personal information collection: **No**
- Výsledná rating: **Everyone (3+)**

#### Target audience
- Target age groups: **18+** (slackline je sport pro dospělé)
- Appeals to children: **No**

#### News app
- Is this a news app? → No

#### COVID-19 contact tracing
- → No

#### Data safety
Klíčový dotazník — pozor, Google to kontroluje:
- **Does your app collect or share any of the required user data types?** → **No**
  - Důvod: žádné údaje nesbíráš ani neposíláš na server
- **Is all data encrypted in transit?** → Yes (HTTPS pro tile fetches)
- **Do you provide a way for users to request data deletion?** → No data is collected
- Při dalších otázkách → No collection, No sharing

#### Government apps
- → No

#### Financial features
- → None of these

#### Health
- → None of these

### 8. Pricing & distribution

Vlevo → **Monetization → Products → none** (free app)
Vlevo → **Setup → Advanced settings → Countries**:
- Vyber: **Czech Republic, Slovakia, Poland, Germany, Austria** (start narrow, expand later)
- Nebo: **Available worldwide** (klidně, žádná legal/jazyková překážka)

---

## Fáze 3: Build & upload AAB (~15 min)

### 9. Stáhnout AAB z GitHub Releases

- Jdi na [github.com/zemanektomas/slack-ova-mobile/releases/latest](https://github.com/zemanektomas/slack-ova-mobile/releases/latest)
- Stáhni `slackline-ova-0.4.1.aab` (~70-90 MB)

### 10. Vytvořit Internal Testing release

Vlevo → **Testing → Internal testing → Create new release**:

- **Upload AAB:** drag-and-drop `slackline-ova-0.4.1.aab`
- Google zkontroluje signature (musí být tvůj release keystore — ✅ je)
- **Release name:** `0.4.1 (Internal)`
- **Release notes (CS):**
  ```
  v0.4.1 — první Internal Testing build.
  
  Co umí (od v0.4.0):
  • Mapa přes celou obrazovku + bottom sheet se seznamem
  • Černobíla paleta sladěná s logem
  • Settings sheet — podklad mapy + zdroj dat + jazyk
  • Čeština / English přepínač
  • Sloupcová tabulka v listu
  • Tap na logo = GPS centrování
  ```
- **Release notes (EN):**
  ```
  v0.4.1 — first Internal Testing build.
  
  Features (since v0.4.0):
  • Full-screen map + bottom sheet list
  • Black & white palette matching the logo
  • Settings sheet — map style + data source + language
  • Czech / English switcher
  • Column table in the list
  • Tap logo for GPS centering
  ```
- **Review release → Start rollout to Internal testing**

### 11. Přidat testery

Vlevo → **Testing → Internal testing → Testers → Create email list**:

- **List name:** `Slackliners`
- **Add emails:** seznam Google emails (Gmail nebo Google Workspace) testerů
- **Save changes**

### 12. Sdílet testing odkaz

- Vlevo → **Testing → Internal testing → Copy link** (něco jako `play.google.com/apps/internaltest/...`)
- Pošli odkaz testerům (WhatsApp, Slack, email)
- Tester klikne → otevře Play Store → vidí app jako Internal tester → install

---

## Fáze 4: Screenshoty (před uploadem, ~30 min)

### Jak pořídit

1. Spusť apku v dev modu nebo nainstaluj v0.4.1 APK
2. Nastav telefon na **Czech** locale (Settings → System → Languages)
3. Nastav theme dle preferences — buď ber všechno v light **nebo** všechno v dark, ne mix
4. Power + Volume Down → screenshot
5. Soubory budou v `Pictures/Screenshots/` v telefonu

### Co zachytit (7 záběrů)

1. **Mapa + Half sheet** — Default stav, vidíš mapu ČR a tabulku se slacklines
2. **Mapa + Full sheet (Expanded)** — drag handle nahoru, list přes celou obrazovku
3. **Mapa + Collapsed sheet** — drag handle dolů, mapa dominantní, vidět logo + GPS
4. **Inline detail rozbalený** — tap na řádek, vyrolovaná karta s kotvami
5. **Settings sheet otevřený** — ozubené kolo → ukázat jazyk + podklad mapy + zdroj
6. **Filter sheet otevřený** — filtr ikona → cascading státy/regiony
7. **Anglická verze** — přepnout na EN, screenshot HomeScreen

### Editace (volitelné)

- Pokud chceš profesionální vzhled, hodí se 1024×500 **feature graphic** s logem + sloganem
- Doporučené nástroje: Figma (free), Canva (free)
- Pokud nechceš trápit s designem, dej tam jen jednoduchý screenshot s textem

### Rozměry

Google akceptuje:
- **Phone:** 16:9 nebo 9:16, minimální delší strana 320 px, max 3840 px
- Většina moderních telefonů vyfotí native 1080×2400 nebo 1440×3200 — to je v pořádku

---

## Fáze 5: Promotion na Production (později)

Po několika týdnech Internal Testing (s tvými 5-10 testery), pokud nebudou kritické bugy:

1. **Testing → Internal testing → Promote release → Production**
2. Google review (1-7 dní) — automatický + manuální review
3. Pokud OK → **live na Google Play Store** pro všechny

Před promote do Production:
- Aspoň 14 dní Internal Testing (Google sleduje)
- Nemělo by být **uninstall rate >10 %**
- Nemělo by být **crash rate >2 %** (sleduješ v **Quality → Android vitals**)

---

## Co dělat když něco selže

- **Build rejected pro signature mismatch** → keystore má jiný SHA-256 než předchozí upload. Toto by mělo být OK protože používáme stejný release keystore. Pokud Google odmítne, použij `keytool -list -v -keystore release.keystore` a srovnej fingerprint.
- **Privacy URL not reachable** → GitHub Pages může být temporarily down. Zkus za pár minut.
- **Data safety inconsistency** → Google porovnává tvé `Data safety` formulář s tím co APK skutečně dělá. Pokud se liší (např. řekneš "no location" ale máš `ACCESS_FINE_LOCATION`), odmítnou. Vyplnil jsem to **location: collected but not shared**, ale možná by lepší **not collected** protože data nikam neposíláš (location žije jen v zařízení). Pokud Google bude protestovat, edit form.
- **Content rating mismatch** → pokud dají Mature 17+ místo Everyone, projdi questionnaire znova
- **Identity verification odmítnuta** → Google chce čistou občanku, žádné odlesky, žádné ořezy
