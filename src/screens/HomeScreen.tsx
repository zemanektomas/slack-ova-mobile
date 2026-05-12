// Hlavní obrazovka: mapa (nahoře) + seznam viditelných slacklines (dole).
// Mezi nimi drag handle pro změnu poměru. Bounds-driven filtrování — list se
// přefiltruje při každém posunu/zoomu mapy.

import { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, RefreshControl, TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMapStore } from '../store/mapStore';
import { useSyncStore } from '../store/syncStore';
import { queryByBounds } from '../db/queries';
import { seedFromCsv } from '../db/seed';
import { seedFromSlackmap } from '../db/slackmap';
import MapViewComponent from '../map/MapView';
import InlineDetail from '../components/InlineDetail';
import { FilterSheet } from '../components/FilterSheet';
import { useTheme } from '../theme';
import type { SlacklineListItem, SortKey, SortDir } from '../types';

// Tři pozice cyklicky: half (50/50) → max mapa (85/15) → max list (15/85) → half...
const SPLIT_STEPS = [0.5, 0.85, 0.15] as const;
const SPLIT_ICONS = ['view-split-horizontal', 'arrow-up-bold-outline', 'arrow-down-bold-outline'] as const;

export default function HomeScreen() {
  const t = useTheme();
  const bounds = useMapStore((s) => s.bounds);
  const center = useMapStore((s) => s.center);
  const sourceFilter = useMapStore((s) => s.sourceFilter);
  const search = useMapStore((s) => s.search);
  const setSearch = useMapStore((s) => s.setSearch);
  const stateFilter = useMapStore((s) => s.stateFilter);
  const regionFilter = useMapStore((s) => s.regionFilter);
  const sectorFilter = useMapStore((s) => s.sectorFilter);
  const syncing = useSyncStore((s) => s.syncing);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);

  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [items, setItems] = useState<SlacklineListItem[]>([]);

  const [splitIdx, setSplitIdx] = useState(0);
  const ratio = SPLIT_STEPS[splitIdx];

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const listRef = useRef<FlatList<SlacklineListItem>>(null);

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Debounced search — drží SQLite klidnou při rychlém psaní
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    queryByBounds({
      bounds,
      sortBy,
      sortDir,
      center,
      sourceFilter,
      search: debouncedSearch.trim() || undefined,
      stateFilter,
      regionFilter,
      sectorFilter,
    }).then(setItems);
  }, [
    bounds,
    sortBy,
    sortDir,
    center,
    lastSyncAt,
    sourceFilter,
    debouncedSearch,
    stateFilter,
    regionFilter,
    sectorFilter,
  ]);

  const activeFilterCount =
    (stateFilter ? 1 : 0) + (regionFilter ? 1 : 0) + (sectorFilter ? 1 : 0);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };

  const cycleSplit = () => setSplitIdx((i) => (i + 1) % SPLIT_STEPS.length);

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Velikost mapy zachovat. Jen scroll na zvolený řádek.
    const idx = items.findIndex((it) => it.id === id);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
      });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={{ flex: ratio }}>
        <MapViewComponent
          markers={items}
          selectedId={expandedId}
          onMarkerPress={toggleExpand}
        />
      </View>

      <View style={[{ flex: 1 - ratio, backgroundColor: t.surface }]}>
        <View style={[styles.searchRow, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={t.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Hledat název, region, sektor..."
            placeholderTextColor={t.textMuted}
            style={[styles.searchInput, { color: t.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={t.textMuted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setFilterSheetOpen(true)}
            style={styles.filterBtn}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={20}
              color={activeFilterCount > 0 ? t.accent : t.textMuted}
            />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: t.accent }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={[styles.sortBar, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}>
          {(['name', 'length', 'height', 'rating', 'distance'] as SortKey[]).map((k) => (
            <Pressable key={k} onPress={() => toggleSort(k)} style={styles.sortBtn}>
              <Text style={[
                styles.sortBtnText,
                { color: t.textMuted },
                sortBy === k && { color: t.accent, fontWeight: '600' },
              ]}>
                {k}{sortBy === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </Text>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          <Pressable onPress={cycleSplit} style={styles.dragBtn}>
            <MaterialCommunityIcons name={SPLIT_ICONS[splitIdx]} size={20} color={t.textMuted} />
          </Pressable>
        </View>

        <FilterSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} />

        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={syncing} onRefresh={async () => {
            await seedFromCsv();
            try { await seedFromSlackmap({ fromNetwork: true }); } catch {}
          }} tintColor={t.accent} />}
          onScrollToIndexFailed={(e) => {
            // FlatList ještě nezná pozici — počkej krátce a zkus znova
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: e.index, animated: true, viewPosition: 0 });
            }, 100);
          }}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            return (
              <View>
                <Pressable
                  style={[
                    styles.row,
                    { borderColor: t.border },
                    isExpanded && { backgroundColor: t.surfaceAlt },
                  ]}
                  onPress={() => toggleExpand(item.id)}
                >
                  <Text
                    style={[
                      styles.name,
                      { color: t.text },
                      isExpanded && { color: '#facc15', fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.meta, { color: t.textMuted }]} numberOfLines={1}>
                    {[
                      item.length ? `${item.length}m` : null,
                      item.height ? `${item.height}m` : null,
                      item.rating ? `★${item.rating}` : null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </Pressable>
                {isExpanded && <InlineDetail slacklineId={item.id} />}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: t.textDim }]}>
              {syncing ? 'Stahuji data…' : 'Žádné slacklines. Potáhni pro obnovu.'}
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dragBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBar: { flexDirection: 'row', padding: 8, borderBottomWidth: 1 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  sortBtnText: { fontSize: 12, textTransform: 'capitalize' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterBtn: {
    padding: 4,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '500' },
  meta: { fontSize: 12, flexShrink: 0 },
  empty: { padding: 24, textAlign: 'center' },
});
