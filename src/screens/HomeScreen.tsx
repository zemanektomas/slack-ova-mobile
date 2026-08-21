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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { useMapStore } from '../store/mapStore';
import { useSyncStore } from '../store/syncStore';
import { queryByBounds } from '../db/queries';
import { seedFromSlackcz } from '../db/seedSlackcz';
import { seedFromSlackmap } from '../db/slackmap';
import MapViewComponent from '../map/MapView';
import InlineDetail from '../components/InlineDetail';
import { SettingsSheet } from '../components/SettingsSheet';
import { useUserLocation } from '../map/useLocation';
import { useTheme } from '../theme';
import type { SlacklineListItem, SortKey, SortDir } from '../types';

// Sort keys odpovídají sloupcům v listu. Rating odebrán — slack.cz/slackmap má
// rating zřídka vyplněný (~5 % lajn), pro řazení nedává smysl. Hodnota zůstává
// viditelná v inline detailu pokud existuje.
const SORT_KEYS: SortKey[] = ['name', 'length', 'height', 'distance'];

// Lidsky čitelná vzdálenost. Pod 1 km v metrech (zaokrouhleno na 10 m),
// jinak v km s jedním desetinným místem (do 100 km), pak celé km.
function formatDistance(km: number | null | undefined): string {
  if (km == null) return '';
  if (km < 1) {
    const m = Math.round((km * 1000) / 10) * 10;
    return `${m} m`;
  }
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export default function HomeScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const bounds = useMapStore((s) => s.bounds);
  const center = useMapStore((s) => s.center);
  const sourceFilter = useMapStore((s) => s.sourceFilter);
  const search = useMapStore((s) => s.search);
  const setSearch = useMapStore((s) => s.setSearch);
  const userLoc = useUserLocation();
  const syncing = useSyncStore((s) => s.syncing);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);

  // Default sort = distance. Pokud má user GPS fix, počítáme vzdálenost
  // od jeho polohy. Bez GPS spadne na střed mapy (původní chování).
  const distanceOrigin = userLoc
    ? { lat: userLoc.lat, lon: userLoc.lon }
    : center;

  const [sortBy, setSortBy] = useState<SortKey>('distance');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [items, setItems] = useState<SlacklineListItem[]>([]);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<any>(null);
  const snapPoints = useMemo(() => ['15%', '50%', '92%'], []);
  const setSheetHeight = useMapStore((s) => s.setSheetHeight);
  const focusOn = useMapStore((s) => s.focusOn);
  const insets = useSafeAreaInsets();

  // Horní hrana sheetu v px, live z Gorhomu. Ovládací tlačítka mapy se podle ní
  // pozicují přímo v UI threadu — jinak skáčou až po dosednutí animace.
  const sheetPosition = useSharedValue(0);

  // Při změně snap point řekni mapě, jak velkou část obrazovky překrývá sheet,
  // aby mohla kamerou centrovat na střed VIDITELNÉ plochy mapy (ne celé obrazovky).
  // Kamera stačí diskrétně (setCamera per frame by bylo plýtvání) — plynule
  // sleduje sheet jen FAB blok, přes sheetPosition.
  const handleSheetChange = (index: number) => {
    // Kontejner je SafeAreaView edges={['top']}, takže o horní inset nižší než
    // okno. Snap pointy jsou procenta z kontejneru, ne z okna.
    const containerH = Dimensions.get('window').height - insets.top;
    const fractions = [0.15, 0.5, 0.92];
    const fraction = fractions[index] ?? 0;
    setSheetHeight(containerH * fraction);
  };

  useEffect(() => {
    // Inicializuj na výchozí Half pozici (index 1)
    handleSheetChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      center: distanceOrigin,
      sourceFilter,
      search: debouncedSearch.trim() || undefined,
    }).then(setItems);
  }, [
    bounds,
    sortBy,
    sortDir,
    distanceOrigin.lat,
    distanceOrigin.lon,
    lastSyncAt,
    sourceFilter,
    debouncedSearch,
  ]);

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
    const item = items.find((it) => it.id === id);
    // Auto-focus na lajnu při expand. Bez toho user tapne řádek, otevře se mu detail,
    // ale mapa zůstane kde byla — pokud user mezitím panoval, "selektovaná" lajna
    // je mimo viewport a uživatel si myslí že apka neudělala nic (feedback od Daniela
    // 25.6.2026). Focus jde i přes mapStore (stejný mechanismus jako crosshair button
    // v inline detailu), takže `focusTarget.nonce` se inkrementuje a MapView dostane
    // signál na flyTo.
    if (item?.first_anchor) {
      focusOn(item.first_anchor.latitude, item.first_anchor.longitude);
    }
    if (item) {
      const idx = items.findIndex((it) => it.id === id);
      if (idx >= 0) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
        });
      }
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
          <Text style={[styles.colDistance, { color: t.text }]} numberOfLines={1}>
            {formatDistance(item.distance_km)}
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
          sheetPosition={sheetPosition}
        />
      </View>

      <SettingsSheet visible={settingsSheetOpen} onClose={() => setSettingsSheetOpen(false)} />

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        animatedPosition={sheetPosition}
        // Gorhom 5 má enableDynamicSizing default TRUE — vloží do snapPoints
        // další, z obsahu odvozený bod. Tím se posunou indexy a fractions[index]
        // v handleSheetChange sáhne vedle (mapa uprostřed → tlačítka na maximu).
        // Máme tři explicitní snap pointy, dynamický nechceme.
        enableDynamicSizing={false}
        backgroundStyle={{ backgroundColor: t.surface }}
        // Drag handle větší — palcem těžké trefit default ~22px tall kontejner,
        // user tap propadl do search inputu pod ním (open keyboard nechtěně).
        // Feedback z Closed Alpha — víc tap-friendly hit area + výrazný indicator.
        handleStyle={{ paddingVertical: 14, height: 36 }}
        handleIndicatorStyle={{ backgroundColor: t.textMuted, width: 60, height: 5 }}
        // Klávesnice obecně: sheet se roztáhne na max snap point, content
        // bottom-padding se přizpůsobí výšce klávesnice. Bez tohohle Android
        // překryje search input a uživatel nevidí co píše (#41).
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
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
            // Při tap do search auto-rozjet sheet na max snap — keyboardBehavior="extend"
            // řeší Android resize, ale když je sheet v Collapsed (15%), drag handle
            // sedí těsně nad keyboardem a vypadá to ošklivě. Lepší pre-emptive snap.
            onFocus={() => sheetRef.current?.snapToIndex(2)}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={t.textMuted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setSettingsSheetOpen(true)}
            style={styles.iconBtn}
            hitSlop={8}
            accessibilityLabel={tr('home.settingsLabel')}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={t.textMuted} />
          </Pressable>
        </View>

        {/* Sortbar layout zrcadlí strukturu řádků dole — name flex:1, ostatní fixní
            widths matchují col* styly. Bez tohohle byly hlavičky a hodnoty
            posunutý (feedback z Closed Alpha — sortbar buttony měly flex-width
            podle textu, tedy "Vzdálenost" širší než "Délka"). */}
        <View style={[styles.sortBar, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}>
          <SortHeader sortKey="name" sortBy={sortBy} sortDir={sortDir} onPress={toggleSort} label={tr('sort.name')} style={styles.sortColName} align="left" theme={t} />
          <SortHeader sortKey="length" sortBy={sortBy} sortDir={sortDir} onPress={toggleSort} label={tr('sort.length')} style={styles.sortColLength} align="right" theme={t} />
          <SortHeader sortKey="height" sortBy={sortBy} sortDir={sortDir} onPress={toggleSort} label={tr('sort.height')} style={styles.sortColHeight} align="right" theme={t} />
          <SortHeader sortKey="distance" sortBy={sortBy} sortDir={sortDir} onPress={toggleSort} label={tr('sort.distance')} style={styles.sortColDistance} align="right" theme={t} />
        </View>

        <BottomSheetFlatList
          ref={listRef}
          data={items}
          keyExtractor={(item: unknown) => String((item as SlacklineListItem).id)}
          renderItem={renderItem as any}
          // Drag listu zavře keyboard — řeší Petrův case "tahám sheet a klávesnice
          // mi překryje text". `on-drag` blur na první scroll gesto.
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={syncing} onRefresh={async () => {
            // Pull-to-refresh = re-seed z bundled JSON souborů (slackcz.json + slackmap_world.json).
            // Žádný net fetch — net fetch by smazal rich slackmap details (anchorsInfo/accessInfo)
            // protože api.slackmap.com/lines GeoJSON je jen geometry. Fresh data si vyžadují
            // build-time refresh (`apps/slackcz-scraper/` + `scripts/fetch-slackmap.js`).
            await seedFromSlackcz();
            try { await seedFromSlackmap(); } catch {}
          }} tintColor={t.accent} />}
          onScrollToIndexFailed={(e: { index: number }) => {
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

// Sortbar header — pro každý sloupec stejný style jak row hodnota (width, align).
// Bez separate komponenty by JSX v render bylo příliš opakující se.
function SortHeader({
  sortKey, sortBy, sortDir, onPress, label, style, align, theme,
}: {
  sortKey: SortKey;
  sortBy: SortKey;
  sortDir: SortDir;
  onPress: (k: SortKey) => void;
  label: string;
  style: any;
  align: 'left' | 'right';
  theme: any;
}) {
  const active = sortBy === sortKey;
  const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <Pressable onPress={() => onPress(sortKey)} style={style}>
      <Text
        numberOfLines={1}
        style={[
          { fontSize: 12, textAlign: align, color: theme.textMuted },
          active && { color: theme.accent, fontWeight: '600' },
        ]}
      >
        {label}{arrow}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // sortBar matchuje `row` padding (12 horizontal, 8 vertical) + gap 8
  // pro perfektní zarovnání hlaviček s hodnotami níž.
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  // Sortbar columns matchují row col* widths (1:1)
  sortColName: { flex: 1 },
  sortColLength: { width: 56 },
  sortColHeight: { width: 48 },
  sortColDistance: { width: 60 },
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
  iconBtn: {
    padding: 4,
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
  colDistance: { width: 60, fontSize: 12, textAlign: 'right' },
  empty: { padding: 24, textAlign: 'center' },
});
