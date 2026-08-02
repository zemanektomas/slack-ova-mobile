/**
 * Quick Check Sheet — F5 v0.7.2
 *
 * Modal pre-walk kontrola per konkrétní lajnu. 10 tvrdých bodů (5 vždy + 5
 * podmíněně dle parametrů lajny). Uživatel odškrtá, uloží → historie.
 */

import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useTheme, Theme } from '../theme';
import { generateQuickCheckForLine, QuickCheckItem } from '../data/isa/quickCheck';
import { saveLineSafetyCheck } from '../db/lineSafetyChecks';
import type { SlacklineDetail } from '../types';

interface Props {
  visible: boolean;
  line: SlacklineDetail;
  onClose: () => void;
  onSaved?: () => void;
}

export function QuickCheckSheet({ visible, line, onClose, onSaved }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { items } = useMemo(() => generateQuickCheckForLine(line), [line]);
  const total = items.length;
  const checkedCount = checked.size;

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setChecked(new Set());
    setExpandedItem(null);
    onClose();
  };

  const handleSave = async () => {
    if (saving) return;

    // Best-effort GPS (bez blokování — pokud nemáme, prostě null)
    let gpsLat: number | null = null;
    let gpsLon: number | null = null;
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (last) {
          gpsLat = last.coords.latitude;
          gpsLon = last.coords.longitude;
        }
      }
    } catch {}

    setSaving(true);
    try {
      // Data model: cards_used = quickCheck itemy jsou "cards" v širším smyslu.
      // items_checked mapuje "cardId" → [], protože quickCheck není checklist s
      // vnořenými body — každý item je sám atomic. Používáme dummy "checked" key.
      const itemsChecked: Record<string, string[]> = {};
      for (const id of checked) {
        itemsChecked[id] = ['checked'];
      }

      await saveLineSafetyCheck({
        slacklineId: line.id,
        cardsUsed: items.map((i) => i.id),
        itemsChecked,
        totalItems: total,
        gpsLat,
        gpsLon,
      });
      Alert.alert(tr('lineSafety.sessionSaved'), '');
      onSaved?.();
      handleClose();
    } catch (err: any) {
      Alert.alert(tr('lineSafety.sessionSaveError'), err?.message ?? 'DB error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: t.text }]}>{tr('quickCheck.title')}</Text>
              <Text style={[styles.subtitle, { color: t.textMuted }]}>
                {line.name}
              </Text>
              <Text style={[styles.subtitleSmall, { color: t.textDim }]}>
                {tr('quickCheck.subtitle')}
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: checkedCount === total ? t.accent : t.textMuted }]}>
              {tr('lineSafety.sessionProgress', { checked: checkedCount, total })}
            </Text>
          </View>

          {/* Items list */}
          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 12 }}>
            {items.map((item) => (
              <QuickCheckRow
                key={item.id}
                item={item}
                theme={t}
                tr={tr}
                checked={checked.has(item.id)}
                expanded={expandedItem === item.id}
                onToggle={() => toggle(item.id)}
                onToggleExpand={() =>
                  setExpandedItem((prev) => (prev === item.id ? null : item.id))
                }
              />
            ))}
          </ScrollView>

          {/* Footer buttons */}
          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <Pressable
              onPress={handleClose}
              style={[styles.footerBtn, styles.footerBtnSecondary, { borderColor: t.border }]}
            >
              <Text style={{ color: t.text, fontWeight: '500' }}>{tr('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving || checkedCount === 0}
              style={[
                styles.footerBtn,
                {
                  backgroundColor: checkedCount === 0 ? t.surfaceAlt : t.accent,
                  opacity: saving ? 0.6 : 1,
                },
              ]}
            >
              <Text style={{
                color: checkedCount === 0 ? t.textMuted : t.accentOn,
                fontWeight: '600',
              }}>
                {tr('lineSafety.sessionSave')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------

function QuickCheckRow({
  item,
  theme,
  tr,
  checked,
  expanded,
  onToggle,
  onToggleExpand,
}: {
  item: QuickCheckItem;
  theme: Theme;
  tr: (k: string, opts?: any) => string;
  checked: boolean;
  expanded: boolean;
  onToggle: () => void;
  onToggleExpand: () => void;
}) {
  const reason = item.reasonKey ? tr(item.reasonKey) : null;

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Pressable onPress={onToggle} style={styles.rowMain}>
        <MaterialCommunityIcons
          name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={checked ? theme.accent : theme.textMuted}
          style={{ marginRight: 12 }}
        />
        <MaterialCommunityIcons
          name={item.icon as any}
          size={20}
          color={theme.textMuted}
          style={{ marginRight: 8 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.rowLabel,
              { color: theme.text },
              checked && { textDecorationLine: 'line-through', color: theme.textMuted },
            ]}
          >
            {tr(item.labelKey)}
          </Text>
          {reason && !expanded && (
            <Text style={[styles.rowReason, { color: theme.textDim }]}>{reason}</Text>
          )}
        </View>
        <Pressable onPress={onToggleExpand} hitSlop={8} style={{ padding: 4 }}>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textMuted}
          />
        </Pressable>
      </Pressable>
      {expanded && (
        <View style={styles.rowDetail}>
          {reason && (
            <Text style={[styles.rowReason, { color: theme.textDim, marginBottom: 6 }]}>
              ⓘ {reason}
            </Text>
          )}
          <Text style={[styles.rowDetailText, { color: theme.textMuted }]}>
            {tr(item.detailKey)}
          </Text>
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: { flex: 1 },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  subtitleSmall: { fontSize: 11, marginTop: 4 },
  progressRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  progressText: { fontSize: 13, fontWeight: '600' },
  scroll: { flexGrow: 0 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowReason: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  rowDetail: {
    paddingLeft: 44,
    paddingRight: 16,
    paddingBottom: 12,
  },
  rowDetailText: { fontSize: 12, lineHeight: 17 },
  footer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
});
