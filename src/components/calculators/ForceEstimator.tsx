/**
 * Force Estimator — F5 v0.7.4.
 * Peak force při pádu podle materiálu + délky + working tension.
 * Data: Jörren 2015 SlackLab.
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import {
  WebbingMaterial,
  estimateForce,
  LENGTH_REFERENCE_TABLE,
  PEAK_RATIO_20M,
} from '../../data/isa/calculators';
import {
  CalcInput,
  CalcSection,
  CalcLabel,
  ChipPicker,
  ResultBig,
  CalcNote,
  shared as sh,
} from './shared';

export function ForceEstimator() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [material, setMaterial] = useState<WebbingMaterial>('PA');
  const [lengthText, setLengthText] = useState('50');
  const [workingText, setWorkingText] = useState('2.0');

  const length = parseFloat(lengthText.replace(',', '.')) || 20;
  const working = parseFloat(workingText.replace(',', '.')) || 0;
  const est = estimateForce(material, length, working);

  const materialOptions = [
    { key: 'PA' as WebbingMaterial, label: 'PA nylon' },
    { key: 'PES' as WebbingMaterial, label: 'PES' },
    { key: 'HMPE' as WebbingMaterial, label: 'UHMWPE' },
  ];

  const anchorColor = est.vsWorkingLimit > 100 ? '#ef4444' : est.vsWorkingLimit > 70 ? '#f59e0b' : '#22c55e';
  const leashColor = est.vsBackupfallLimit > 100 ? '#ef4444' : est.vsBackupfallLimit > 70 ? '#f59e0b' : '#22c55e';

  return (
    <View>
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.force.material')}</CalcLabel>
        <ChipPicker options={materialOptions} value={material} onSelect={setMaterial} theme={t} />
      </CalcSection>

      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.force.length')}</CalcLabel>
        <CalcInput value={lengthText} onChangeText={setLengthText} suffix="m" placeholder="50" theme={t} />
      </CalcSection>

      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.force.working')}</CalcLabel>
        <CalcInput value={workingText} onChangeText={setWorkingText} suffix="kN" placeholder="2.0" theme={t} />
      </CalcSection>

      <CalcSection>
        <ResultBig
          label={tr('calc.force.anchorPeak')}
          value={est.anchorPeakKn.toFixed(1)}
          suffix={`kN  (${est.vsWorkingLimit.toFixed(0)}% z 12 kN)`}
          color={anchorColor}
          theme={t}
        />
        <View style={{ height: 8 }} />
        <ResultBig
          label={tr('calc.force.leashPeak')}
          value={est.leashPeakKn.toFixed(1)}
          suffix={`kN  (${est.vsBackupfallLimit.toFixed(0)}% z 8 kN)`}
          color={leashColor}
          theme={t}
        />
      </CalcSection>

      {/* Reference table */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.force.tableLabel')}</CalcLabel>
        <View style={[styles.table, { borderColor: t.border }]}>
          <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: t.border }]}>
            <Text style={[styles.cellHead, { color: t.text }]}>{tr('calc.force.col.length')}</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>PA</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>PES</Text>
            <Text style={[styles.cellHead, { color: t.text }]}>UHMWPE</Text>
          </View>
          {LENGTH_REFERENCE_TABLE.map((L, idx) => {
            const eA = estimateForce('PA', L, working);
            const eB = estimateForce('PES', L, working);
            const eC = estimateForce('HMPE', L, working);
            return (
              <View
                key={L}
                style={[
                  styles.tableRow,
                  { borderBottomColor: t.border },
                  idx === LENGTH_REFERENCE_TABLE.length - 1 && { borderBottomWidth: 0 },
                  Math.abs(L - length) < 5 && { backgroundColor: t.surfaceAlt },
                ]}
              >
                <Text style={[styles.cell, { color: t.text }]}>{L} m</Text>
                <Text style={[styles.cell, { color: t.text }]}>{eA.anchorPeakKn.toFixed(1)}</Text>
                <Text style={[styles.cell, { color: t.text }]}>{eB.anchorPeakKn.toFixed(1)}</Text>
                <Text style={[styles.cell, { color: t.text }]}>{eC.anchorPeakKn.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
        <CalcNote theme={t}>
          Peak ratio (Jörren 2015): PA {PEAK_RATIO_20M.PA}× · PES {PEAK_RATIO_20M.PES}× · UHMWPE {PEAK_RATIO_20M.HMPE}×
        </CalcNote>
      </CalcSection>

      <CalcNote theme={t}>{tr('calc.force.source')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.force.disclaimer')}</CalcNote>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cell: { flex: 1, fontSize: 12 },
  cellHead: { flex: 1, fontSize: 12, fontWeight: '600' },
});
