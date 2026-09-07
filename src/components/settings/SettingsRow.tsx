/**
 * SettingsRow — v0.7.29
 *
 * Radek uvnitr SettingsCard. Ma label vlevo a control vpravo (chip row, switch,
 * button, atd.). Volitelne hint pod labelem (mala popiska).
 *
 * Layout ma dva varianty:
 * - 'row' (default): label vlevo, control vpravo, na jednom radku
 * - 'stacked': label nahore, control pod nim (pouziva se pro chip rows a nested UI)
 */

import { useMemo, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { useFontStore } from '../../store/fontStore';

interface Props {
  label: string;
  hint?: string;
  children?: ReactNode;
  layout?: 'row' | 'stacked';
  /** Odstranit dolni divider (pro posledni row v karte). */
  last?: boolean;
}

export function SettingsRow({ label, hint, children, layout = 'row', last = false }: Props) {
  const t = useTheme();
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(t, fs), [t, fs]);

  return (
    <View style={[styles.row, !last && styles.rowBorder, layout === 'stacked' && styles.rowStacked]}>
      <View style={layout === 'row' ? styles.labelWrap : styles.labelWrapStacked}>
        <Text style={styles.label}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      {children && (
        <View style={layout === 'row' ? styles.controlWrap : styles.controlWrapStacked}>
          {children}
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>, fs: number) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    rowStacked: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    labelWrap: {
      flex: 1,
      marginRight: 12,
    },
    labelWrapStacked: {
      marginBottom: 8,
    },
    label: {
      fontSize: 14 * fs,
      color: t.text,
    },
    hint: {
      fontSize: 12 * fs,
      color: t.textDim,
      marginTop: 2,
    },
    controlWrap: {
      flexShrink: 0,
    },
    controlWrapStacked: {
      // stacked = plna sirka
    },
  });
