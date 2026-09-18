import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SlackCurveTabBar } from '../../components/SlackCurveTabBar';
import { useTheme } from '../../theme';

/**
 * v0.8.0-alpha4 — Slackline curve tab bar.
 *
 * Custom tabBar renderer replaces the standard rectangular bottom bar.
 * The curve rises on the right side into a "raised" Settings pill —
 * design metaphor: the tab bar IS a rigged slackline. Bottom row holds
 * the 6 primary tabs (Lines / ISA / Calculators / Gear / Reports / Training),
 * Settings hangs from the right anchor above the curve.
 *
 * Screen titles here still power the labels rendered by SlackCurveTabBar.
 * Icons come from SlackCurveTabBar's own PRIMARY_TABS map (kept in sync).
 */
export default function TabsLayout() {
  const { t: tr } = useTranslation();
  const t = useTheme();

  return (
    <Tabs
      tabBar={(props) => <SlackCurveTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        headerTitleStyle: { color: t.text },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr('tabs.lines'), headerShown: false }} />
      <Tabs.Screen name="isa" options={{ title: tr('tabs.isa'), headerShown: false }} />
      <Tabs.Screen name="calculators" options={{ title: tr('tabs.calculators'), headerShown: false }} />
      <Tabs.Screen name="gear" options={{ title: tr('tabs.gear'), headerShown: false }} />
      <Tabs.Screen name="reports" options={{ title: tr('tabs.reports'), headerShown: false }} />
      <Tabs.Screen name="training" options={{ title: tr('tabs.training'), headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: tr('tabs.settings'), headerShown: false }} />
    </Tabs>
  );
}
