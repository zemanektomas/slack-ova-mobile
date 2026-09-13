/**
 * Kalkulátory tab — v0.8.0.
 *
 * Full-screen index 6 kalkulátorů. Tap na řádek otevře konkrétní kalkulátor
 * v CalculatorsSheet modalu (stejná komponenta jako z ISA Companion cards).
 */

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFontStore } from '../store/fontStore';
import { CalculatorsSheet, CalculatorType } from '../components/calculators/CalculatorsSheet';

interface CalcItem {
  type: CalculatorType;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  titleKey: string;
  hintKey: string;
}

const ITEMS: CalcItem[] = [
  { type: 'angle',       icon: 'angle-acute',       titleKey: 'cards.calculatorsHub.angleTitle',      hintKey: 'cards.calculatorsHub.angleHint' },
  { type: 'force',       icon: 'lightning-bolt',    titleKey: 'cards.calculatorsHub.forceTitle',      hintKey: 'cards.calculatorsHub.forceHint' },
  { type: 'sagTension',  icon: 'chart-bell-curve',  titleKey: 'cards.calculatorsHub.sagTitle',        hintKey: 'cards.calculatorsHub.sagHint' },
  { type: 'tapeSpacing', icon: 'tape-measure',      titleKey: 'cards.calculatorsHub.tapeTitle',       hintKey: 'cards.calculatorsHub.tapeHint' },
  { type: 'ma',          icon: 'cog-outline',       titleKey: 'cards.calculatorsHub.maTitle',         hintKey: 'cards.calculatorsHub.maHint' },
  { type: 'deviation',   icon: 'call-split',        titleKey: 'cards.calculatorsHub.deviationTitle',  hintKey: 'cards.calculatorsHub.deviationHint' },
];

export default function CalculatorsScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  const [calcType, setCalcType] = useState<CalculatorType | null>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <MaterialCommunityIcons name="calculator-variant" size={22} color={t.text} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text }]}>{tr('tabs.calculators')}</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {tr('cards.calculatorsHub.summary')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.type}
            onPress={() => setCalcType(item.type)}
            style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <MaterialCommunityIcons name={item.icon} size={26} color={t.accent} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: t.text }]}>{tr(item.titleKey)}</Text>
              <Text style={[styles.rowHint, { color: t.textMuted }]}>{tr(item.hintKey)}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={t.textMuted} />
          </Pressable>
        ))}
      </ScrollView>

      <CalculatorsSheet
        visible={calcType !== null}
        type={calcType}
        onClose={() => setCalcType(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (fs: number) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: 18 * fs, fontWeight: '600' },
    subtitle: { fontSize: 12 * fs, marginTop: 2 },
    scroll: { padding: 16, gap: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    rowTitle: { fontSize: 15 * fs, fontWeight: '600' },
    rowHint: { fontSize: 12 * fs, marginTop: 3, lineHeight: 16 * fs },
  });
