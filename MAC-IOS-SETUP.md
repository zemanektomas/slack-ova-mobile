# Slackline.Ova — iOS setup na MacBook

Cíl: testovat apku na iOS Simulator + fyzický iPhone **bez Apple Developer $99 fee**.

## Prerequisites (na Mac)

1. **macOS 13+** (Ventura) doporučeno
2. **Xcode 15+** — App Store (~15 GB download, ~1h install)
3. **Xcode Command Line Tools** — `xcode-select --install`
4. **Node.js 20+** — `brew install node`
5. **CocoaPods** — `sudo gem install cocoapods`
6. **Git** — `xcode-select` už zahrnuje

Ověření:
```bash
xcodebuild -version   # Xcode 15.x
node --version         # v20.x nebo v22.x
pod --version          # 1.15.x+
```

## Klonování + install

```bash
cd ~/Development  # nebo kdekoli chceš
git clone https://github.com/zemanektomas/slack-ova-mobile.git
cd slack-ova-mobile
npm install --legacy-peer-deps
```

## Environment variables

Zkopíruj `.env.example` → `.env` a doplň API klíč Mapy.cz (stejný co je v Windows):

```bash
cp .env.example .env
# Otevři .env a nastav:
# EXPO_PUBLIC_MAPY_CZ_API_KEY=tvůj_klíč
```

Klíč získat z [developer.mapy.cz](https://developer.mapy.cz) — free tier stačí.

## Cesta A — iOS Simulator (nejrychlejší, žádný iPhone potřeba)

```bash
npx expo run:ios
```

- Trvá **5-15 min** první build (kompilace native modulů, hlavně MapLibre + Reanimated)
- Otevře iOS Simulator (default iPhone 15 Pro) s nainstalovanou apkou
- Další build je rychlý (Metro cache)
- **Fake GPS:** Simulator → Features → Location → Custom → nastav Ostrava (49.8347, 18.2820) nebo Apple default (Cupertino)

**Omezení simulátoru:**
- Kamera nefunguje (irelevantní pro nás)
- Push notifications nefungují (irelevantní)
- Reálná GPS není (fake location OK pro test)

## Cesta B — Fyzický iPhone (free provisioning)

### 1. Připojit iPhone k Macu USB

- Odemkni iPhone
- Objeví se "Trust This Computer?" → **Trust**
- V Xcode → Window → Devices and Simulators → měl bys tam vidět svůj iPhone

### 2. Free Apple ID v Xcode

- Xcode → Settings → Accounts → **+** → Apple ID
- Přihlas se svým iCloud Apple ID (**bez $99 subscription**)
- Vidíš svůj team ("Tomáš Zemánek — Personal Team")

### 3. Prebuild iOS project

```bash
npx expo prebuild --platform ios
```

- Vygeneruje `ios/` folder s Xcode project
- Nastaví bundle ID `cz.slackline.ova` z `app.json`

### 4. Podepsat + spustit z Xcode

```bash
open ios/Slackline.Ova.xcworkspace
```

V Xcode:
1. Vlevo klikni na **Slackline.Ova** project (root)
2. Tab **Signing & Capabilities**
3. **Team** → vyber "Tomáš Zemánek (Personal Team)"
4. **Bundle Identifier** by měl být `cz.slackline.ova` — pokud kolizí (jiná apka), změň na `cz.slackline.ova.dev`
5. Nahoře vyber cílový device (tvůj iPhone) v selectoru
6. **Play button** (▶) nebo Cmd+R

První spuštění na iPhone:
- Apka se nainstaluje ale hlásí **"Untrusted Developer"**
- iPhone → Nastavení → General → VPN & Device Management → Developer App → **Trust "Tomáš Zemánek"**
- Znovu klikni na ikonu apky

### 5. Certificate expiry (7 dní)

Free provisioning cert vyprší za 7 dní. Když apka přestane fungovat:
```bash
open ios/Slackline.Ova.xcworkspace
# Xcode → Play button → rebuild + reinstall
```

## Očekávané iOS-specific problémy

### 1. `@react-native-ml-kit/translate-text` může padnout

Podle npm doc podporuje iOS, ale je to CocoaPods dependency. Pokud build padne s "Undefined symbols" nebo "TranslateText not found":

**Fix A** (jednoduchý): odstranit ML Kit z iOS builds
```bash
# V ios/Podfile najít:
# pod 'ReactNativeMLKitTranslateText'
# Zakomentovat nebo odstranit
```

**Fix B** (elegantní): vytvořit `src/i18n/translate.ios.ts` fallback (Metro použije `.ios.ts` na iOS):
```typescript
export type SupportedLang = 'en' | 'cs' | 'pl';
export class UnsupportedSourceLangError extends Error {
  constructor(public readonly sourceLang: string) {
    super(`iOS: translation not supported yet`);
    this.name = 'UnsupportedSourceLangError';
  }
}
export async function translateOnDevice(): Promise<never> {
  throw new UnsupportedSourceLangError('ios');
}
```

Řekni mi jestli build padne — připravím fix B.

### 2. Curve tab bar safe area

Curve tab bar respektuje `insets.bottom` (Home indicator na iPhone bez home button). Pokud vypadá blbě, zkontroluj:
- SlackCurveTabBar.tsx používá `useSafeAreaInsets()` ✅

### 3. Splash screen

iOS vyžaduje storyboard splash. Expo generuje automaticky z `app.json` splash config. Pokud po startu vidíš 2 sekundy bílá obrazovka, splash je OK.

### 4. Deep linking

Slackmap OAuth callback používá scheme `slacklineova://`. iOS musí být configured v `app.json` (`scheme: "slacklineova"` už tam je ✅).

## Co reportovat

Když spustíš iOS build, řekni:
1. Build **prošel** / **padl** + poslední ~20 řádků error logu
2. Apka **naběhne** / **crashe** hned po startu
3. **Curve tab bar** — vypadá OK?
4. **Mapa** — načte se? Markery viditelné?
5. **Bottom sheet** — drag funguje?
6. **Translation button** — funguje / hlásí error?

Já pak fixnu specifické iOS issues.

## Bonus: EAS Build cloud (později, pokud koupíš $99)

Až budeš mít Apple Developer $99, můžeš buildit v cloudu (bez potřeby Macu):
```bash
eas login   # tvůj Expo account
eas build --platform ios --profile preview
# EAS macOS runner → IPA → download → TestFlight upload
```

## Poznámky pro tebe

- **Windows dev, Mac test** pattern je běžný — vývoj kódu na Windows (VSCode/Cursor), jen `expo run:ios` na Macu
- Můžeš git-syncovat mezi Windows a Macem přes GitHub
- Metro dev server na Macu (`npx expo start`) může streamovat JS bundle na iOS device při dev builds — instant iterace
