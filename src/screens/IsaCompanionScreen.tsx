import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { ISASafetyContent } from '../components/ISASafetySheet';

/**
 * ISA Safety Companion — full screen tab (v0.8.0).
 *
 * Nahrazuje popup ISASafetySheet co se driv otevirala z Settings.
 * Sdili obsah (ISASafetyContent) s puvodni popup verzi — jen bez Modal
 * wrapperu a s header baru misto backdrop close X.
 *
 * v0.8.0: karty grupovane do 10 kategorii (top-down hierarchie).
 */
export default function IsaCompanionScreen() {
  const { t: tr } = useTranslation();
  const t = useTheme();
  const s = styles(t);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>{tr('isaSafety.title')}</Text>
        <Text style={s.subtitle}>{tr('isaSafety.subtitle')}</Text>
      </View>
      <ISASafetyContent />
    </SafeAreaView>
  );
}

const styles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.surface,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: t.text,
    },
    subtitle: {
      fontSize: 13,
      color: t.textMuted,
      marginTop: 2,
    },
  });
