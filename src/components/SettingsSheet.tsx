import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { useMapStore, MapKind, SourceFilter } from '../store/mapStore';
import { useLangStore } from '../store/langStore';
import type { Lang } from '../i18n';
import { useTheme } from '../theme';
import { refreshGeometryFromSlackmap } from '../db/slackmap';
import { getMeta } from '../db/index';
import { OfflineManager } from '@maplibre/maplibre-react-native';
import { useAuthStore } from '../store/authStore';
import { useSlackmapAuth } from '../api/useSlackmapAuth';
import { ISASafetySheet } from './ISASafetySheet';
import { useLevelStore, UserLevel } from '../store/levelStore';
import { useFontStore, FontSize } from '../store/fontStore';
import { CommunitySheet } from './CommunitySheet';

// Verze z app.json — během dev mode `Constants.expoConfig`, v release přes
// `Application` API. Pro náš účel ukázat uživateli stačí Constants (funguje vždy).
const APP_VERSION = Constants.expoConfig?.version ?? '?.?.?';
const APP_BUILD = Constants.expoConfig?.android?.versionCode ?? '?';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * 'modal' (default) — puvodni Modal popup ze search baru v mape (deprecated v0.8.0).
   * 'inline' — full-screen tab rendering (v0.8.0+ SettingsScreen). Bez backdrop,
   * bez close X (uzivatel navigate pres tab bar).
   */
  mode?: 'modal' | 'inline';
}

const MAP_KINDS: { key: MapKind; labelKey: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: 'osm', labelKey: 'settings.mapOsm', icon: 'map-outline' },
  { key: 'outdoor', labelKey: 'settings.mapOutdoor', icon: 'terrain' },
  { key: 'aerial', labelKey: 'settings.mapAerial', icon: 'satellite-variant' },
];

// Zdroje dat — labely jsou brand jména (slack.cz, Slackmap), nepřekládáme.
// "all" má lokalizovaný label common.all.
const SOURCES: { key: SourceFilter; label: string; useTranslation?: boolean }[] = [
  { key: 'all', label: 'common.all', useTranslation: true },
  { key: 'csv', label: 'slack.cz' },
  { key: 'slackmap', label: 'Slackmap' },
];

// Pořadí abecedně podle endonymu, vlaječky přes Unicode regional indicator
// (renderuje OS — žádné image assety potřeba).
const LANGUAGES: { key: Lang; label: string }[] = [
  { key: 'cs', label: '🇨🇿 Čeština' },
  { key: 'en', label: '🇬🇧 English' },
  { key: 'pl', label: '🇵🇱 Polski' },
];

