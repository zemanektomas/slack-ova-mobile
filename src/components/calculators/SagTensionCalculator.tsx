/**
 * Sag Tension Calculator — v0.8.0 (Q3 refactor).
 *
 * Statický tah v mainline z geometrie (délka + průvěs + váha chodce).
 * Ověřený tenzometrem (Kváš 2013, ČAS): odchylka 0,21 % a 1,12 %.
 * Delaney RopeLab 2022 potvrdil nezávisle.
 *
 * Vstupy: rozpětí (m), průvěs (m), váha chodce (kg)
 * Výstup: tah v kN + rating vůči ISA:21 §1.3 12 kN limit + L/sag pravidlo (max 50).
 */

import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useFontStore } from '../../store/fontStore';
import {
  sagTension,
  rateSagTension,
  lSagRatio,
  SAG_PERCENT_TABLE,
} from '../../data/isa/calculators';
import {
  CalcSlider,
  CalcInput,
  CalcSection,
  CalcLabel,
  ResultBig,
  CalcNote,
  RATING_COLORS,
} from './shared';

export function SagTensionCalculator() {
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(fs), [fs]);
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [spanText, setSpanText] = useState('50');
  const [walkerText, setWalkerText] = useState('80');
  const [sagPercent, setSagPercent] = useState(5);

  const spanM = parseFloat(spanText.replace(',', '.')) || 0;
  const walkerKg = parseFloat(walkerText.replace(',', '.')) || 0;
  const sagM = (spanM * sagPercent) / 100;
  const tension = sagTension(walkerKg, spanM, sagM);
  const rating = rateSagTension(tension);
  const ratio = lSagRatio(spanM, sagM);
  const ratioOK = ratio <= 50;

  return (
    <View>
      {/* Rozpětí */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.sagTension.spanLabel')}</CalcLabel>
        <CalcInput
          value={spanText}
          onChangeText={setSpanText}
          suffix="m"
          placeholder="50"
          theme={t}
        />
      </CalcSection>

      {/* Váha chodce */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.sagTension.walkerLabel')}</CalcLabel>
        <CalcInput
          value={walkerText}
          onChangeText={setWalkerText}
          suffix="kg"
          placeholder="80"
          theme={t}
        />
      </CalcSection>

      {/* Průvěs % */}
      <CalcSection>
        <CalcLabel theme={t}>
          {tr('calc.sagTension.sagLabel')} ({sagM.toFixed(2)} m)
        </CalcLabel>
        <CalcSlider
          value={sagPercent}
          min={1}
          max={20}
          step={0.5}
          suffix=" %"
          onValueChange={setSagPercent}
          theme={t}
        />
      </CalcSection>

      {/* Výsledek */}
      <CalcSection>
        <ResultBig
          label={tr('calc.sagTension.tensionLabel')}
          value={isFinite(tension) ? tension.toFixed(2) : '∞'}
          suffix="kN"
          color={RATING_COLORS[rating]}
          theme={t}
        />
        <Text style={[styles.rating, { color: RATING_COLORS[rating] }]}>
          {tr(`calc.sagTension.rating.${rating}`)}
        </Text>
        <Text
          style={[
            styles.ratioLine,
            { color: ratioOK ? t.textMuted : RATING_COLORS.stop },
          ]}
        >
          L/průvěs = {ratio.toFixed(0)} {ratioOK
            ? tr('calc.sagTension.ratioOK')
            : tr('calc.sagTension.ratioBad')}
        </Text>
      </CalcSection>

      {/* Referenční tabulka */}
      <CalcSection>
        <CalcLabel theme={t}>{tr('calc.sagTension.tableLabel')}</CalcLabel>
        <View style={[styles.table, { borderColor: t.border }]}>
          <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: t.border }]}>
            <Text style={[styles.cellHead, { color: t.text }]}>
              {tr('calc.sagTension.col.sag')}
            </Text>
            <Text style={[styles.cellHead, { color: t.text }]}>
              {tr('calc.sagTension.col.tension')}
            </Text>
            <Text style={[styles.cellHead, { color: t.text }]}>
              {tr('calc.sagTension.col.rating')}
            </Text>
          </View>
          {SAG_PERCENT_TABLE.map((sp, idx) => {
            const sag = (spanM * sp) / 100;
            const tn = sagTension(walkerKg, spanM, sag);
            const r = rateSagTension(tn);
            const isCurrent = Math.abs(sp - sagPercent) < 0.25;
            return (
              <View
                key={sp}
                style={[
                  styles.tableRow,
                  { borderBottomColor: t.border },
                  idx === SAG_PERCENT_TABLE.length - 1 && { borderBottomWidth: 0 },
                  isCurrent && { backgroundColor: t.surfaceAlt },
                ]}
              >
                <Text style={[styles.cell, { color: t.text }]}>{sp} %</Text>
                <Text style={[styles.cell, { color: t.text }]}>
                  {isFinite(tn) ? tn.toFixed(2) : '∞'} kN
                </Text>
                <Text style={[styles.cell, { color: RATING_COLORS[r], fontWeight: '600' }]}>
                  {tr(`calc.sagTension.rating.${r}`)}
                </Text>
              </View>
            );
          })}
        </View>
      </CalcSection>

      <CalcNote theme={t}>{tr('calc.sagTension.formula')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.sagTension.warning')}</CalcNote>
      <CalcNote theme={t}>{tr('calc.sagTension.source')}</CalcNote>
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
  ratioLine: {
    fontSize: 12 * fs,
    textAlign: 'center',
    marginTop: 4,
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
