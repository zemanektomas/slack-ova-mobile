/**
 * MA Calculator — F5 v0.7.4.
 * Mechanical advantage compound pulley + Buckingham reference.
 */

import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useFontStore } from '../../store/fontStore';
import {
  BUCKINGHAM_CONFIGS,
  MA_REFERENCE_TABLE,
  calculateMA,
} from '../../data/isa/calculators';
import {
  CalcSlider,
  CalcInput,
  CalcSection,
  CalcLabel,
  ResultBig,
  CalcNote,
  shared as sh,
} from './shared';

export function MACalculator() {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [movable, setMovable] = useState(3);
  const [fixed, setFixed] = useState(0);
  const [pullText, setPullText] = useState('60');

  const pullKg = parseFloat(pullText.replace(',', '.')) || 0;
  const pullKn = pullKg * 9.81 / 1000;
  const ma = calculateMA(movable, fixed);
  const outputKn = pullKn * ma.realMA;

  const sweetSpot = movable >= 3 && movable <= 4;

  return (
    <View>
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.ma.movable')}</CalcLabel>
        <CalcSlider value={movable} min={1} max={5} step={1} onValueChange={setMovable} suffix="" theme={t} />
      </CalcSection>

      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.ma.fixed')}</CalcLabel>
        <CalcSlider value={fixed} min={0} max={3} step={1} onValueChange={setFixed} suffix="" theme={t} />
      </CalcSection>

      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.ma.pull')}</CalcLabel>
        <CalcInput value={pullText} onChangeText={setPullText} suffix="kg" placeholder="60" theme={t} />
      </CalcSection>

      <CalcSection>
        <ResultBig
          label={tr('calc.ma.theoretical')}
          value={ma.theoreticalMA.toString()}
          suffix=":1"
          theme={t}
        />
        <View style={{ height: 8 }} />
        <ResultBig
          label={tr('calc.ma.real')}
          value={ma.realMA.toFixed(1)}
          suffix={`:1 (${(ma.efficiency * 100).toFixed(0)}%)`}
          theme={t}
        />
        <View style={{ height: 8 }} />
        <ResultBig
          label={tr('calc.ma.output')}
          value={outputKn.toFixed(1)}
          suffix={`kN (${(outputKn * 100).toFixed(0)} kg)`}
          theme={t}
        />
        <View style={{ height: 8 }} />
        <ResultBig
          label={tr('calc.ma.pullDistance')}
          value={ma.pullDistanceRatio.toString()}
          suffix={tr('calc.ma.pullDistanceUnit')}
          theme={t}
        />
        {sweetSpot && (
          <Text style={[styles.hint, { color: '#22c55e' }]}>
            ✅ {tr('calc.ma.sweetSpot')}
          </Text>
        )}
        {movable >= 5 && (
          <Text style={[styles.hint, { color: '#ef4444' }]}>
            ⚠ {tr('calc.ma.tooMuch')}
          </Text>
        )}
      </CalcSection>

      {/* Reference table */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.ma.tableLabel')}</CalcLabel>
        <View style={[styles.table, { borderColor: t.border }]}>
          <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: t.border }]}>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.ma.col.movable')}</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.ma.col.theory')}</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.ma.col.real')}</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.ma.col.pullDist')}</Text>
          </View>
          {MA_REFERENCE_TABLE.map((n, idx) => {
            const m = calculateMA(n, 0);
            return (
              <View
                key={n}
                style={[
                  styles.tableRow,
                  { borderBottomColor: t.border },
                  idx === MA_REFERENCE_TABLE.length - 1 && { borderBottomWidth: 0 },
                  n === movable && { backgroundColor: t.surfaceAlt },
                ]}
              >
                <Text style={[styles.cell, { color: t.text }]}>{n}</Text>
                <Text style={[styles.cell, { color: t.text }]}>{m.theoreticalMA}:1</Text>
                <Text style={[styles.cell, { color: t.text }]}>{m.realMA.toFixed(1)}:1</Text>
                <Text style={[styles.cell, { color: t.text }]}>{m.pullDistanceRatio} m</Text>
              </View>
            );
          })}
        </View>
      </CalcSection>

      {/* Buckingham reference */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.ma.buckingham')}</CalcLabel>
        {BUCKINGHAM_CONFIGS.map((cfg) => (
          <View
            key={cfg.name}
            style={[styles.buckRow, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}
          >
            <Text style={[styles.buckName, { color: t.text }]}>{cfg.name}</Text>
            <Text style={[styles.buckMax, { color: t.accent }]}>max {cfg.maxTensionKn} kN</Text>
          </View>
        ))}
      </CalcSection>

      <CalcNote theme={t}>{tr('calc.ma.formula')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.ma.source')}</CalcNote>
    </View>
  );
}

const makeStyles = (fs: number) => StyleSheet.create({
  hint: { fontSize: 12 * fs, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  table: {
    borderWidth: 1,
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHead: { borderBottomWidth: 1.5 },
  cell: { flex: 1, fontSize: 12 * fs },
  cellHead: { flex: 1, fontSize: 12 * fs, fontWeight: '600' },
  buckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 6,
  },
  buckName: { fontSize: 13 * fs, fontWeight: '500' },
  buckMax: { fontSize: 12 * fs, fontWeight: '600' },
});
