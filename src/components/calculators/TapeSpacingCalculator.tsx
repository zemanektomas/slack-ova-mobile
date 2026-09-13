/**
 * Tape Spacing Generator — v0.8.0.
 *
 * Slider pro délku → plán se generuje live. Chip typ (walking / trick).
 * Pod plánem referenční tabulka rozsahů rozteček per délka (BC tabulka).
 *
 * Zdroj: Balance Community + TZ spoj-as-node insight (13.9.2026).
 * Longline / rodeo se netejpuje (single line, žádný backup).
 */

import { useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useFontStore } from '../../store/fontStore';
import {
  bcSpacingRange,
  generateTapePlan,
  formatTapePlan,
  LineType,
  TapePlan,
} from '../../data/isa/calculators';
import {
  CalcSlider,
  CalcSection,
  CalcLabel,
  CalcNote,
  ChipPicker,
} from './shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TapeSpacingCalculatorProps {
  initialLengthM?: number;
  initialType?: LineType;
}

/** Balance Community tabulka rozsahů rozteček dle délky lajny. */
const BC_REFERENCE_TABLE: Array<{ lengthMax: number; labelKey: string; range: string }> = [
  { lengthMax: 20,  labelKey: '5–20 m',    range: '1–2 m' },
  { lengthMax: 50,  labelKey: '20–50 m',   range: '1,5–3 m' },
  { lengthMax: 100, labelKey: '50–100 m',  range: '2–5 m' },
  { lengthMax: 200, labelKey: '100–200 m', range: '3–6 m' },
  { lengthMax: 999, labelKey: '200+ m',    range: '3–7 m' },
];

/** Vrátí index řádku v tabulce dle délky. */
function bcTableIndex(lengthM: number): number {
  for (let i = 0; i < BC_REFERENCE_TABLE.length; i++) {
    if (lengthM <= BC_REFERENCE_TABLE[i].lengthMax) return i;
  }
  return BC_REFERENCE_TABLE.length - 1;
}

