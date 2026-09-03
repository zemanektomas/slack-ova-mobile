/**
 * Anchor Angle Calculator — F5 v0.7.4.
 *
 * Vstup: total load (kN) + angle (°)
 * Výstup: síla na jednu nohu kotvy + barevný rating
 */

import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useFontStore } from '../../store/fontStore';
import {
  ANGLE_REFERENCE_TABLE,
  anchorPerLegForce,
  rateAngle,
} from '../../data/isa/calculators';
import {
  CalcSlider,
  CalcInput,
  CalcSection,
  CalcLabel,
  ResultBig,
  CalcNote,
  RATING_COLORS,
  shared as sh,
} from './shared';

export function AnchorAngleCalculator() {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [loadText, setLoadText] = useState('5');
  const [angle, setAngle] = useState(60);

  const load = parseFloat(loadText.replace(',', '.')) || 0;
  const perLeg = anchorPerLegForce(load, angle);
  const rating = rateAngle(angle);

  return (
    <View>
      {/* Input: total load */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.angle.totalLoad')}</CalcLabel>
        <CalcInput
          value={loadText}
          onChangeText={setLoadText}
          suffix="kN"
          placeholder="5.0"
          theme={t}
        />
      </CalcSection>

      {/* Input: angle */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.angle.angleLabel')}</CalcLabel>
        <CalcSlider
          value={angle}
          min={0}
          max={170}
          step={5}
          suffix="°"
          onValueChange={setAngle}
          theme={t}
        />
      </CalcSection>

      {/* Result */}
      <CalcSection>
        <ResultBig
          label={tr('calc.angle.perLegLabel')}
          value={isFinite(perLeg) ? perLeg.toFixed(2) : '∞'}
          suffix="kN"
          color={RATING_COLORS[rating]}
          theme={t}
        />
        <Text style={[styles.rating, { color: RATING_COLORS[rating] }]}>
          {tr(`calc.angle.rating.${rating}`)}
        </Text>
      </CalcSection>

      {/* Reference table */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.angle.tableLabel')}</CalcLabel>
        <View style={[styles.table, { borderColor: t.border }]}>
          <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: t.border }]}>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.angle.col.angle')}</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.angle.col.perLeg')}</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.angle.col.rating')}</Text>
          </View>
          {ANGLE_REFERENCE_TABLE.map((a, idx) => {
            const f = anchorPerLegForce(load, a);
            const r = rateAngle(a);
            return (
              <View
                key={a}
                style={[
                  styles.tableRow,
                  { borderBottomColor: t.border },
                  idx === ANGLE_REFERENCE_TABLE.length - 1 && { borderBottomWidth: 0 },
                  a === Math.round(angle / 5) * 5 && { backgroundColor: t.surfaceAlt },
                ]}
              >
                <Text style={[styles.cell, { color: t.text }]}>{a}°</Text>
                <Text style={[styles.cell, { color: t.text }]}>
                  {isFinite(f) ? f.toFixed(2) : '∞'} kN
                </Text>
                <Text style={[styles.cell, { color: RATING_COLORS[r], fontWeight: '600' }]}>
                  {tr(`calc.angle.rating.${r}`)}
                </Text>
              </View>
            );
          })}
        </View>
      </CalcSection>

      <CalcNote theme={t}>{tr('calc.angle.formula')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.angle.source')}</CalcNote>
    </View>
  );
}

const makeStyles = (fs: number) => StyleSheet.create({
  rating: {
    fontSize: 13 * fs,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
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
});
