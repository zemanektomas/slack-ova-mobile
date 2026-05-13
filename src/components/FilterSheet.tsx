import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../store/mapStore';
import { useTheme } from '../theme';
import {
  getDistinctRegions,
  getDistinctSectors,
  getDistinctStates,
} from '../db/queries';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function FilterSheet({ visible, onClose }: FilterSheetProps) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const stateFilter = useMapStore((s) => s.stateFilter);
  const regionFilter = useMapStore((s) => s.regionFilter);
  const sectorFilter = useMapStore((s) => s.sectorFilter);
  const setStateFilter = useMapStore((s) => s.setStateFilter);
  const setRegionFilter = useMapStore((s) => s.setRegionFilter);
  const setSectorFilter = useMapStore((s) => s.setSectorFilter);
  const resetFilters = useMapStore((s) => s.resetFilters);

  const [states, setStates] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getDistinctStates()
      .then(setStates)
      .finally(() => setLoading(false));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    getDistinctRegions(stateFilter).then(setRegions);
  }, [visible, stateFilter]);

  useEffect(() => {
    if (!visible) return;
    getDistinctSectors(stateFilter, regionFilter).then(setSectors);
  }, [visible, stateFilter, regionFilter]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: t.text }]}>{tr('filter.title')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={t.accent} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 16 }}>
              <FilterRow
                label={tr('filter.state')}
                allLabel={tr('common.all')}
                value={stateFilter}
                options={states}
                onChange={setStateFilter}
                theme={t}
              />
              <FilterRow
                label={tr('filter.region')}
                allLabel={tr('common.all')}
                value={regionFilter}
                options={regions}
                onChange={setRegionFilter}
                theme={t}
                disabled={!stateFilter && states.length > 1}
              />
              <FilterRow
                label={tr('filter.sector')}
                allLabel={tr('common.all')}
                value={sectorFilter}
                options={sectors}
                onChange={setSectorFilter}
                theme={t}
                disabled={!regionFilter && regions.length > 1}
              />
            </ScrollView>
          )}

          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <Pressable
              onPress={() => {
                resetFilters();
              }}
              style={[styles.footerBtn, { borderColor: t.border }]}
            >
              <Text style={{ color: t.textMuted }}>{tr('common.reset')}</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[styles.footerBtn, { backgroundColor: t.accent }]}
            >
              <Text style={{ color: t.accentOn, fontWeight: '600' }}>{tr('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface FilterRowProps {
  label: string;
  allLabel: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  theme: ReturnType<typeof useTheme>;
  disabled?: boolean;
}

function FilterRow({ label, allLabel, value, options, onChange, theme, disabled }: FilterRowProps) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.4 }]} pointerEvents={disabled ? 'none' : 'auto'}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
        <Chip
          label={allLabel}
          active={value === null}
          onPress={() => onChange(null)}
          theme={theme}
        />
        {options.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            active={value === opt}
            onPress={() => onChange(value === opt ? null : opt)}
            theme={theme}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.surfaceAlt,
          borderColor: active ? theme.accent : theme.border,
        },
      ]}
    >
      <Text style={{ color: active ? theme.accentOn : theme.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '600' },
  scroll: { flexGrow: 0 },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  rowLabel: { fontSize: 12, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
