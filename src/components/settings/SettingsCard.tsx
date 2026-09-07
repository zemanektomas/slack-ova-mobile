/**
 * SettingsCard — v0.7.29
 *
 * Grupovaci karta pro nastaveni (Android Material 3 / iOS Settings pattern).
 * Card ma header s ikonou + titulkem, obsah je Children (SettingsRow items).
 *
 * Volitelne collapsible (napr. sekce Rozsirene je collapsed by default).
 */

import { useMemo, useState, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useFontStore } from '../../store/fontStore';

interface Props {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  children: ReactNode;
  /** Volitelne collapsible. Pokud true, header ma chevron a klik prepina open/close. */
  collapsible?: boolean;
  /** Default state pokud collapsible=true. Default false = collapsed. */
  defaultOpen?: boolean;
}

export function SettingsCard({ icon, title, children, collapsible = false, defaultOpen = false }: Props) {
  const t = useTheme();
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(t, fs), [t, fs]);
  const [open, setOpen] = useState(defaultOpen);

  const showContent = !collapsible || open;

  return (
    <View style={styles.card}>
      {collapsible ? (
        <Pressable onPress={() => setOpen((v) => !v)} style={styles.header}>
          <MaterialCommunityIcons name={icon} size={20} color={t.text} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>{title}</Text>
          <MaterialCommunityIcons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={t.textMuted}
          />
        </Pressable>
      ) : (
        <View style={styles.header}>
          <MaterialCommunityIcons name={icon} size={20} color={t.text} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      )}
      {showContent && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>, fs: number) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surfaceAlt,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: t.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    headerIcon: {
      marginRight: 10,
    },
    headerTitle: {
      flex: 1,
      fontSize: 15 * fs,
      fontWeight: '600',
      color: t.text,
    },
    content: {
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
  });
