import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { SettingsSheet } from '../components/SettingsSheet';

/**
 * Settings — full screen tab (v0.8.0).
 *
 * MVP wrapper: renderuje SettingsSheet permanentne s visible=true.
 * SettingsSheet je Modal-based popup — v tabu se zobrazi jako full-screen
 * overlay. Zavreni X v Modal je no-op (uzivatel navigate pres tab bar).
 *
 * v0.8.1 TODO: extract SettingsContent z SettingsSheet (podobne jako
 * ISASafetyContent) pro cistou tab implementaci bez Modal wrapperu.
 */
export default function SettingsScreen() {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.surface }}>
      {/* Modal permanentne otevreny — v tabu funguje jako plna obrazovka. */}
      <SettingsSheet visible={true} onClose={() => { /* no-op v tabu */ }} />
    </SafeAreaView>
  );
}