export function SettingsSheet({ visible, onClose, mode = 'modal' }: SettingsSheetProps) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const kind = useMapStore((s) => s.kind);
  const setKind = useMapStore((s) => s.setKind);
  const sourceFilter = useMapStore((s) => s.sourceFilter);
  const setSourceFilter = useMapStore((s) => s.setSourceFilter);
  const hideLogo = useMapStore((s) => s.hideLogo);
  const setHideLogo = useMapStore((s) => s.setHideLogo);
  const hideControls = useMapStore((s) => s.hideControls);
  const setHideControls = useMapStore((s) => s.setHideControls);
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  // Slackmap account (F5)
  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { ready: authReady, signIn, signOut } = useSlackmapAuth();
  const [signingIn, setSigningIn] = useState(false);

  // Updates section state
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);

  // ISA Safety Companion (F5) — nested sheet
  const [isaSheetOpen, setIsaSheetOpen] = useState(false);

  // Level (v0.7.3)
  const level = useLevelStore((s) => s.level);
  const setLevel = useLevelStore((s) => s.setLevel);

  // Velikost písma (v0.7.16) — "večer je to nečitelné na mobilu"
  const fontSize = useFontStore((s) => s.fontSize);
  const setFontSize = useFontStore((s) => s.setFontSize);

  // Community sheet (v0.7.3) — pro default country "CZ"
  const [communityOpen, setCommunityOpen] = useState(false);
  const [communityCountry, setCommunityCountry] = useState<string>('CZ');

  useEffect(() => {
    if (!visible) return;
    // Načti timestamp poslední síťové aktualizace
    getMeta('slackmap_last_network_refresh').then(setLastRefresh).catch(() => {});
    // Detekce online stavu (live subscription, ne jen polling)
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    return () => unsub();
  }, [visible]);

  const handleOpenPlayStore = async () => {
    // market:// URI scheme otevře přímo Play Store app. Fallback na HTTPS pro
    // případ že apka není v Play Storu (např. dev build, sideload).
    const marketUrl = 'market://details?id=cz.slackline.ova';
    const webUrl = 'https://play.google.com/store/apps/details?id=cz.slackline.ova';
    try {
      const supported = await Linking.canOpenURL(marketUrl);
      await Linking.openURL(supported ? marketUrl : webUrl);
    } catch {
      Linking.openURL(webUrl).catch(() => {});
    }
  };

  const handleRefreshSlackmap = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await refreshGeometryFromSlackmap();
      const refreshedAt = new Date().toISOString();
      setLastRefresh(refreshedAt);
      Alert.alert(
        tr('settings.refreshDone'),
        tr('settings.refreshSummary', {
          added: result.added,
          updated: result.updated,
          unchanged: result.unchanged,
        }),
      );
    } catch (err: any) {
      Alert.alert(tr('settings.refreshFailed'), err?.message ?? 'Network error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearMapCache = () => {
    // Confirm dialog — vymazání cache je destruktivní (uživatel pak musí mít signál
    // aby viděl mapu). Ne přímé akce, ne nechtěné kliknutí.
    Alert.alert(
      tr('settings.clearCacheConfirmTitle'),
      tr('settings.clearCacheConfirmBody'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('settings.clearCacheConfirm'),
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              // clearAmbientCache mažе auto-cached tiles (ambient cache).
              // Explicit offline packs (zatím žádné nemáme) by zůstaly nedotčené.
              await OfflineManager.clearAmbientCache();
              Alert.alert(tr('settings.clearCacheDone'), '');
            } catch (err: any) {
              Alert.alert(tr('settings.clearCacheFailed'), err?.message ?? '');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ],
    );
  };

  const handleSignIn = async () => {
    if (signingIn || !authReady) return;
    setSigningIn(true);
    try {
      const result = await signIn();
      if (!result.ok && result.error !== 'cancelled') {
        Alert.alert(tr('settings.signInFailed'), result.error);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      tr('settings.signOutConfirmTitle'),
      tr('settings.signOutConfirmBody'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('settings.signOutConfirm'),
          style: 'destructive',
          onPress: () => { signOut(); },
        },
      ],
    );
  };

  // v0.8.0: obsah je stejny pro Modal (deprecated) i inline tab mode.
  // Header ma close X jen v modal mode (v tabu se navigate pres tab bar).
  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: t.text }]}>{tr('settings.title')}</Text>
      {mode === 'modal' && (
        <Pressable onPress={onClose} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
        </Pressable>
      )}
    </View>
  );

  const scrollBody = (
    <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('settings.mapKind')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                {MAP_KINDS.map((k) => (
                  <Chip
                    key={k.key}
                    label={tr(k.labelKey)}
                    icon={k.icon}
                    active={kind === k.key}
                    onPress={() => setKind(k.key)}
                    theme={t}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('settings.source')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                {SOURCES.map((s) => (
                  <Chip
                    key={s.key}
                    label={s.useTranslation ? tr(s.label) : s.label}
                    active={sourceFilter === s.key}
                    onPress={() => setSourceFilter(s.key)}
                    theme={t}
                  />
                ))}
              </ScrollView>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: t.markerHighline }]} />
                  <Text style={[styles.legendText, { color: t.textMuted }]}>{tr('settings.legendHighline')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: t.markerOther }]} />
                  <Text style={[styles.legendText, { color: t.textMuted }]}>{tr('settings.legendOther')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: t.markerSelected, borderWidth: 1, borderColor: t.markerSelectedStroke }]} />
                  <Text style={[styles.legendText, { color: t.textMuted }]}>{tr('settings.selected')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('settings.display')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Chip
                  label={tr('settings.showLogo')}
                  icon={hideLogo ? 'checkbox-blank-outline' : 'checkbox-marked'}
                  active={!hideLogo}
                  onPress={() => setHideLogo(!hideLogo)}
                  theme={t}
                />
                <Chip
                  label={tr('settings.showControls')}
                  icon={hideControls ? 'checkbox-blank-outline' : 'checkbox-marked'}
                  active={!hideControls}
                  onPress={() => setHideControls(!hideControls)}
                  theme={t}
                />
              </View>
            </View>

            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('settings.language')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                {LANGUAGES.map((l) => (
                  <Chip
                    key={l.key}
                    label={l.label}
                    active={lang === l.key}
                    onPress={() => setLang(l.key)}
                    theme={t}
                  />
                ))}
              </ScrollView>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('settings.updates')}</Text>

              {/* Verze aplikace + tlačítko Play Store */}
              <View style={styles.updateRow}>
                <Text style={[styles.updateLabel, { color: t.text }]}>
                  {tr('settings.appVersion', { version: APP_VERSION, build: APP_BUILD })}
                </Text>
                <Pressable onPress={handleOpenPlayStore} style={[styles.linkBtn, { borderColor: t.border }]}>
                  <MaterialCommunityIcons name="google-play" size={14} color={t.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.linkBtnText, { color: t.accent }]}>{tr('settings.openPlayStore')}</Text>
                </Pressable>
              </View>

              {/* Data lajn + tlačítko Aktualizovat */}
              <View style={styles.updateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.updateLabel, { color: t.text }]}>
                    {tr('settings.dataLines')}
                  </Text>
                  <Text style={[styles.updateSubtext, { color: t.textDim }]}>
                    {lastRefresh
                      ? tr('settings.lastRefresh', { date: formatRefreshDate(lastRefresh, lang) })
                      : tr('settings.dataBundled')}
                  </Text>
                </View>
                <Pressable
                  onPress={handleRefreshSlackmap}
                  disabled={!isOnline || refreshing}
                  style={[
                    styles.linkBtn,
                    { borderColor: t.border, opacity: (!isOnline || refreshing) ? 0.4 : 1 },
                  ]}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color={t.accent} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="refresh" size={14} color={t.accent} style={{ marginRight: 4 }} />
                      <Text style={[styles.linkBtnText, { color: t.accent }]}>
                        {tr('settings.refreshSlackmap')}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {!isOnline && (
                <Text style={[styles.offlineHint, { color: t.textMuted }]}>
                  ⚠ {tr('settings.offlineHint')}
                </Text>
              )}
            </View>

            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('settings.offlineMap')}</Text>
              <Text style={[styles.updateSubtext, { color: t.textDim, marginBottom: 8 }]}>
                {tr('settings.offlineMapHint')}
              </Text>
              <View style={styles.updateRow}>
                <Text style={[styles.updateLabel, { color: t.text, flex: 1 }]}>
                  {tr('settings.clearCache')}
                </Text>
                <Pressable
                  onPress={handleClearMapCache}
                  disabled={clearingCache}
                  style={[styles.linkBtn, { borderColor: t.border, opacity: clearingCache ? 0.4 : 1 }]}
                >
                  {clearingCache ? (
                    <ActivityIndicator size="small" color={t.accent} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="trash-can-outline" size={14} color={t.accent} style={{ marginRight: 4 }} />
                      <Text style={[styles.linkBtnText, { color: t.accent }]}>
                        {tr('settings.clearCacheBtn')}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Level switcher (v0.7.3) */}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('level.sectionTitle')}</Text>
              <Text style={[styles.updateSubtext, { color: t.textDim, marginBottom: 8 }]}>
                {tr('level.hint')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(['beginner', 'walker', 'rigger'] as UserLevel[]).map((l) => (
                  <Chip
                    key={l}
                    label={tr(`level.${l}`)}
                    active={level === l}
                    onPress={() => setLevel(l)}
                    theme={t}
                  />
                ))}
              </View>
              <Text style={[styles.updateSubtext, { color: t.textDim, marginTop: 6 }]}>
                {tr(`level.${level}Hint`)}
              </Text>
            </View>

            {/* Velikost písma (v0.7.16) */}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('settings.fontSize')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {([
                  ['normal', 'settings.fontNormal'],
                  ['large', 'settings.fontLarge'],
                  ['xlarge', 'settings.fontXlarge'],
                ] as [FontSize, string][]).map(([size, key]) => (
                  <Chip
                    key={size}
                    label={tr(key)}
                    active={fontSize === size}
                    onPress={() => setFontSize(size)}
                    theme={t}
                  />
                ))}
              </View>
            </View>

            {/* Community (v0.7.3) */}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('community.sectionLabel')}</Text>
              <View style={styles.updateRow}>
                <Text style={[styles.updateLabel, { color: t.text, flex: 1 }]}>
                  {tr('community.title')}
                </Text>
                <Pressable
                  onPress={() => { setCommunityCountry('CZ'); setCommunityOpen(true); }}
                  style={[styles.linkBtn, { borderColor: t.border }]}
                >
                  <MaterialCommunityIcons name="account-group-outline" size={14} color={t.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.linkBtnText, { color: t.accent }]}>
                    {tr('community.openBtn')}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* v0.8.0: ISA Safety Companion link odstranen — ISA je vlastni tab v bottom bar */}

            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textMuted }]}>{tr('settings.slackmapAccount')}</Text>
              <Text style={[styles.updateSubtext, { color: t.textDim, marginBottom: 8 }]}>
                {tr('settings.slackmapAccountHint')}
              </Text>
              <View style={styles.updateRow}>
                {isAuthenticated && authUser ? (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.updateLabel, { color: t.text }]} numberOfLines={1}>
                        {authUser.email}
                      </Text>
                      <Text style={[styles.updateSubtext, { color: t.textDim }]}>
                        {tr('settings.signedIn')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleSignOut}
                      style={[styles.linkBtn, { borderColor: t.border }]}
                    >
                      <MaterialCommunityIcons name="logout" size={14} color={t.accent} style={{ marginRight: 4 }} />
                      <Text style={[styles.linkBtnText, { color: t.accent }]}>
                        {tr('settings.signOut')}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={[styles.updateLabel, { color: t.text, flex: 1 }]}>
                      {tr('settings.notSignedIn')}
                    </Text>
                    <Pressable
                      onPress={handleSignIn}
                      disabled={!authReady || signingIn}
                      style={[
                        styles.linkBtn,
                        { borderColor: t.border, opacity: (!authReady || signingIn) ? 0.4 : 1 },
                      ]}
                    >
                      {signingIn ? (
                        <ActivityIndicator size="small" color={t.accent} />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="login" size={14} color={t.accent} style={{ marginRight: 4 }} />
                          <Text style={[styles.linkBtnText, { color: t.accent }]}>
                            {tr('settings.signIn')}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
  );

  // Nested sheets — spolecne pro modal i inline mode.
  const nestedSheets = (
    <>
      {/* v0.8.0: ISASafetySheet nested je dead code — ISA je vlastni tab.
          Ponechano visible=false pro backward compat, odstranime v v0.8.0.x. */}
      <ISASafetySheet visible={isaSheetOpen} onClose={() => setIsaSheetOpen(false)} />
      <CommunitySheet
        visible={communityOpen}
        countryCode={communityCountry}
        onClose={() => setCommunityOpen(false)}
      />
    </>
  );

  // v0.8.0 inline mode — plna obrazovka tab (SettingsScreen wrapper).
  // Zadny backdrop, zadny close X, zadny footer Done tlacitko.
  if (mode === 'inline') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.surface }} edges={['top']}>
        {header}
        {scrollBody}
        {nestedSheets}
      </SafeAreaView>
    );
  }

  // Modal mode (deprecated v0.8.0, ponechano pro backward compat).
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          {header}
          {scrollBody}
          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <Pressable onPress={onClose} style={[styles.footerBtn, { backgroundColor: t.accent }]}>
              <Text style={{ color: t.accentOn, fontWeight: '600' }}>{tr('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {nestedSheets}
    </Modal>
  );
}

// Lidsky čitelný formát data — používá Intl.DateTimeFormat per jazyk.
// "16. 5. 2026" pro CS, "May 16, 2026" pro EN, "16 maja 2026" pro PL.
function formatRefreshDate(iso: string, lang: Lang): string {
  try {
    const d = new Date(iso);
    const locale = lang === 'cs' ? 'cs-CZ' : lang === 'pl' ? 'pl-PL' : 'en-US';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function Chip({
  label,
  icon,
  active,
  onPress,
  theme,
}: {
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
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
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={14}
          color={active ? theme.accentOn : theme.text}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={{ color: active ? theme.accentOn : theme.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // 0.6 opacity (předtím 0.4) — víc kontrastní zatmavení, Settings sheet
    // vypadá víc jak "modal nad apkou", ne jak "průhledná folie".
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: { flex: 1 },
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
  row: { paddingVertical: 10, paddingHorizontal: 16 },
  rowLabel: { fontSize: 12, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: { fontSize: 11 },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  updateLabel: { fontSize: 13, fontWeight: '500' },
  updateSubtext: { fontSize: 11, marginTop: 2 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 100,
    justifyContent: 'center',
  },
  linkBtnText: { fontSize: 12, fontWeight: '500' },
  offlineHint: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
