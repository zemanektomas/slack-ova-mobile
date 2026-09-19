import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  BackHandler,
  Pressable,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFontStore } from '../store/fontStore';
import materials from '../../assets/materials.json';
import {
  fetchWebbing,
  fetchWeblock,
  searchByBrandModel,
  fetchISAWarningsForGear,
  SLACKDATA_ATTRIBUTION,
  type SlackDataWebbing,
  type SlackDataWeblock,
  type SlackDataGearType,
  type SlackDataISAWarning,
  type StretchPoint,
} from '../api/slackdata';
import {
  findWarningsForItem,
  getAllWarnings,
  getUnmatchedWarnings,
  worstSeverity,
  type ISAWarning,
} from '../api/isaWarnings';
import { TranslatableText } from '../components/TranslatableText';

/**
 * Vybaveni tab — prohlížeč katalogu materiálů + SlackData enrichment (v0.8.0 rozjezd).
 *
 * Tři úrovně (state machine, žádný router):
 *   L1  seznam 6 kategorií s počtem kusů v katalogu (materials.json)
 *   L2  seznam kusů v kategorii (grouped by subkategorie)
 *   L3  detail kusu + volitelné napojení na SlackData API (stretch křivka, ISA warnings)
 *
 * NENÍ to user inventory (gear table zůstává prázdná v této iteraci). Katalog vs. inventory
 * viz ADR-052: materials.json = co existuje na trhu; gear = můj kus. User inventory + CRUD
 * FAB přijde v další iteraci.
 */

// --- Typy pro materials.json ---

interface MaterialItem {
  id: string;
  brand: string;
  model: string;
  width_mm?: number | null;
  length_m?: number | null;
  mbs_kn?: number | null;
  wll_kn?: number | null;
  material_family?: string | null;
  webbing_type?: string | null;
  isa_cert?: string | null;
  stretch_percent_at_5kn?: number | null;
  rlt_days_default?: number | null;
  notes?: string | null;
  url?: string | null;
}

type MaterialCategory =
  | 'webbing'
  | 'weblock'
  | 'shackle'
  | 'carabiner'
  | 'sling'
  | 'leash'
  | 'ring'
  | 'harness'
  | 'pas'
  | 'rescue';

interface MaterialsCatalog {
  schema_version: string;
  generated_at: string;
  categories: Record<MaterialCategory, MaterialItem[]>;
}

const catalog = materials as unknown as MaterialsCatalog;

// --- Mapování materials.json subkategorií → gear kategorie (schema v7). ---

const CATEGORY_GROUPS: Array<{
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  labelKey: string;
  hintKey: string;
  subcategories: MaterialCategory[];
}> = [
  { id: 'webbing', icon: 'link-variant', labelKey: 'gear.category.webbing', hintKey: 'gear.categoryHint.webbing', subcategories: ['webbing'] },
  {
    id: 'anchor_system',
    icon: 'anchor',
    labelKey: 'gear.category.anchor',
    hintKey: 'gear.categoryHint.anchor',
    subcategories: ['weblock', 'shackle', 'carabiner', 'sling'],
  },
  {
    id: 'personal',
    icon: 'account',
    labelKey: 'gear.category.personal',
    hintKey: 'gear.categoryHint.personal',
    subcategories: ['leash', 'ring', 'harness', 'pas'],
  },
  { id: 'rescue', icon: 'alert-octagon', labelKey: 'gear.category.rescue', hintKey: 'gear.categoryHint.rescue', subcategories: ['rescue'] },
];

/**
 * Určí SlackData endpoint pro daný item.
 * SlackData má endpointy: webbing / weblock / roller / leashring / grip / treepro.
 * Pro rescue kategorii je to smíšené — kladky/pulleys mapujeme na `roller`,
 * ascendery/descendery SlackData nemá, takže vrátíme undefined a button se skryje.
 */
