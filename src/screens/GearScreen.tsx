import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFontStore } from '../store/fontStore';

/**
 * Vybaveni tab — Level 1 (kategorie overview)
 *
 * v0.8.0 F5 milestone. Placeholder pro dev — plna implementace pridava:
 *   - Level 2 seznam kusu v kategorii
 *   - Level 3 detail kusu (foto, specs, historie, ISA warnings)
 *   - Novy kus formular s autocomplete z assets/materials.json (96 typu)
 *   - CRUD nad SQLite gear tabulkou (schema v7)
 *
 * 6 kategorii (Q9 = C funkcni): Webbing / Anchor system / Personal / Rescue / Tools / Other
 * Data model + design v doc/app-review/isa-cards-review.md sekce 12 + 14.
 */
export default function GearScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const fs = useFontStore((s) => s.fontScale);
  const [search, setSearch] = useState('');

  // TODO v0.8.0: nacist ze SQLite gear tabulky (schema v7)
  const categories: Array<{ id: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; count: number; label: string; hint: string }> = [
    { id: 'webbing', icon: 'link-variant', count: 0, label: 'Webbing', hint: 'Popruhy main / backup' },
    { id: 'anchor_system', icon: 'anchor', count: 0, label: 'Anchor system', hint: 'Kotvitka, slings, sekle, karabiny' },
    { id: 'personal', icon: 'account', count: 0, label: 'Personal', hint: 'Sedak, PAS, odsedky, krouzky' },
    { id: 'rescue', icon: 'alert-octagon', count: 0, label: 'Rescue kit', hint: 'Pulleys, ascendery, descendery' },
    { id: 'tools', icon: 'wrench', count: 0, label: 'Tools', hint: 'Ochrana, merici, opravy' },
    { id: 'other', icon: 'dots-horizontal', count: 0, label: 'Ostatni', hint: 'Helmy, obuv, boxy' },
  ];

  const s = useMemo(() => styles(theme, fs), [theme, fs]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Vybaveni</Text>
        <TouchableOpacity accessibilityLabel="Menu">
          <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.textDim} />
        <TextInput
          style={s.searchInput}
          placeholder="Hledat gear..."
          placeholderTextColor={theme.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories list */}
      <ScrollView contentContainerStyle={s.scroll}>
        {categories.map((cat) => (
          <TouchableOpacity key={cat.id} style={s.categoryRow} activeOpacity={0.7}>
            <MaterialCommunityIcons name={cat.icon} size={28} color={theme.text} style={s.categoryIcon} />
            <View style={s.categoryTextWrap}>
              <View style={s.categoryTitleRow}>
                <Text style={s.categoryLabel}>{cat.label}</Text>
                <Text style={s.categoryCount}>({cat.count})</Text>
              </View>
              <Text style={s.categoryHint}>{cat.hint}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textDim} />
          </TouchableOpacity>
        ))}

        <View style={s.summaryBar}>
          <Text style={s.summaryText}>Aktivni: 0  Retired: 0</Text>
        </View>

        {/* v0.8.0 placeholder note */}
        <View style={s.placeholderNote}>
          <Text style={s.placeholderText}>
            Placeholder pro v0.8.0. Data model + design v isa-cards-review.md sekce 12.
          </Text>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} accessibilityLabel="Novy kus">
        <MaterialCommunityIcons name="plus" size={28} color={theme.accentOn} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = (t: ReturnType<typeof useTheme>, fs: number) => StyleSheet.create({
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
  title: { fontSize: 20 * fs, fontWeight: '600', color: t.text },
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
  searchInput: { flex: 1, color: t.text, fontSize: 15 * fs },
  scroll: { paddingVertical: 8 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  categoryIcon: { width: 32 },
  categoryTextWrap: { flex: 1 },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  categoryLabel: { fontSize: 16 * fs, fontWeight: '500', color: t.text },
  categoryCount: { fontSize: 14 * fs, color: t.textDim },
  categoryHint: { fontSize: 13 * fs, color: t.textDim, marginTop: 2 },
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.border,
    marginTop: 8,
  },
  summaryText: { fontSize: 13 * fs, color: t.textDim, textAlign: 'center' },
  placeholderNote: {
    margin: 16,
    padding: 12,
    backgroundColor: t.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: t.textDim,
  },
  placeholderText: { fontSize: 12 * fs, color: t.textDim, fontStyle: 'italic' },
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
