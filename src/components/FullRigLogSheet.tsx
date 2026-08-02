/**
 * Full Rig Log Sheet — F5 v0.7.2
 *
 * Modal pro kompletní workflow stavby lajny (Gates A/B/C + volitelný log).
 * Vychází z pm/idea_rig_log.md.
 *
 * Rozdíl vs. QuickCheckSheet:
 * - QuickCheck = 10 flat bodů pre-walk
 * - RigLog = 3 gates (kotvy → systém → před chůzí) + 4 log pole
 */

import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useTheme, Theme } from '../theme';
import { RIG_LOG_GATES, RigLogGate, RigLogItem, GateId, countTotalGateItems } from '../data/isa/rigLog';
import { saveLineSafetyCheck, GateStatus, GatesStatus, LogData } from '../db/lineSafetyChecks';
import type { SlacklineDetail } from '../types';

interface Props {
  visible: boolean;
  line: SlacklineDetail;
  onClose: () => void;
  onSaved?: () => void;
}

export function FullRigLogSheet({ visible, line, onClose, onSaved }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  // checked[gateId] = Set of itemIds
  const [checked, setChecked] = useState<Record<GateId, Set<string>>>({
    a: new Set(),
    b: new Set(),
    c: new Set(),
  });
  // Explicit skip status per gate (uživatel klikl "Přeskočit")
  const [skipped, setSkipped] = useState<Record<GateId, boolean>>({
    a: false,
    b: false,
    c: false,
  });
  const [expandedGate, setExpandedGate] = useState<GateId | null>('a');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Log fields
  const [tensionKn, setTensionKn] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [incident, setIncident] = useState(false);
  const [incidentNote, setIncidentNote] = useState('');
  const [leadRigger, setLeadRigger] = useState('');

  const totalItems = countTotalGateItems();
  const checkedCount = useMemo(
    () => Object.values(checked).reduce((acc, set) => acc + set.size, 0),
    [checked],
  );

  const gateStatus = (gate: RigLogGate): GateStatus | null => {
    if (skipped[gate.id]) return 'skipped';
    const count = checked[gate.id].size;
    if (count === 0) return null;
    if (count === gate.items.length) return 'complete';
    return 'partial';
  };

  const toggle = (gateId: GateId, itemId: string) => {
    setChecked((prev) => {
      const next = { ...prev };
      const set = new Set(next[gateId]);
      if (set.has(itemId)) set.delete(itemId);
      else set.add(itemId);
      next[gateId] = set;
      return next;
    });
    // Když user začne zaškrtávat, zruš skipped
    if (skipped[gateId]) {
      setSkipped((prev) => ({ ...prev, [gateId]: false }));
    }
  };

  const handleSkipGate = (gateId: GateId) => {
    Alert.alert(
      tr('rigLog.confirmSkip'),
      tr('rigLog.confirmSkipBody'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('rigLog.skipGate'),
          style: 'destructive',
          onPress: () => {
            // Skip = clear checked + set skipped flag
            setChecked((prev) => ({ ...prev, [gateId]: new Set() }));
            setSkipped((prev) => ({ ...prev, [gateId]: true }));
          },
        },
      ],
    );
  };

  const handleClose = () => {
    // Reset state
    setChecked({ a: new Set(), b: new Set(), c: new Set() });
    setSkipped({ a: false, b: false, c: false });
    setExpandedGate('a');
    setExpandedItem(null);
    setTensionKn('');
    setDurationHours('');
    setIncident(false);
    setIncidentNote('');
    setLeadRigger('');
    onClose();
  };

  const handleSave = async () => {
    if (saving) return;

    // Best-effort GPS
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

    // Build gates_status JSON
    const gatesStatus: GatesStatus = {
      a: gateStatus(RIG_LOG_GATES[0]),
      b: gateStatus(RIG_LOG_GATES[1]),
      c: gateStatus(RIG_LOG_GATES[2]),
    };

    // Build log_data — jen vyplněná pole
    const logData: LogData = {};
    const tensionParsed = parseFloat(tensionKn.replace(',', '.'));
    if (!isNaN(tensionParsed)) logData.tension_kn = tensionParsed;
    const durationParsed = parseFloat(durationHours.replace(',', '.'));
    if (!isNaN(durationParsed)) logData.duration_hours = durationParsed;
    if (incident) {
      logData.incident = true;
      if (incidentNote.trim()) logData.incident_note = incidentNote.trim();
    }
    if (leadRigger.trim()) logData.lead_rigger = leadRigger.trim();

    // Build cards_used + items_checked pro persistence
    const cardsUsed = RIG_LOG_GATES.map((g) => `gate-${g.id}`);
    const itemsChecked: Record<string, string[]> = {};
    for (const gate of RIG_LOG_GATES) {
      itemsChecked[`gate-${gate.id}`] = Array.from(checked[gate.id]);
    }

    setSaving(true);
    try {
      await saveLineSafetyCheck({
        slacklineId: line.id,
        cardsUsed,
        itemsChecked,
        totalItems,
        gpsLat,
        gpsLon,
        checkType: 'full',
        gatesStatus,
        logData: Object.keys(logData).length > 0 ? logData : null,
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

  const anyProgress =
    checkedCount > 0 ||
    skipped.a || skipped.b || skipped.c ||
    tensionKn || durationHours || incident || leadRigger;

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
              <Text style={[styles.title, { color: t.text }]}>{tr('rigLog.title')}</Text>
              <Text style={[styles.subtitle, { color: t.textMuted }]}>{line.name}</Text>
              <Text style={[styles.subtitleSmall, { color: t.textDim }]}>
                {tr('rigLog.subtitle')}
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Gates A / B / C */}
            {RIG_LOG_GATES.map((gate) => (
              <GateView
                key={gate.id}
                gate={gate}
                expanded={expandedGate === gate.id}
                onToggleExpand={() =>
                  setExpandedGate((prev) => (prev === gate.id ? null : gate.id))
                }
                checkedItems={checked[gate.id]}
                skipped={skipped[gate.id]}
                onToggleItem={(itemId) => toggle(gate.id, itemId)}
                onSkip={() => handleSkipGate(gate.id)}
                expandedItem={expandedItem}
                onToggleItemExpand={(itemId) =>
                  setExpandedItem((prev) => (prev === itemId ? null : itemId))
                }
                theme={t}
                tr={tr}
              />
            ))}

            {/* Log fields */}
            <View style={[styles.logSection, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}>
              <Text style={[styles.logSectionTitle, { color: t.text }]}>
                {tr('rigLog.log.title')}
              </Text>

              <LogField
                label={tr('rigLog.log.tensionKn')}
                hint={tr('rigLog.log.tensionKnHint')}
                value={tensionKn}
                onChangeText={setTensionKn}
                keyboardType="decimal-pad"
                placeholder="12.5"
                theme={t}
              />
              <LogField
                label={tr('rigLog.log.durationHours')}
                hint={tr('rigLog.log.durationHoursHint')}
                value={durationHours}
                onChangeText={setDurationHours}
                keyboardType="decimal-pad"
                placeholder="4"
                theme={t}
              />

              {/* Incident switch + optional note */}
              <View style={styles.incidentRow}>
                <Text style={[styles.logLabel, { color: t.text, flex: 1 }]}>
                  {tr('rigLog.log.incident')}
                </Text>
                <Switch
                  value={incident}
                  onValueChange={setIncident}
                  trackColor={{ false: t.border, true: t.accent }}
                  thumbColor={t.accentOn}
                />
              </View>
              {incident && (
                <LogField
                  label={tr('rigLog.log.incidentNote')}
                  hint={tr('rigLog.log.incidentNoteHint')}
                  value={incidentNote}
                  onChangeText={setIncidentNote}
                  multiline
                  placeholder="..."
                  theme={t}
                />
              )}

              <LogField
                label={tr('rigLog.log.leadRigger')}
                hint={tr('rigLog.log.leadRiggerHint')}
                value={leadRigger}
                onChangeText={setLeadRigger}
                placeholder="..."
                theme={t}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <Pressable
              onPress={handleClose}
              style={[styles.footerBtn, styles.footerBtnSecondary, { borderColor: t.border }]}
            >
              <Text style={{ color: t.text, fontWeight: '500' }}>{tr('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving || !anyProgress}
              style={[
                styles.footerBtn,
                {
                  backgroundColor: !anyProgress ? t.surfaceAlt : t.accent,
                  opacity: saving ? 0.6 : 1,
                },
              ]}
            >
              <Text style={{
                color: !anyProgress ? t.textMuted : t.accentOn,
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

function GateView({
  gate,
  expanded,
  onToggleExpand,
  checkedItems,
  skipped,
  onToggleItem,
  onSkip,
  expandedItem,
  onToggleItemExpand,
  theme,
  tr,
}: {
  gate: RigLogGate;
  expanded: boolean;
  onToggleExpand: () => void;
  checkedItems: Set<string>;
  skipped: boolean;
  onToggleItem: (itemId: string) => void;
  onSkip: () => void;
  expandedItem: string | null;
  onToggleItemExpand: (itemId: string) => void;
  theme: Theme;
  tr: (k: string, opts?: any) => string;
}) {
  const total = gate.items.length;
  const checked = checkedItems.size;
  const statusText = skipped
    ? tr('rigLog.gateStatus.skipped')
    : checked === 0
      ? tr('rigLog.gateStatus.notStarted')
      : checked === total
        ? tr('rigLog.gateStatus.complete')
        : tr('rigLog.gateStatus.partial');
  const statusColor = skipped
    ? theme.textDim
    : checked === total
      ? theme.accent
      : checked > 0
        ? theme.text
        : theme.textMuted;

  return (
    <View style={[gateStyles.card, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
      <Pressable onPress={onToggleExpand} style={gateStyles.header}>
        <MaterialCommunityIcons
          name={gate.icon as any}
          size={20}
          color={theme.text}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[gateStyles.title, { color: theme.text }]}>{tr(gate.titleKey)}</Text>
          <Text style={[gateStyles.statusText, { color: statusColor }]}>
            {skipped ? statusText : `${checked}/${total} · ${statusText}`}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={gateStyles.body}>
          <Text style={[gateStyles.description, { color: theme.textDim }]}>
            {tr(gate.descriptionKey)}
          </Text>

          {gate.items.map((item) => (
            <GateItemRow
              key={item.id}
              item={item}
              checked={checkedItems.has(item.id)}
              expanded={expandedItem === item.id}
              onToggle={() => onToggleItem(item.id)}
              onToggleExpand={() => onToggleItemExpand(item.id)}
              theme={theme}
              tr={tr}
              disabled={skipped}
            />
          ))}

          {!skipped && checkedItems.size < total && (
            <Pressable
              onPress={onSkip}
              style={[gateStyles.skipBtn, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons
                name="skip-next-outline"
                size={14}
                color={theme.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={[gateStyles.skipBtnText, { color: theme.textMuted }]}>
                {tr('rigLog.skipGate')}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function GateItemRow({
  item,
  checked,
  expanded,
  onToggle,
  onToggleExpand,
  theme,
  tr,
  disabled,
}: {
  item: RigLogItem;
  checked: boolean;
  expanded: boolean;
  onToggle: () => void;
  onToggleExpand: () => void;
  theme: Theme;
  tr: (k: string) => string;
  disabled: boolean;
}) {
  return (
    <View style={gateStyles.itemBlock}>
      <Pressable
        onPress={disabled ? undefined : onToggle}
        style={gateStyles.itemRow}
      >
        <MaterialCommunityIcons
          name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={disabled ? theme.textDim : (checked ? theme.accent : theme.textMuted)}
          style={{ marginRight: 10 }}
        />
        <Text
          style={[
            gateStyles.itemLabel,
            { color: disabled ? theme.textDim : theme.text },
            checked && { textDecorationLine: 'line-through', color: theme.textMuted },
          ]}
        >
          {tr(item.labelKey)}
        </Text>
        <Pressable onPress={onToggleExpand} hitSlop={8} style={{ padding: 4 }}>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.textMuted}
          />
        </Pressable>
      </Pressable>
      {expanded && (
        <Text style={[gateStyles.itemDetail, { color: theme.textMuted }]}>
          {tr(item.detailKey)}
        </Text>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------

function LogField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  theme,
}: {
  label: string;
  hint: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  multiline?: boolean;
  theme: Theme;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.logLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.logHint, { color: theme.textDim }]}>{hint}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        style={[
          styles.logInput,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            minHeight: multiline ? 60 : 40,
          },
        ]}
      />
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
  scroll: { flexGrow: 0 },
  logSection: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  logSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  logLabel: { fontSize: 13, fontWeight: '500' },
  logHint: { fontSize: 11, marginTop: 2, marginBottom: 4 },
  logInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  incidentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
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

const gateStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  title: { fontSize: 14, fontWeight: '600' },
  statusText: { fontSize: 11, marginTop: 2 },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  description: { fontSize: 12, fontStyle: 'italic', marginBottom: 10 },
  itemBlock: { marginBottom: 4 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemLabel: { flex: 1, fontSize: 13 },
  itemDetail: { fontSize: 11, marginLeft: 32, marginBottom: 8, lineHeight: 15, fontStyle: 'italic' },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
  },
  skipBtnText: { fontSize: 12 },
});
