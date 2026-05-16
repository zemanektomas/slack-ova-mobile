import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { useMapStore, MapKind, SourceFilter } from '../store/mapStore';
import { useLangStore } from '../store/langStore';
import type { Lang } from '../i18n';
import { useTheme } from '../theme';

// Verze z app.json — během dev mode `Constants.expoConfig`, v release přes
// `Application` API. Pro náš účel ukázat uživateli stačí Constants (funguje vždy).
const APP_VERSION = Constants.expoConfig?.version ?? '?.?.?';
const APP_BUILD = Constants.expoConfig?.android?.versionCode ?? '?';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
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

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: t.text }]}>{tr('settings.title')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

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
            <Text style={[styles.version, { color: t.textDim }]}>
              Slackline.Ova {APP_VERSION} (build {APP_BUILD})
            </Text>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <Pressable onPress={onClose} style={[styles.footerBtn, { backgroundColor: t.accent }]}>
              <Text style={{ color: t.accentOn, fontWeight: '600' }}>{tr('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  version: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
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
