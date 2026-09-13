import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDevModeStore } from '../../store/devModeStore';

/**
 * v0.8.0 bottom tab bar — 6 tabu.
 * Layout: Lajny / ISA / Kalkulatory / Vybaveni / Reporty / Nastaveni.
 *
 * Kalkulatory (v0.8.0 Q3): full-screen index 6 kalkulatoru (Anchor angle,
 * Peak force, Sag tension, Tape spacing, MA, Deviation).
 * Vybaveni + Reporty jsou placeholder screens v v0.8.0 (SQLite schema v7
 * pripraveno, CRUD prijde v v0.8.0.x). ISA a Nastaveni jsou plnohodnotne
 * s obsahem prevzatym z drivejsich popup Sheetu.
 */
export default function TabsLayout() {
  const { t: tr } = useTranslation();
  const t = useTheme();
  // v0.7.29 — Vybaveni + Reporty (WIP placeholders) gated za Dev Mode.
  // Az budou plne funkcni (v0.8.0 / v0.8.2), gate odstranime.
  const devMode = useDevModeStore((s) => s.devMode);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
        },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textDim,
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        headerTitleStyle: { color: t.text },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tr('tabs.lines'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="isa"
        options={{
          title: tr('tabs.isa'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="shield-check" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="calculators"
        options={{
          title: tr('tabs.calculators'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calculator-variant" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="gear"
        options={{
          title: tr('tabs.gear'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bag-personal" size={size} color={color} />
          ),
          headerShown: false,
          // v0.7.29 — schovat pokud Dev Mode OFF (WIP placeholder, ceka na v0.8.0)
          href: devMode ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: tr('tabs.reports'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-text" size={size} color={color} />
          ),
          headerShown: false,
          // v0.7.29 — schovat pokud Dev Mode OFF (WIP placeholder, ceka na v0.8.2)
          href: devMode ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: tr('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
