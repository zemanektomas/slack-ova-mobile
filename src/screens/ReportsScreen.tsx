import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';

type FilterType = 'all' | 'rig' | 'incident' | 'near_miss';

/**
 * Reporty tab — Level 1 (seznam reportu)
 *
 * v0.8.1 F5 milestone. Placeholder pro dev — plna implementace pridava:
 *   - Level 2 formular Novy report (accordion A-G podle ADR-051)
 *   - Level 3 detail reportu s cross-refs na lajny + gear
 *   - Draft mode s auto-save
 *   - Filter dropdown (Vse / Rig / Incident / Near-miss) — Q10 = D
 *   - Incident subforms podle 12 kategorii
 *
 * Data model: 1 tabulka `reports` s type field (Q10 = D), junction `report_gear`.
 * Schema v7 (SCHEMA_SQL v db/schema.ts).
 * Full spec v doc/app-review/isa-cards-review.md sekce 12 + 14.
 */
export default function ReportsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // TODO v0.8.1: nacist ze SQLite reports tabulky (schema v7)
  const counts = { all: 0, rig: 0, incident: 0, near_miss: 0 };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Reporty</Text>
        <TouchableOpacity accessibilityLabel="Menu">
          <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.textDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Hledat..."
          placeholderTextColor={theme.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {(['all', 'rig', 'incident', 'near_miss'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
              {f === 'all' ? 'Vse' : f === 'rig' ? 'Rig' : f === 'incident' ? 'Incident' : 'Near-miss'} ({counts[f]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.emptyState}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={theme.textDim} />
          <Text style={s.emptyTitle}>Zatim zadne reporty</Text>
          <Text style={s.emptyHint}>
            Pridej prvni rig report po dalsim natazeni. Automaticky vyplni datum, GPS,
            posledni pouzity gear.
          </Text>
        </View>

        <View style={s.placeholderNote}>
          <Text style={s.placeholderText}>
            Placeholder pro v0.8.1. Formular A-G, cross-refs na lajny + gear, incident subforms.
            Data model v isa-cards-review.md sekce 12.3 + wireframes 14.5-14.7.
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={s.fab} accessibilityLabel="Novy report">
        <MaterialCommunityIcons name="plus" size={28} color={theme.accentOn} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  title: { fontSize: 20, fontWeight: '600', color: t.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: t.surface,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: { flex: 1, color: t.text, fontSize: 15 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  filterChipActive: {
    backgroundColor: t.accent,
    borderColor: t.accent,
  },
  filterChipText: { fontSize: 13, color: t.text },
  filterChipTextActive: { color: t.accentOn },
  scroll: { flexGrow: 1, paddingVertical: 8 },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '500', color: t.text, marginTop: 16 },
  emptyHint: { fontSize: 14, color: t.textDim, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  placeholderNote: {
    margin: 16,
    padding: 12,
    backgroundColor: t.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: t.textDim,
  },
  placeholderText: { fontSize: 12, color: t.textDim, fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
