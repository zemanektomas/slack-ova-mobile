/**
 * Deviation Calculator — F5 v0.7.4.
 * F = 2 × T × sin(θ/2) — síla na deviaci (redirect pulley).
 */

import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useFontStore } from '../../store/fontStore';
import {
  DEVIATION_ANGLE_TABLE,
  deviationForce,
} from '../../data/isa/calculators';
import {
  CalcSlider,
  CalcInput,
  CalcSection,
  CalcLabel,
  ResultBig,
  CalcNote,
} from './shared';

export function DeviationCalculator() {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [tensionText, setTensionText] = useState('8.0');
  const [angle, setAngle] = useState(90);

  const tension = parseFloat(tensionText.replace(',', '.')) || 0;
  const force = deviationForce(tension, angle);
  const ratio = tension > 0 ? force / tension : 0;

  return (
    <View>
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.deviation.tension')}</CalcLabel>
        <CalcInput
          value={tensionText}
          onChangeText={setTensionText}
          suffix="kN"
          placeholder="8.0"
          theme={t}
        />
      </CalcSection>

      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.deviation.angle')}</CalcLabel>
        <CalcSlider
          value={angle}
          min={0}
          max={180}
          step={5}
          suffix="°"
          onValueChange={setAngle}
          theme={t}
        />
      </CalcSection>

      <CalcSection>
        <ResultBig
          label={tr('calc.deviation.forceLabel')}
          value={force.toFixed(2)}
          suffix={`kN  (${ratio.toFixed(2)}× T)`}
          theme={t}
        />
      </CalcSection>

      {/* Reference table */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.deviation.tableLabel')}</CalcLabel>
        <View style={[styles.table, { borderColor: t.border }]}>
          <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: t.border }]}>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.deviation.col.angle')}</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.deviation.col.force')}</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.deviation.col.ratio')}</Text>
          </View>
          {DEVIATION_ANGLE_TABLE.map((a, idx) => {
            const f = deviationForce(tension, a);
            const r = tension > 0 ? f / tension : 0;
            return (
              <View
                key={a}
                style={[
                  styles.tableRow,
                  { borderBottomColor: t.border },
                  idx === DEVIATION_ANGLE_TABLE.length - 1 && { borderBottomWidth: 0 },
                  Math.abs(a - Math.round(angle / 5) * 5) < 5 && { backgroundColor: t.surfaceAlt },
                ]}
              >
                <Text style={[styles.cell, { color: t.text }]}>{a}°</Text>
                <Text style={[styles.cell, { color: t.text }]}>{f.toFixed(2)} kN</Text>
                <Text style={[styles.cell, { color: t.text }]}>{r.toFixed(2)}×</Text>
              </View>
            );
          })}
        </View>
      </CalcSection>

      <CalcNote theme={t}>{tr('calc.deviation.warning')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.deviation.formula')}</CalcNote>
    </View>
  );
}

const makeStyles = (fs: number) => StyleSheet.create({
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