function slackdataTypeForItem(
  subcategory: MaterialCategory,
  item: MaterialItem,
): SlackDataGearType | undefined {
  switch (subcategory) {
    case 'webbing':
      return 'webbing';
    case 'weblock':
      return 'weblock';
    case 'ring':
      return 'leashring';
    case 'rescue': {
      // Rescue má kladky, ascendery, descendery. SlackData má jen `roller`.
      const s = `${item.model} ${item.notes ?? ''}`.toLowerCase();
      if (/pulley|traxion|rollex|kootenay|omni block|swivel/.test(s)) return 'roller';
      return undefined; // ascender / descender / grip / rope grab → nenapojeno
    }
    default:
      return undefined;
  }
}

// --- Screen state (L1 → L2 → L3). ---

type NavState =
  | { level: 'L1' }
  | { level: 'L2'; groupId: string }
  | { level: 'L3'; groupId: string; item: MaterialItem; subcategory: MaterialCategory };

export default function GearScreen() {
  const theme = useTheme();
  const { t: tr } = useTranslation();
  const fs = useFontStore((s) => s.fontScale);
  const [nav, setNav] = useState<NavState>({ level: 'L1' });
  const [search, setSearch] = useState('');
  const [allWarnings, setAllWarnings] = useState<ISAWarning[]>([]);
  const [unmatched, setUnmatched] = useState<ISAWarning[]>([]);
  const [showGenericWarnings, setShowGenericWarnings] = useState(false);

  const s = useMemo(() => styles(theme, fs), [theme, fs]);

  // Nacist ISA warnings z SQLite cache pri mount (auto-fetch je v _layout.tsx pri startu).
  useEffect(() => {
    (async () => {
      try {
        const [all, un] = await Promise.all([getAllWarnings(), getUnmatchedWarnings()]);
        setAllWarnings(all);
        setUnmatched(un);
      } catch {}
    })();
  }, []);

  // Fuzzy match: brand+model matching pro warnings s manufacturer+model naplneny.
  // Vraci Map<materialItem.id, ISAWarning[]> pro rychly lookup.
  const warningsByItemId = useMemo(() => {
    const map = new Map<string, ISAWarning[]>();
    if (allWarnings.length === 0) return map;
    for (const cat of Object.values(catalog.categories)) {
      for (const item of cat) {
        const b = item.brand.toLowerCase();
        const m = item.model.toLowerCase();
        const matches = allWarnings.filter(
          (w) =>
            w.manufacturer && w.model
            && w.manufacturer.toLowerCase().includes(b)
            && w.model.toLowerCase().includes(m),
        );
        if (matches.length > 0) map.set(item.id, matches);
      }
    }
    return map;
  }, [allWarnings]);

  /** Kolik warnings na items dané kategorie group (webbing / anchor_system / ...). */
  const warningCountForGroup = (subcategories: MaterialCategory[]): number => {
    let count = 0;
    for (const sub of subcategories) {
      for (const item of catalog.categories[sub] ?? []) {
        if (warningsByItemId.has(item.id)) count += warningsByItemId.get(item.id)!.length;
      }
    }
    return count;
  };

  // Hardware / gesture back button — vrací na předchozí úroveň state machiny.
  // Bez toho by system back zavíral app nebo přepínal na jiný tab (a user by
  // ztratil nav state uvnitř GearScreenu).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (nav.level === 'L3') {
        setNav({ level: 'L2', groupId: nav.groupId });
        return true;
      }
      if (nav.level === 'L2') {
        setNav({ level: 'L1' });
        setSearch('');
        return true;
      }
      return false; // L1 → default (systém zavře tab / app)
    });
    return () => sub.remove();
  }, [nav]);

  // --- L1: kategorie s count ---
  const categoryCounts = useMemo(() => {
    return CATEGORY_GROUPS.map((g) => ({
      ...g,
      count: g.subcategories.reduce((sum, sub) => sum + (catalog.categories[sub]?.length ?? 0), 0),
    }));
  }, []);

  const currentGroup = nav.level !== 'L1' ? categoryCounts.find((g) => g.id === nav.groupId) : null;

  // --- L2: filtered items pro currentGroup ---
  const l2Items = useMemo(() => {
    if (!currentGroup) return [];
    const items: Array<{ item: MaterialItem; subcategory: MaterialCategory }> = [];
    for (const sub of currentGroup.subcategories) {
      for (const item of catalog.categories[sub] ?? []) {
        items.push({ item, subcategory: sub });
      }
    }
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      ({ item }) =>
        item.brand.toLowerCase().includes(needle) || item.model.toLowerCase().includes(needle),
    );
  }, [currentGroup, search]);

  // --- Render podle úrovně ---

  if (nav.level === 'L3') {
    return (
      <L3Detail
        item={nav.item}
        subcategory={nav.subcategory}
        itemWarnings={warningsByItemId.get(nav.item.id) ?? []}
        onBack={() => setNav({ level: 'L2', groupId: nav.groupId })}
      />
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        {nav.level === 'L1' ? (
          <>
            <Text style={s.title}>{tr('tabs.gear')}</Text>
            <View style={{ width: 24 }} />
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setNav({ level: 'L1' })}
              accessibilityLabel="Back"
              hitSlop={16}
              style={{ padding: 8, marginLeft: -8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={s.title}>{currentGroup ? tr(currentGroup.labelKey) : ''}</Text>
            <View style={{ width: 24 }} />
          </>
        )}
      </View>

      {/* Search bar jen v L2 */}
      {nav.level === 'L2' && (
        <View style={s.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color={theme.textDim} />
          <TextInput
            style={s.searchInput}
            placeholder="Hledat brand / model..."
            placeholderTextColor={theme.textDim}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.textDim} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={s.scroll}>
        {nav.level === 'L1' &&
          categoryCounts.map((cat) => {
            const wCount = warningCountForGroup(cat.subcategories);
            return (
              <TouchableOpacity
                key={cat.id}
                style={s.categoryRow}
                activeOpacity={0.7}
                onPress={() => setNav({ level: 'L2', groupId: cat.id })}
              >
                <MaterialCommunityIcons name={cat.icon} size={28} color={theme.text} style={s.categoryIcon} />
                <View style={s.categoryTextWrap}>
                  <View style={s.categoryTitleRow}>
                    <Text style={s.categoryLabel}>{tr(cat.labelKey)}</Text>
                    <Text style={s.categoryCount}>{cat.count}</Text>
                    {wCount > 0 && (
                      <View style={s.warningBadge}>
                        <MaterialCommunityIcons name="alert" size={11} color="#fff" />
                        <Text style={s.warningBadgeText}>{wCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.categoryHint}>{tr(cat.hintKey)}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textDim} />
              </TouchableOpacity>
            );
          })}

        {/* Obecné ISA warnings (unmatched) — pod kategoriemi v L1 */}
        {nav.level === 'L1' && unmatched.length > 0 && (
          <TouchableOpacity
            style={s.categoryRow}
            activeOpacity={0.7}
            onPress={() => setShowGenericWarnings(true)}
          >
            <MaterialCommunityIcons name="alert-outline" size={28} color="#f59e0b" style={s.categoryIcon} />
            <View style={s.categoryTextWrap}>
              <View style={s.categoryTitleRow}>
                <Text style={s.categoryLabel}>Obecné ISA warnings</Text>
                <Text style={s.categoryCount}>{unmatched.length}</Text>
              </View>
              <Text style={s.categoryHint}>Varování bez konkrétního materiálu (obecná, systémová)</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textDim} />
          </TouchableOpacity>
        )}

        {nav.level === 'L2' &&
          l2Items.map(({ item, subcategory }) => {
            const itemWarnings = warningsByItemId.get(item.id) ?? [];
            const severity = worstSeverity(itemWarnings);
            return (
              <TouchableOpacity
                key={item.id}
                style={s.itemRow}
                activeOpacity={0.7}
                onPress={() => setNav({ level: 'L3', groupId: nav.groupId, item, subcategory })}
              >
                <View style={s.itemMain}>
                  <Text style={s.itemBrand}>{item.brand}</Text>
                  <View style={s.itemModelRow}>
                    <Text style={s.itemModel}>{item.model}</Text>
                    {severity && (
                      <MaterialCommunityIcons
                        name={severity === 'Recall' ? 'close-octagon' : 'alert'}
                        size={14}
                        color={severity === 'Recall' ? '#dc2626' : severity === 'Warning' ? '#f59e0b' : '#eab308'}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>
                </View>
                <View style={s.itemSpecs}>
                  {item.mbs_kn && <Text style={s.itemSpec}>{item.mbs_kn} kN</Text>}
                  {item.width_mm && <Text style={s.itemSpec}>{item.width_mm} mm</Text>}
                  {item.isa_cert && <Text style={s.itemIsa}>{item.isa_cert}</Text>}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textDim} />
              </TouchableOpacity>
            );
          })}

        {nav.level === 'L2' && l2Items.length === 0 && (
          <View style={s.placeholderNote}>
            <Text style={s.placeholderText}>Nic k zobrazení. Zkus jiný filtr.</Text>
          </View>
        )}

        {nav.level === 'L1' && (
          <View style={s.placeholderNote}>
            <Text style={s.placeholderText}>
              Katalog materiálů — {Object.values(catalog.categories).reduce((a, b) => a + b.length, 0)} typů.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* v9: Obecné ISA warnings modal — pro warnings bez manufacturer+model */}
      <Modal
        visible={showGenericWarnings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGenericWarnings(false)}
        statusBarTranslucent
      >
        <View style={s.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowGenericWarnings(false)} />
          <View style={[s.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Obecné ISA warnings</Text>
              <Pressable onPress={() => setShowGenericWarnings(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {unmatched.map((w) => {
                const bg =
                  w.status === 'Recall' ? '#7f1d1d' : w.status === 'Warning' ? '#b45309' : '#a16207';
                return (
                  <View key={w.source_id} style={[s.isaWarningCard, { backgroundColor: bg }]}>
                    <View style={s.isaWarningHeader}>
                      <MaterialCommunityIcons
                        name={w.status === 'Recall' ? 'close-octagon' : 'alert'}
                        size={16}
                        color="#fff"
                      />
                      <Text style={s.isaWarningStatus}>ISA {w.status.toUpperCase()}</Text>
                      {w.date_iso && <Text style={s.isaWarningDate}>{w.date_iso}</Text>}
                    </View>
                    <TranslatableText text={w.description} color="#fff" hintColor="rgba(255,255,255,0.85)" />
                    {w.solution && (
                      <TranslatableText
                        text={`Solution: ${w.solution}`}
                        color="#fff"
                        hintColor="rgba(255,255,255,0.85)"
                        style={{ fontStyle: 'italic' }}
                      />
                    )}
                    {w.links && w.links.length > 0 && (
                      <Pressable onPress={() => Linking.openURL(w.links![0])}>
                        <Text style={s.isaWarningLink}>Zdroj →</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- L3 Detail komponent ---

interface L3Props {
  item: MaterialItem;
  subcategory: MaterialCategory;
  itemWarnings: ISAWarning[];
  onBack: () => void;
}

function L3Detail({ item, subcategory, itemWarnings, onBack }: L3Props) {
  const theme = useTheme();
  const fs = useFontStore((s) => s.fontScale);
  const s = useMemo(() => styles(theme, fs), [theme, fs]);
  const slackdataType = slackdataTypeForItem(subcategory, item);

  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichData, setEnrichData] = useState<SlackDataWebbing | SlackDataWeblock | null>(null);
  const [warnings, setWarnings] = useState<SlackDataISAWarning[]>([]);
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; brand_name?: string }> | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleEnrichSearch = async () => {
    if (!slackdataType) return;
    setEnrichLoading(true);
    setSearchError(null);
    try {
      const results = await searchByBrandModel(slackdataType, item.brand, item.model);
      if (results.length === 0) {
        setSearchError(`V SlackData nenalezeno „${item.brand} ${item.model}"`);
        setSearchResults([]);
      } else if (results.length === 1) {
        // Přímý match — načteme detail
        await loadEnrichment(results[0].id);
      } else {
        setSearchResults(results.slice(0, 10));
      }
    } catch (err) {
      setSearchError(String(err));
    } finally {
      setEnrichLoading(false);
    }
  };

  const loadEnrichment = async (id: number) => {
    if (!slackdataType) return;
    setEnrichLoading(true);
    setSearchResults(null);
    try {
      // fetchGear pokrývá všechny endpointy — webbing / weblock / roller / leashring / …
      // (webbing má parsed stretch, ostatní typy jdou přes generický fetch — MBS/name/warnings.)
      const [detail, warns] = await Promise.all([
        slackdataType === 'webbing'
          ? fetchWebbing(id)
          : slackdataType === 'weblock'
            ? fetchWeblock(id)
            : null, // roller / leashring / grip / treepro — enrichment ISA warnings + brand match stačí
        fetchISAWarningsForGear(slackdataType, id),
      ]);
      setEnrichData(detail);
      setWarnings(warns);
    } catch (err) {
      setSearchError(String(err));
    } finally {
      setEnrichLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityLabel="Back"
          hitSlop={16}
          style={{ padding: 8, marginLeft: -8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>
          {item.model}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* v9: ISA warnings banner nahore (nejvyssi priorita) */}
        {itemWarnings.length > 0 && (
          <View style={s.isaWarningBanner}>
            {itemWarnings.map((w) => {
              const bg =
                w.status === 'Recall' ? '#7f1d1d' : w.status === 'Warning' ? '#b45309' : '#a16207';
              return (
                <View key={w.source_id} style={[s.isaWarningCard, { backgroundColor: bg }]}>
                  <View style={s.isaWarningHeader}>
                    <MaterialCommunityIcons
                      name={w.status === 'Recall' ? 'close-octagon' : 'alert'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={s.isaWarningStatus}>ISA {w.status.toUpperCase()}</Text>
                    {w.date_iso && <Text style={s.isaWarningDate}>{w.date_iso}</Text>}
                  </View>
                  <TranslatableText text={w.description} color="#fff" hintColor="rgba(255,255,255,0.85)" />
                  {w.solution && (
                    <TranslatableText
                      text={`Solution: ${w.solution}`}
                      color="#fff"
                      hintColor="rgba(255,255,255,0.85)"
                      style={{ fontStyle: 'italic' }}
                    />
                  )}
                  {w.links && w.links.length > 0 && (
                    <Pressable onPress={() => Linking.openURL(w.links![0])}>
                      <Text style={s.isaWarningLink}>Zdroj →</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Základní karta z materials.json */}
        <View style={s.detailCard}>
          <Text style={s.detailBrand}>{item.brand}</Text>
          <Text style={s.detailModel}>{item.model}</Text>
          <View style={s.specGrid}>
            {item.mbs_kn && <SpecCell label="MBS" value={`${item.mbs_kn} kN`} theme={theme} fs={fs} />}
            {item.wll_kn && <SpecCell label="WLL" value={`${item.wll_kn} kN`} theme={theme} fs={fs} />}
            {item.width_mm && <SpecCell label="Šířka" value={`${item.width_mm} mm`} theme={theme} fs={fs} />}
            {item.material_family && <SpecCell label="Materiál" value={item.material_family} theme={theme} fs={fs} />}
            {item.isa_cert && <SpecCell label="ISA cert" value={item.isa_cert} theme={theme} fs={fs} />}
            {item.webbing_type && <SpecCell label="Typ" value={item.webbing_type} theme={theme} fs={fs} />}
          </View>
          {item.notes && <Text style={s.detailNotes}>{item.notes}</Text>}
          {item.url && (
            <TouchableOpacity onPress={() => Linking.openURL(item.url!)} style={s.sourceRow}>
              <MaterialCommunityIcons name="open-in-new" size={14} color={theme.accent} />
              <Text style={s.sourceLink}>Web výrobce</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SlackData enrichment karta — jen pro webbing/weblock */}
        {slackdataType && (
          <View style={s.enrichCard}>
            <View style={s.enrichHeader}>
              <MaterialCommunityIcons name="database-search" size={18} color={theme.text} />
              <Text style={s.enrichTitle}>SlackData enrichment</Text>
            </View>

            {!enrichData && !enrichLoading && !searchResults && (
              <>
                <Text style={s.enrichHint}>
                  Doplnit stretch křivku, ISA warnings a další data z {SLACKDATA_ATTRIBUTION.source}.
                </Text>
                <TouchableOpacity style={s.enrichBtn} onPress={handleEnrichSearch}>
                  <Text style={s.enrichBtnText}>Hledat v SlackData</Text>
                </TouchableOpacity>
              </>
            )}

            {enrichLoading && (
              <View style={s.enrichLoading}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={s.enrichLoadingText}>Načítám…</Text>
              </View>
            )}

            {searchError && !searchResults?.length && (
              <View style={s.enrichError}>
                <Text style={s.enrichErrorText}>{searchError}</Text>
                <TouchableOpacity onPress={handleEnrichSearch}>
                  <Text style={s.enrichRetry}>Zkusit znovu</Text>
                </TouchableOpacity>
              </View>
            )}

            {searchResults && searchResults.length > 0 && !enrichData && (
              <>
                <Text style={s.enrichHint}>Vyber odpovídající kus:</Text>
                {searchResults.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={s.searchResultRow}
                    onPress={() => loadEnrichment(r.id)}
                  >
                    <Text style={s.searchResultText}>
                      {r.brand_name} — {r.name}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textDim} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {enrichData && (
              <EnrichmentDisplay data={enrichData} warnings={warnings} type={slackdataType} theme={theme} fs={fs} />
            )}

            {enrichData && (
              <Text style={s.attributionText}>
                Zdroj: {SLACKDATA_ATTRIBUTION.source} · {SLACKDATA_ATTRIBUTION.license}
              </Text>
            )}
          </View>
        )}

        {!slackdataType && (
          <View style={s.placeholderNote}>
            <Text style={s.placeholderText}>
              Pro tento typ vybavení nemá SlackData endpoint (např. ascendery, descendery, šekly, karabiny, spansety, sedáky). Enrichment funguje pro webbing, kotvítka, kroužky a kladky.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Sub-komponenty ---

interface SpecCellProps {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  fs: number;
}

function SpecCell({ label, value, theme, fs }: SpecCellProps) {
  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 8, minWidth: '48%' }}>
      <Text style={{ fontSize: 11 * fs, color: theme.textDim, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontSize: 14 * fs, color: theme.text, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

interface EnrichmentDisplayProps {
  data: SlackDataWebbing | SlackDataWeblock;
  warnings: SlackDataISAWarning[];
  type: SlackDataGearType;
  theme: ReturnType<typeof useTheme>;
  fs: number;
}

function EnrichmentDisplay({ data, warnings, type, theme, fs }: EnrichmentDisplayProps) {
  const s = useMemo(() => styles(theme, fs), [theme, fs]);
  const webbing = type === 'webbing' ? (data as SlackDataWebbing) : null;
  const weblock = type === 'weblock' ? (data as SlackDataWeblock) : null;

  return (
    <View>
      <View style={s.specGrid}>
        {data.breaking_strength != null && (
          <SpecCell label="MBS (API)" value={`${data.breaking_strength} kN`} theme={theme} fs={fs} />
        )}
        {webbing?.width != null && <SpecCell label="Šířka" value={`${webbing.width} mm`} theme={theme} fs={fs} />}
        {webbing?.thickness != null && (
          <SpecCell label="Tloušťka" value={`${webbing.thickness} mm`} theme={theme} fs={fs} />
        )}
        {data.weight != null && (
          <SpecCell label="Váha" value={`${data.weight} ${type === 'webbing' ? 'g/m' : 'g'}`} theme={theme} fs={fs} />
        )}
        {webbing?.classification && (
          <SpecCell label="ISA Class" value={webbing.classification} theme={theme} fs={fs} />
        )}
        {webbing?.webbing_construction && (
          <SpecCell label="Konstrukce" value={webbing.webbing_construction} theme={theme} fs={fs} />
        )}
        {weblock?.style && <SpecCell label="Styl" value={weblock.style} theme={theme} fs={fs} />}
        {(weblock?.width_min != null || weblock?.width_max != null) && (
          <SpecCell
            label="Šířka"
            value={`${weblock.width_min ?? '?'}–${weblock.width_max ?? '?'} mm`}
            theme={theme}
            fs={fs}
          />
        )}
        {data.price != null && (
          <SpecCell
            label="Cena"
            value={`${data.price} ${data.currency ?? ''}${type === 'webbing' ? '/m' : ''}`}
            theme={theme}
            fs={fs}
          />
        )}
        {data.isa_certified != null && (
          <SpecCell label="ISA cert" value={data.isa_certified ? 'ANO' : 'NE'} theme={theme} fs={fs} />
        )}
      </View>

      {/* Stretch křivka */}
      {webbing?.stretch && webbing.stretch.length > 0 && (
        <StretchTable stretch={webbing.stretch} theme={theme} fs={fs} />
      )}

      {/* ISA warnings */}
      {warnings.length > 0 && <WarningsList warnings={warnings} theme={theme} fs={fs} />}

      {data.isa_warning && warnings.length === 0 && (
        <View style={s.warningRow}>
          <MaterialCommunityIcons name="alert" size={16} color="#f59e0b" />
          <Text style={s.warningText}>ISA severity: {data.isa_warning}</Text>
        </View>
      )}
    </View>
  );
}

function StretchTable({ stretch, theme, fs }: { stretch: StretchPoint[]; theme: ReturnType<typeof useTheme>; fs: number }) {
  const s = useMemo(() => styles(theme, fs), [theme, fs]);
  return (
    <View style={s.stretchWrap}>
      <Text style={s.stretchTitle}>Stretch křivka ({stretch.length} bodů)</Text>
      <View style={s.stretchTable}>
        <View style={s.stretchHeaderRow}>
          <Text style={[s.stretchCell, s.stretchHeaderCell]}>kN</Text>
          <Text style={[s.stretchCell, s.stretchHeaderCell]}>%</Text>
        </View>
        {stretch.map((p, i) => (
          <View key={i} style={s.stretchRow}>
            <Text style={s.stretchCell}>{p.kn}</Text>
            <Text style={s.stretchCell}>{p.percent.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WarningsList({ warnings, theme, fs }: { warnings: SlackDataISAWarning[]; theme: ReturnType<typeof useTheme>; fs: number }) {
  const s = useMemo(() => styles(theme, fs), [theme, fs]);
  return (
    <View style={s.warningsWrap}>
      <Text style={s.warningsTitle}>⚠ ISA warnings ({warnings.length})</Text>
      {warnings.map((w, i) => (
        <View key={i} style={s.warningItem}>
          <Text style={s.warningStatus}>
            {w.status}
            {w.date_iso ? ` · ${w.date_iso}` : ''}
          </Text>
          <Text style={s.warningDesc}>{w.description}</Text>
          {w.solution && <Text style={s.warningSolution}>Řešení: {w.solution}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = (t: ReturnType<typeof useTheme>, fs: number) =>
  StyleSheet.create({
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
    title: { fontSize: 20 * fs, fontWeight: '600', color: t.text, flex: 1, textAlign: 'center' },
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
    scroll: { paddingVertical: 8, paddingBottom: 140 },
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
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    itemMain: { flex: 1 },
    itemBrand: { fontSize: 12 * fs, color: t.textDim },
    itemModel: { fontSize: 15 * fs, color: t.text, fontWeight: '500' },
    itemModelRow: { flexDirection: 'row', alignItems: 'center' },
    itemSpecs: { alignItems: 'flex-end', gap: 2 },
    itemSpec: { fontSize: 12 * fs, color: t.textDim },
    itemIsa: { fontSize: 11 * fs, color: t.accent, fontWeight: '500' },
    // v9: ISA warnings styling (isaWarning* prefix pro rozliseni od slackdata enrichment warnings)
    warningBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#dc2626',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 8,
      gap: 3,
    },
    warningBadgeText: { color: '#fff', fontSize: 10 * fs, fontWeight: '700' },
    isaWarningBanner: { marginHorizontal: 16, marginTop: 12, gap: 8 },
    isaWarningCard: { padding: 12, borderRadius: 10, gap: 6 },
    isaWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    isaWarningStatus: { color: '#fff', fontSize: 12 * fs, fontWeight: '700', letterSpacing: 0.5 },
    isaWarningDate: { color: '#fff', fontSize: 11 * fs, marginLeft: 'auto', opacity: 0.8 },
    isaWarningDesc: { color: '#fff', fontSize: 13 * fs, lineHeight: 18 * fs },
    isaWarningSolution: { color: '#fff', fontSize: 12 * fs, fontStyle: 'italic', opacity: 0.9 },
    isaWarningLink: { color: '#fff', fontSize: 12 * fs, fontWeight: '600', textDecorationLine: 'underline', marginTop: 4 },
    // v9: obecne warnings modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { maxHeight: '85%', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    modalTitle: { flex: 1, fontSize: 18 * fs, fontWeight: '600', color: t.text },
    detailCard: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 14,
      backgroundColor: t.surface,
      borderRadius: 10,
    },
    detailBrand: { fontSize: 13 * fs, color: t.textDim },
    detailModel: { fontSize: 18 * fs, color: t.text, fontWeight: '600', marginBottom: 8 },
    specGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    detailNotes: {
      fontSize: 13 * fs,
      color: t.textDim,
      marginTop: 10,
      lineHeight: 18 * fs,
    },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    sourceLink: { fontSize: 13 * fs, color: t.accent },
    enrichCard: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 14,
      backgroundColor: t.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
    },
    enrichHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    enrichTitle: { fontSize: 15 * fs, color: t.text, fontWeight: '600' },
    enrichHint: { fontSize: 13 * fs, color: t.textDim, marginBottom: 12 },
    enrichBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: t.accent,
      borderRadius: 8,
      alignItems: 'center',
    },
    enrichBtnText: { color: t.accentOn, fontSize: 14 * fs, fontWeight: '500' },
    enrichLoading: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 12 },
    enrichLoadingText: { fontSize: 13 * fs, color: t.textDim },
    enrichError: { paddingVertical: 8 },
    enrichErrorText: { fontSize: 13 * fs, color: '#dc2626', marginBottom: 6 },
    enrichRetry: { fontSize: 13 * fs, color: t.accent },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
    },
    searchResultText: { flex: 1, fontSize: 14 * fs, color: t.text },
    attributionText: {
      fontSize: 11 * fs,
      color: t.textDim,
      textAlign: 'center',
      marginTop: 12,
      fontStyle: 'italic',
    },
    stretchWrap: { marginTop: 12 },
    stretchTitle: { fontSize: 13 * fs, color: t.text, fontWeight: '600', marginBottom: 6 },
    stretchTable: { borderWidth: 1, borderColor: t.border, borderRadius: 6, overflow: 'hidden' },
    stretchHeaderRow: { flexDirection: 'row', backgroundColor: t.bg },
    stretchHeaderCell: { fontWeight: '600', color: t.text },
    stretchRow: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
    },
    stretchCell: {
      flex: 1,
      paddingVertical: 6,
      paddingHorizontal: 10,
      fontSize: 12 * fs,
      color: t.textDim,
      textAlign: 'center',
    },
    warningsWrap: { marginTop: 12, gap: 8 },
    warningsTitle: { fontSize: 13 * fs, color: '#dc2626', fontWeight: '600' },
    warningItem: {
      padding: 10,
      backgroundColor: t.bg,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
      borderRadius: 4,
    },
    warningStatus: { fontSize: 12 * fs, color: '#f59e0b', fontWeight: '600', marginBottom: 4 },
    warningDesc: { fontSize: 13 * fs, color: t.text, lineHeight: 18 * fs },
    warningSolution: { fontSize: 12 * fs, color: t.textDim, marginTop: 4, fontStyle: 'italic' },
    warningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingVertical: 8,
    },
    warningText: { fontSize: 13 * fs, color: '#f59e0b' },
    placeholderNote: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      backgroundColor: t.surface,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: t.textDim,
    },
    placeholderText: { fontSize: 12 * fs, color: t.textDim, fontStyle: 'italic' },
  });
