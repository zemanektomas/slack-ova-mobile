import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';

/**
 * v0.8.0 bottom tab bar — 5 tabu (sekce 13.1).
 * Layout: Lajny / ISA / Vybaveni / Reporty / Nastaveni.
 *
 * Vybaveni + Reporty jsou placeholder screens v v0.8.0 (SQLite schema v7
 * pripraveno, CRUD prijde v v0.8.0.x). ISA a Nastaveni jsou plnohodnotne
 * s obsahem prevzatym z drivejsich popup Sheetu.
 */
export default function TabsLayout() {
  const { t: tr } = useTranslation();
  const t = useTheme();

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
        name="gear"
        options={{
          title: tr('tabs.gear'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bag-personal" size={size} color={color} />
          ),
          headerShown: false,
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
