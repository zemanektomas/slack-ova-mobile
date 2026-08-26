# v0.8.0 Bottom Tab Navigation — activation guide

Skeleton pro 5-tab bottom bar architekturu (Q1 = A ze sekce 13 v `doc/app-review/isa-cards-review.md`).

## Připravené screens (26.8.2026)

- ✅ `HomeScreen.tsx` — Lajny (existuje, používá se jako `app/index.tsx`)
- ✅ `GearScreen.tsx` — Vybavení tab, Level 1 placeholder
- ✅ `ReportsScreen.tsx` — Reporty tab, Level 1 placeholder
- ⏳ `IsaCompanionScreen.tsx` — extrahovat z existujícího `components/ISASafetySheet.tsx` (aktuálně popup ze Settings)
- ⏳ `SettingsScreen.tsx` — extrahovat z existujícího `components/SettingsSheet.tsx` (aktuálně popup z ozubeného kola v mapě)

## v0.8.0 aktivační kroky (až přijde čas)

### Krok 1 — Přepnout na tabs group

Vytvořit `src/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lajny',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map" size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="isa"
        options={{
          title: 'ISA',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="shield-check" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gear"
        options={{
          title: 'Vybavení',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bag-personal" size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reporty',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-text" size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Nastavení',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Krok 2 — Přesunout `app/index.tsx` do `(tabs)/index.tsx`

```bash
mv src/app/index.tsx src/app/(tabs)/index.tsx
```

Obsah zůstává (`<HomeScreen />`).

### Krok 3 — Vytvořit route wrappers

```tsx
// src/app/(tabs)/gear.tsx
import GearScreen from '../../screens/GearScreen';
export default function Gear() { return <GearScreen />; }

// src/app/(tabs)/reports.tsx
import ReportsScreen from '../../screens/ReportsScreen';
export default function Reports() { return <ReportsScreen />; }

// src/app/(tabs)/isa.tsx
import IsaCompanionScreen from '../../screens/IsaCompanionScreen';
export default function Isa() { return <IsaCompanionScreen />; }

// src/app/(tabs)/settings.tsx
import SettingsScreen from '../../screens/SettingsScreen';
export default function Settings() { return <SettingsScreen />; }
```

### Krok 4 — Upravit `app/_layout.tsx`

Změnit `<Stack.Screen name="index" ...>` na `<Stack.Screen name="(tabs)" ...>`.

### Krok 5 — Odstranit popup triggery

- V `HomeScreen.tsx` odstranit ozubené kolo (open SettingsSheet) — teď je Settings v tabu
- V `SettingsSheet.tsx` odstranit "ISA Safety Companion" button — teď je ISA v tabu
- `ISASafetySheet.tsx` a `SettingsSheet.tsx` (popup) můžou zůstat jako komponenty pro re-use, jen nejsou triggery

### Krok 6 — Cross-references (postupně dle Q5 = D)

**v0.8.0:** cross-ref 1 (Lajny → Reporty v InlineDetail), 2 (Reporty → Lajny), 4 (Vybavení ↔ Reporty)

**v0.8.1:** cross-ref 5 (ISA → Vybavení warnings)

**v0.8.2:** cross-ref 3 (filter kde mám report v mapě), 6 (contextové ISA odkazy v Reporty formuláři)

## Backward compatibility

Přepnutí na tabs = **major nav restructure**. Onboarding modal ("Novinky ve verzi 0.8.0") by měl:
- Vysvětlit 5 nových tabů
- Ukázat kam přesuny Nastavení a ISA (dřív popupy, teď taby)
- Být zobrazen jen jednou (marker v AsyncStorage `onboarding_v080_seen`)

## Zdroje

- **Sekce 12** v `doc/app-review/isa-cards-review.md` — plný design 2 nových tabů
- **Sekce 13** — 11 finalizovaných rozhodnutí (Q1 = 5 tabů)
- **Sekce 14** — ASCII wireframes všech screenů