export function TapeSpacingCalculator({
  initialLengthM,
  initialType,
}: TapeSpacingCalculatorProps = {}) {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  const t = useTheme();
  const { t: tr } = useTranslation();

  // Slider 5-200m step 5 pokrývá 99% případů. Pro delší lajny slider dojde na max
  // a uživatel má v referenční tabulce jasné doporučení pro 200+.
  const [lengthM, setLengthM] = useState(initialLengthM ?? 100);
  const [type, setType] = useState<LineType>(initialType ?? 'walking');
  const [seed, setSeed] = useState<number>(() => Date.now());

  const plan = useMemo<TapePlan | null>(
    () => generateTapePlan(lengthM, type, false, seed),
    [lengthM, type, seed],
  );

  const activeTableIdx = bcTableIndex(lengthM);
  const currentRange = bcSpacingRange(lengthM);

  const handleRegenerate = () => setSeed(Date.now());

  const handleExport = async () => {
    if (!plan) return;
    const header = tr('calc.tapeSpacing.exportHeader', {
      length: lengthM,
      type: tr(`calc.tapeSpacing.chip.${type}`),
    });
    const body = formatTapePlan(plan);
    const stats = tr('calc.tapeSpacing.exportStats', {
      points: plan.totalTapePoints,
      tapeM: plan.totalTapeM.toFixed(1),
      min: plan.bcRange.min.toFixed(1),
      max: plan.bcRange.max.toFixed(1),
    });
    try {
      await Share.share({ message: `${header}\n\n${body}\n\n${stats}` });
    } catch (err) {
      Alert.alert(tr('calc.tapeSpacing.exportFailed'), String(err));
    }
  };

  const typeChips: { key: LineType; label: string }[] = [
    { key: 'walking', label: tr('calc.tapeSpacing.chip.walking') },
    { key: 'trick', label: tr('calc.tapeSpacing.chip.trick') },
  ];

  return (
    <View>
      {/* Délka — slider */}
      <CalcSection>
        <CalcLabel theme={t}>
          {tr('calc.tapeSpacing.lengthLabel')} ({lengthM} m)
        </CalcLabel>
        <CalcSlider
          value={lengthM}
          min={5}
          max={200}
          step={5}
          suffix=" m"
          onValueChange={setLengthM}
          theme={t}
        />
      </CalcSection>

      {/* Typ */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.tapeSpacing.typeLabel')}</CalcLabel>
        <ChipPicker options={typeChips} value={type} onSelect={setType} theme={t} />
      </CalcSection>

      {/* Aktuální rozsah + počty */}
      {plan && (
        <CalcSection>
          <View style={[styles.summaryBox, { backgroundColor: t.surfaceAlt, borderColor: t.accent }]}>
            <Text style={[styles.summaryLine, { color: t.text }]}>
              {tr('calc.tapeSpacing.summaryRange', {
                min: currentRange.min.toFixed(1),
                max: currentRange.max.toFixed(1),
              })}
            </Text>
            <Text style={[styles.summaryLine, { color: t.textMuted }]}>
              {tr('calc.tapeSpacing.summaryPoints', {
                points: plan.totalTapePoints,
                tapeM: plan.totalTapeM.toFixed(1),
              })}
            </Text>
          </View>
        </CalcSection>
      )}

      {/* Vygenerovaná sekvence rozteček */}
      {plan && (
        <CalcSection>
          <CalcLabel theme={t}>{tr('calc.tapeSpacing.sequenceLabel')}</CalcLabel>
          <View style={[styles.sequenceBox, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.sequenceText, { color: t.text }]}>
              {formatTapePlan(plan)}
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={handleRegenerate}
              style={[styles.actionBtn, { borderColor: t.accent, backgroundColor: t.surface }]}
            >
              <MaterialCommunityIcons name="refresh" size={16} color={t.accent} />
              <Text style={[styles.actionBtnText, { color: t.accent }]}>
                {tr('calc.tapeSpacing.regenerate')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleExport}
              style={[styles.actionBtn, { borderColor: t.accent, backgroundColor: t.accent }]}
            >
              <MaterialCommunityIcons name="share-variant" size={16} color={t.accentOn} />
              <Text style={[styles.actionBtnText, { color: t.accentOn }]}>
                {tr('calc.tapeSpacing.share')}
              </Text>
            </Pressable>
          </View>
        </CalcSection>
      )}

      {/* Referenční tabulka — BC rozsahy per délka */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.tapeSpacing.tableLabel')}</CalcLabel>
        <View style={[styles.table, { borderColor: t.border }]}>
          <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: t.border }]}>
            <Text style={[styles.cellHead, { color: t.text }]}>
              {tr('calc.tapeSpacing.col.length')}
            </Text>
            <Text style={[styles.cellHead, { color: t.text }]}>
              {tr('calc.tapeSpacing.col.spacing')}
            </Text>
          </View>
          {BC_REFERENCE_TABLE.map((row, idx) => (
            <View
              key={row.labelKey}
              style={[
                styles.tableRow,
                { borderBottomColor: t.border },
                idx === BC_REFERENCE_TABLE.length - 1 && { borderBottomWidth: 0 },
                idx === activeTableIdx && { backgroundColor: t.surfaceAlt },
              ]}
            >
              <Text style={[styles.cell, { color: t.text, fontWeight: idx === activeTableIdx ? '700' : '400' }]}>
                {row.labelKey}
              </Text>
              <Text style={[styles.cell, { color: t.text, fontWeight: idx === activeTableIdx ? '700' : '400' }]}>
                {row.range}
              </Text>
            </View>
          ))}
        </View>
      </CalcSection>

      <CalcNote theme={t}>{tr('calc.tapeSpacing.principle')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.tapeSpacing.spoNote')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.tapeSpacing.source')}</CalcNote>
    </View>
  );
}

const makeStyles = (fs: number) =>
  StyleSheet.create({
    summaryBox: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1.5,
    },
    summaryLine: {
      fontSize: 13 * fs,
      lineHeight: 18 * fs,
      marginTop: 2,
    },
    sequenceBox: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 4,
    },
    sequenceText: {
      fontSize: 13 * fs,
      lineHeight: 20 * fs,
      fontFamily: 'monospace',
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      gap: 6,
    },
    actionBtnText: { fontSize: 13 * fs, fontWeight: '500' },
    table: {
      borderWidth: 1,
      borderRadius: 8,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    tableHead: { borderBottomWidth: 1.5 },
    cell: { flex: 1, fontSize: 13 * fs },
    cellHead: { flex: 1, fontSize: 12 * fs, fontWeight: '600' },
  });
