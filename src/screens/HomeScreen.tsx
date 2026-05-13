// Hlavní obrazovka: mapa přes celé pozadí, list jako bottom sheet (Gorhom).
// Tři snap pointy (15% / 50% / 92%), drag handle uvnitř sheetu mění poměr.
// Bounds-driven filtrování — list se přefiltruje při každém posunu/zoomu mapy.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, RefreshControl, TextInput, Dimensions,
} from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMapStore } from '../store/mapStore';
import { useSyncStore } from '../store/syncStore';
import { queryByBounds } from '../db/queries';
import { seedFromCsv } from '../db/seed';
import { seedFromSlackmap } from '../db/slackmap';
import MapViewComponent from '../map/MapView';
import InlineDetail from '../components/InlineDetail';
import { FilterSheet } from '../components/FilterSheet';
import { SettingsSheet } from '../components/SettingsSheet';
import { useTheme } from '../theme';
import type { SlacklineListItem, SortKey, SortDir } from '../types';

const SORT_KEYS: SortKey[] = ['name', 'length', 'height', 'rating', 'distance'];

export default function HomeScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
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

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<any>(null);
  const snapPoints = useMemo(() => ['15%', '50%', '92%'], []);
  const setSheetHeight = useMapStore((s) => s.setSheetHeight);

  // Při změně snap point řekni mapě, jak velkou část obrazovky překrývá sheet,
  // aby mohla kamerou centrovat na střed VIDITELNÉ plochy mapy (ne celé obrazovky).
  const handleSheetChange = (index: number) => {
    const winH = Dimensions.get('window').height;
    const fractions = [0.15, 0.5, 0.92];
    const fraction = fractions[index] ?? 0;
    setSheetHeight(winH * fraction);
  };

  useEffect(() => {
    // Inicializuj na výchozí Half pozici (index 1)
    handleSheetChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);

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

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const idx = items.findIndex((it) => it.id === id);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
      });
    }
  };

  const handleMarkerPress = (id: number) => {
    // Když je sheet v Collapsed stavu, vytáhni ho na Half ať uživatel vidí řádek
    sheetRef.current?.snapToIndex(1);
    toggleExpand(id);
  };

  const renderItem = ({ item }: { item: SlacklineListItem }) => {
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
              isExpanded && { color: t.accent, fontWeight: '700' },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text style={[styles.colLength, { color: t.text }]} numberOfLines={1}>
            {item.length ? `${item.length} m` : ''}
          </Text>
          <Text style={[styles.colHeight, { color: t.text }]} numberOfLines={1}>
            {item.height ? `${item.height} m` : ''}
          </Text>
          <Text style={[styles.colRating, { color: t.text }]} numberOfLines={1}>
            {item.rating ? `★${item.rating}` : ''}
          </Text>
        </Pressable>
        {isExpanded && <InlineDetail slacklineId={item.id} />}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={StyleSheet.absoluteFillObject}>
        <MapViewComponent
          markers={items}
          selectedId={expandedId}
          onMarkerPress={handleMarkerPress}
        />
      </View>

      <FilterSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} />
      <SettingsSheet visible={settingsSheetOpen} onClose={() => setSettingsSheetOpen(false)} />

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        backgroundStyle={{ backgroundColor: t.surface }}
        handleIndicatorStyle={{ backgroundColor: t.textMuted }}
      >
        <View style={[styles.searchRow, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={t.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={tr('home.searchPlaceholder')}
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
                <Text style={[styles.filterBadgeText, { color: t.accentOn }]}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setSettingsSheetOpen(true)}
            style={styles.filterBtn}
            hitSlop={8}
            accessibilityLabel={tr('home.settingsLabel')}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={t.textMuted} />
          </Pressable>
        </View>

        <View style={[styles.sortBar, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}>
          {SORT_KEYS.map((key) => (
            <Pressable key={key} onPress={() => toggleSort(key)} style={styles.sortBtn}>
              <Text style={[
                styles.sortBtnText,
                { color: t.textMuted },
                sortBy === key && { color: t.accent, fontWeight: '600' },
              ]}>
                {tr(`sort.${key}`)}{sortBy === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        <BottomSheetFlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => String((item as SlacklineListItem).id)}
          renderItem={renderItem as any}
          refreshControl={<RefreshControl refreshing={syncing} onRefresh={async () => {
            await seedFromCsv();
            try { await seedFromSlackmap({ fromNetwork: true }); } catch {}
          }} tintColor={t.accent} />}
          onScrollToIndexFailed={(e) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: e.index, animated: true, viewPosition: 0 });
            }, 100);
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: t.textDim }]}>
              {syncing ? tr('home.syncing') : tr('home.empty')}
            </Text>
          }
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  colLength: { width: 56, fontSize: 12, textAlign: 'right' },
  colHeight: { width: 48, fontSize: 12, textAlign: 'right' },
  colRating: { width: 44, fontSize: 12, textAlign: 'right' },
  empty: { padding: 24, textAlign: 'center' },
});
