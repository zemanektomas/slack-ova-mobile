/**
 * Tape Spacing Generator — v0.8.0 (Q3 refactor).
 *
 * Generuje plán tejpování pro backup line support points podle:
 * - Balance Community tabulky spacing per délka
 * - Anti-harmonic randomizace (no adjacent duplicates)
 * - Hustší konce (friction / abrasion)
 * - Trick zone kolem středu jen pro trick line
 * - Spoj = natural node damper (žádný cluster kolem, TZ insight 13.9.2026)
 *
 * Input: délka + typ použití + volitelně spoj uprostřed
 * Output: seznam rozteček + statistika + export přes Share Sheet
 */

import { useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useFontStore } from '../../store/fontStore';
import {
  generateTapePlan,
  formatTapePlan,
  LineType,
  TapePlan,
} from '../../data/isa/calculators';
import {
  CalcSlider,
  CalcInput,
  CalcSection,
  CalcLabel,
  CalcNote,
  ChipPicker,
  shared as sh,
} from './shared';
import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TapeSpacingCalculatorProps {
  /** Prefill z detailu lajny */
  initialLengthM?: number;
  initialType?: LineType;
}

export function TapeSpacingCalculator({
  initialLengthM,
  initialType,
}: TapeSpacingCalculatorProps = {}) {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [lengthText, setLengthText] = useState(String(initialLengthM ?? 100));
  const [type, setType] = useState<LineType>(initialType ?? 'walking');
  const [hasJoin, setHasJoin] = useState(false);
  const [seed, setSeed] = useState<number>(() => Date.now());

  const lengthM = parseFloat(lengthText.replace(',', '.')) || 0;
  const plan = useMemo<TapePlan | null>(() => {
    if (lengthM < 5 || lengthM > 500) return null;
    return generateTapePlan(lengthM, type, hasJoin, seed);
  }, [lengthM, type, hasJoin, seed]);

  const handleRegenerate = () => setSeed(Date.now());

  const handleExport = async () => {
    if (!plan) return;
    const header = tr('calc.tapeSpacing.exportHeader', {
      length: lengthM,
      type: tr(`calc.tapeSpacing.chip.${type}`),
      join: hasJoin ? tr('calc.tapeSpacing.withJoin') : tr('calc.tapeSpacing.withoutJoin'),
    });
    const body = formatTapePlan(plan);
    const stats = tr('calc.tapeSpacing.exportStats', {
      points: plan.totalTapePoints,
      tapeM: plan.totalTapeM.toFixed(1),
      min: plan.bcRange.min.toFixed(1),
      max: plan.bcRange.max.toFixed(1),
    });
    try {
      await Share.share({
        message: `${header}\n\n${body}\n\n${stats}`,
      });
    } catch (err) {
      Alert.alert(tr('calc.tapeSpacing.exportFailed'), String(err));
    }
  };

  const typeChips: { key: LineType; label: string }[] = [
    { key: 'walking', label: tr('calc.tapeSpacing.chip.walking') },
    { key: 'trick', label: tr('calc.tapeSpacing.chip.trick') },
    { key: 'longline', label: tr('calc.tapeSpacing.chip.longline') },
    { key: 'rodeo', label: tr('calc.tapeSpacing.chip.rodeo') },
  ];

  return (
    <View>
      {/* Délka */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.tapeSpacing.lengthLabel')}</CalcLabel>
        <CalcInput
          value={lengthText}
          onChangeText={setLengthText}
          suffix="m"
          placeholder="100"
          theme={t}
        />
      </CalcSection>

      {/* Typ */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.tapeSpacing.typeLabel')}</CalcLabel>
        <ChipPicker
          options={typeChips}
          value={type}
          onSelect={setType}
          theme={t}
        />
      </CalcSection>

      {/* Spoj uprostřed */}
      <CalcSection>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: t.text }]}>
              {tr('calc.tapeSpacing.joinLabel')}
            </Text>
            <Text style={[styles.switchHint, { color: t.textMuted }]}>
              {tr('calc.tapeSpacing.joinHint')}
            </Text>
          </View>
          <Switch value={hasJoin} onValueChange={setHasJoin} />
        </View>
      </CalcSection>

      {/* Rozsah + statistika */}
      {plan && (
        <CalcSection>
          <View style={[styles.summaryBox, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
            <Text style={[styles.summaryTitle, { color: t.text }]}>
              {tr('calc.tapeSpacing.summaryTitle')}
            </Text>
            <Text style={[styles.summaryLine, { color: t.textMuted }]}>
              {tr('calc.tapeSpacing.summaryRange', {
                min: plan.bcRange.min.toFixed(1),
                max: plan.bcRange.max.toFixed(1),
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

      {/* Sekvence rozteček */}
      {plan && (
        <CalcSection>
          <CalcLabel theme={t}>{tr('calc.tapeSpacing.sequenceLabel')}</CalcLabel>
          <View style={[styles.sequenceBox, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.sequenceText, { color: t.text }]}>
              {formatTapePlan(plan)}
            </Text>
          </View>
        </CalcSection>
      )}

      {/* Action buttons */}
      {plan && (
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
      )}

      {!plan && (
        <Text style={[styles.errorText, { color: t.textDim }]}>
          {tr('calc.tapeSpacing.invalidLength')}
        </Text>
      )}

      <CalcNote theme={t}>{tr('calc.tapeSpacing.principle')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.tapeSpacing.spoNote')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.tapeSpacing.source')}</CalcNote>
    </View>
  );
}

const makeStyles = (fs: number) => StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: { fontSize: 14 * fs, fontWeight: '500' },
  switchHint: { fontSize: 12 * fs, marginTop: 2 },
  summaryBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 13 * fs,
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryLine: {
    fontSize: 12 * fs,
    marginTop: 2,
    lineHeight: 16 * fs,
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
    marginBottom: 12,
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
  errorText: {
    fontSize: 12 * fs,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
});
