// Detail slackline vyrolovaný pod jejím řádkem v seznamu.
// Čte ze SQLite, žádná nová obrazovka. Kompaktní layout.
// Pořadí sekcí: akce (souřadnice + Navigovat) nad popisem, metadata na konec —
// uživatel co tappne řádek typicky řeší "kde to je / jak se tam dostanu",
// ne "co o tom psal autor".

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSlacklineDetail } from '../db/queries';
import { fetchAndCacheSlackmapDetail } from '../db/slackmap';
import { useMapStore } from '../store/mapStore';
import { useLangStore } from '../store/langStore';
import { useTheme, Theme } from '../theme';
import { translateOnDevice, UnsupportedSourceLangError, SupportedLang } from '../i18n/translate';
import type { SlacklineDetail, PointResponse } from '../types';
import { QuickCheckSheet } from './QuickCheckSheet';
import { FullRigLogSheet } from './FullRigLogSheet';
import { CommunitySheet } from './CommunitySheet';
import { generateQuickCheckForLine } from '../data/isa/quickCheck';
import { getLastLineSafetyCheck, countLineSafetyChecks, LineSafetyCheck } from '../db/lineSafetyChecks';
import { useLevelStore } from '../store/levelStore';
import { extractCountryCode } from '../api/community';

// Stav překladu jedné textové sekce (description / anchors_info / access_info).
// Klíč v translations objektu = sekce ('description' | 'anchors' | 'access').
// Original = false → zobraz originál, true → zobraz překlad. Default original.
type TranslateState = {
  loading: boolean;
  translated?: string;     // přeložený text (cached během života komponenty)
  detectedLang?: string;   // BCP-47 zdrojový jazyk po identifikaci
  showOriginal: boolean;   // toggle zobrazení
  error?: string;          // user-friendly message po chybě
};

const initialTranslate = (): TranslateState => ({
  loading: false,
  showOriginal: true,
});

export default function InlineDetail({ slacklineId }: { slacklineId: number }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const focusOn = useMapStore((s) => s.focusOn);
  const lang = useLangStore((s) => s.lang) as SupportedLang;
  const [detail, setDetail] = useState<SlacklineDetail | null>(null);

  // Per-section translation state. Reset při změně lajny (slacklineId).
  const [translations, setTranslations] = useState<Record<string, TranslateState>>({});
  useEffect(() => {
    setTranslations({});
  }, [slacklineId, lang]);

  // Safety check state (F5 v0.7.2)
  const [safetyExpanded, setSafetyExpanded] = useState(false);
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);
  const [fullSheetOpen, setFullSheetOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState<LineSafetyCheck | null>(null);
  const [checkCount, setCheckCount] = useState(0);

  // Level + Community (v0.7.3)
  const level = useLevelStore((s) => s.level);
  const [communitySheetOpen, setCommunitySheetOpen] = useState(false);

  const loadSafetyStats = async () => {
    try {
      const [last, count] = await Promise.all([
        getLastLineSafetyCheck(slacklineId),
        countLineSafetyChecks(slacklineId),
      ]);
      setLastCheck(last);
      setCheckCount(count);
    } catch {}
  };

  useEffect(() => {
    setSafetyExpanded(false);
    setLastCheck(null);
    setCheckCount(0);
    loadSafetyStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slacklineId]);

  const handleTranslate = async (key: string, sourceText: string) => {
    const prev = translations[key] ?? initialTranslate();

    // Pokud už máme cached překlad, jen toggle. Bez druhého ML Kit volání.
    if (prev.translated) {
      setTranslations((s) => ({ ...s, [key]: { ...prev, showOriginal: !prev.showOriginal } }));
      return;
    }

    setTranslations((s) => ({ ...s, [key]: { ...prev, loading: true, error: undefined } }));
    try {
      const result = await translateOnDevice(sourceText, lang);
      setTranslations((s) => ({
        ...s,
        [key]: {
          loading: false,
          translated: result.text,
          detectedLang: result.sourceLang,
          showOriginal: result.sourceLang === lang,  // pokud je už ve správném jazyce, ukazujeme originál
        },
      }));
    } catch (e: any) {
      const isUnsupported = e instanceof UnsupportedSourceLangError;
      setTranslations((s) => ({
        ...s,
        [key]: {
          loading: false,
          showOriginal: true,
          error: isUnsupported ? tr('detail.translateUnsupported') : tr('detail.translateError'),
        },
      }));
      Alert.alert(
        tr('detail.translateError'),
        isUnsupported
          ? tr('detail.translateUnsupportedHint')
          : tr('detail.translateErrorHint'),
      );
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await getSlacklineDetail(slacklineId);
      if (!cancelled) setDetail(local);

      // Lazy fetch detailu ze Slackmap, pokud linie pochází z něj a chybí description.
      if (local?.source === 'slackmap' && !local.description) {
        try {
          await fetchAndCacheSlackmapDetail(slacklineId);
          const refreshed = await getSlacklineDetail(slacklineId);
          if (!cancelled) setDetail(refreshed);
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [slacklineId]);

  if (!detail) {
    return (
      <View style={[styles.box, { backgroundColor: t.surfaceAlt }]}>
        <Text style={{ color: t.textDim }}>{tr('common.loading')}</Text>
      </View>
    );
  }

  const focusAnchor1 = () => {
    const p = detail.first_anchor_point;
    if (p) focusOn(p.latitude, p.longitude);
  };

  return (
    <View style={[styles.box, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
      {/* 1) Stats — quick scan parametrů (rating přesunutý do metadata) */}
      <View style={styles.statsRow}>
        <Stat t={t} label={tr('detail.length')} value={detail.length ? `${detail.length} m` : '—'} />
        <Stat t={t} label={tr('detail.height')} value={detail.height ? `${detail.height} m` : '—'} />
        <Stat t={t} label={tr('detail.type')} value={detail.type ?? '—'} />
      </View>

      {/* 2) Restriction warning — varování nahoře, ať není přehlédnutelné */}
      {detail.restriction && !isNoRestriction(detail.restriction) && (
        <Text style={[styles.restriction, { color: t.danger, backgroundColor: t.dangerBg }]}>
          ⚠ {detail.restriction}
        </Text>
      )}

      {/* 3) Souřadnice — anchor1 s focus tlačítkem na mapě */}
      <PointBlock
        t={t}
        label={tr('detail.anchor1')}
        point={detail.first_anchor_point}
        onFocusMap={focusAnchor1}
        focusLabel={tr('detail.focusOnMap')}
      />
      <PointBlock t={t} label={tr('detail.anchor2')} point={detail.second_anchor_point} />
      <PointBlock t={t} label={tr('detail.parking')} point={detail.parking_spot} />

      {/* 4) Navigovat — primární akce (geo: intent → system picker) */}
      {(() => {
        const target = detail.parking_spot ?? detail.first_anchor_point;
        if (!target) return null;
        const openNavigate = () => {
          const lat = target.latitude;
          const lon = target.longitude;
          // `geo:LAT,LON?q=LAT,LON` — `q` parametr donutí Android zobrazit picker
          // místo automatického otevření default map app (typicky Google Maps).
          Linking.openURL(`geo:${lat},${lon}?q=${lat},${lon}`);
        };
        return (
          <Pressable onPress={openNavigate} style={[styles.navigateBtn, { borderColor: t.accent }]}>
            <Text style={[styles.navigateText, { color: t.accent }]}>
              ↗ {tr('detail.navigate')}
            </Text>
          </Pressable>
        );
      })()}

      {/* 5) Description — translatable on-device */}
      {detail.description && (
        <TranslatableBlock
          t={t}
          tr={tr}
          original={detail.description}
          state={translations['description']}
          onTranslate={() => handleTranslate('description', detail.description!)}
        />
      )}

      {/* 6) Terénní info — kotvy / přístup / časy. Anchors a access taky translatable. */}
      {detail.anchors_info && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{tr('detail.anchorsInfo')}</Text>
          <TranslatableBlock
            t={t}
            tr={tr}
            original={detail.anchors_info}
            state={translations['anchors']}
            onTranslate={() => handleTranslate('anchors', detail.anchors_info!)}
            small
          />
        </View>
      )}

      {detail.access_info && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{tr('detail.accessInfo')}</Text>
          <TranslatableBlock
            t={t}
            tr={tr}
            original={detail.access_info}
            state={translations['access']}
            onTranslate={() => handleTranslate('access', detail.access_info!)}
            small
          />
        </View>
      )}

      {(detail.time_approach || detail.time_tensioning) && (
        <View style={styles.accessRow}>
          {detail.time_approach && (
            <Text style={[styles.accessItem, { color: t.textMuted }]}>
              {tr('detail.timeApproach')}: <Text style={{ color: t.text }}>{detail.time_approach}</Text>
            </Text>
          )}
          {detail.time_tensioning && (
            <Text style={[styles.accessItem, { color: t.textMuted }]}>
              {tr('detail.timeTensioning')}: <Text style={{ color: t.text }}>{detail.time_tensioning}</Text>
            </Text>
          )}
        </View>
      )}

      {detail.is_measured === 0 && (
        <Text style={[styles.warning, { color: t.textMuted }]}>
          ⚠ {tr('detail.notMeasured')}
        </Text>
      )}

      {/* 7) Metadata — historie / lokace / autor / rating */}
      {detail.name_history && (
        <Text style={[styles.nameHistory, { color: t.textMuted }]}>
          {tr('detail.nameHistory')}: <Text style={{ color: t.text }}>{detail.name_history}</Text>
        </Text>
      )}

      {(detail.state || detail.region || detail.sector) && (
        <Text style={[styles.location, { color: t.textMuted }]}>
          {[detail.state, detail.region, detail.sector].filter(Boolean).join(' · ')}
        </Text>
      )}

      {detail.author && (
        <Text style={[styles.author, { color: t.textMuted }]}>
          {tr('detail.author', { name: detail.author })}
        </Text>
      )}

      {detail.rating != null && detail.rating > 0 && (
        <Text style={[styles.author, { color: t.textMuted }]}>
          {tr('detail.rating')}: <Text style={{ color: t.text }}>{'★'.repeat(detail.rating)}</Text>
        </Text>
      )}

      {/* 8) Source link */}
      {(() => {
        const url = detailSourceUrl(detail);
        const sourceLabel = detail.source === 'slackmap' ? 'slackmap.com' : 'slack.cz';
        if (!url) {
          return (
            <Text style={[styles.attribution, { color: t.textDim }]}>
              {tr('detail.source', { name: sourceLabel })}
            </Text>
          );
        }
        return (
          <Pressable onPress={() => Linking.openURL(url)}>
            <Text style={[styles.attribution, { color: t.accent, textDecorationLine: 'underline' }]}>
              {tr('detail.source', { name: sourceLabel })} →
            </Text>
          </Pressable>
        );
      })()}

      {/* 9) Bezpečnostní kontrola (F5 v0.7.2) — expandable pod zdrojem */}
      <SafetySection
        t={t}
        tr={tr}
        detail={detail}
        expanded={safetyExpanded}
        onToggleExpand={() => setSafetyExpanded((v) => !v)}
        lastCheck={lastCheck}
        checkCount={checkCount}
        lang={lang}
        onStartQuick={() => setQuickSheetOpen(true)}
        onStartFull={() => setFullSheetOpen(true)}
      />

      {/* 10) Community — v0.7.3, pod Bezpečnostní kontrolou */}
      {(() => {
        const country = extractCountryCode(detail.state);
        if (!country) return null;
        return (
          <View style={{ marginTop: 12 }}>
            <Pressable
              onPress={() => setCommunitySheetOpen(true)}
              style={[communityStyles.btn, { borderColor: t.border, backgroundColor: t.surfaceAlt }]}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={16}
                color={t.text}
                style={{ marginRight: 8 }}
              />
              <Text style={[communityStyles.btnText, { color: t.text }]}>
                {tr('community.openBtn')} ({country})
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={t.textMuted} />
            </Pressable>
          </View>
        );
      })()}

      {/* 11) Advisory pro začátečníka — jen když level='beginner' */}
      {level === 'beginner' && (
        <View style={[noviceStyles.box, { borderColor: '#e11d48', backgroundColor: t.surfaceAlt }]}>
          <View style={noviceStyles.header}>
            <MaterialCommunityIcons name="alert-outline" size={16} color="#e11d48" style={{ marginRight: 6 }} />
            <Text style={[noviceStyles.title, { color: t.text }]}>
              {tr('novice.advisoryTitle')}
            </Text>
          </View>
          <Text style={[noviceStyles.body, { color: t.textMuted }]}>
            {tr('novice.advisoryBody')}
          </Text>
          {extractCountryCode(detail.state) && (
            <Pressable
              onPress={() => setCommunitySheetOpen(true)}
              style={noviceStyles.link}
            >
              <MaterialCommunityIcons name="arrow-right" size={14} color={t.accent} />
              <Text style={[noviceStyles.linkText, { color: t.accent }]}>
                {tr('novice.showCommunity')}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <QuickCheckSheet
        visible={quickSheetOpen}
        line={detail}
        onClose={() => setQuickSheetOpen(false)}
        onSaved={loadSafetyStats}
      />
      <FullRigLogSheet
        visible={fullSheetOpen}
        line={detail}
        onClose={() => setFullSheetOpen(false)}
        onSaved={loadSafetyStats}
      />
      <CommunitySheet
        visible={communitySheetOpen}
        countryCode={extractCountryCode(detail.state)}
        onClose={() => setCommunitySheetOpen(false)}
      />
    </View>
  );
}

// -----------------------------------------------------------------------------

const noviceStyles = StyleSheet.create({
  box: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 13, fontWeight: '600' },
  body: { fontSize: 12, lineHeight: 16 },
  link: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  linkText: { fontSize: 12, fontWeight: '500', marginLeft: 4 },
});

const communityStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  btnText: { flex: 1, fontSize: 13, fontWeight: '500' },
});

// -----------------------------------------------------------------------------

function SafetySection({
  t, tr, detail, expanded, onToggleExpand, lastCheck, checkCount, lang, onStartQuick, onStartFull,
}: {
  t: Theme;
  tr: (k: string, opts?: any) => string;
  detail: SlacklineDetail;
  expanded: boolean;
  onToggleExpand: () => void;
  lastCheck: LineSafetyCheck | null;
  checkCount: number;
  lang: SupportedLang;
  onStartQuick: () => void;
  onStartFull: () => void;
}) {
  const { items } = generateQuickCheckForLine(detail);

  const lastCheckLabel = lastCheck
    ? lastCheck.checked_items >= lastCheck.total_items
      ? tr('lineSafety.lastCheckedComplete', { date: formatCheckDate(lastCheck.timestamp, lang) })
      : tr('lineSafety.lastCheckedPartial', {
          date: formatCheckDate(lastCheck.timestamp, lang),
          checked: lastCheck.checked_items,
          total: lastCheck.total_items,
        })
    : tr('lineSafety.neverChecked');

  const typeText = detail.type
    ? detail.length && detail.height
      ? tr('lineSafety.typeAndDims', {
          type: detail.type,
          length: Math.round(detail.length),
          height: Math.round(detail.height),
        })
      : detail.length
        ? tr('lineSafety.typeAndLength', { type: detail.type, length: Math.round(detail.length) })
        : tr('lineSafety.typeOnly', { type: detail.type })
    : null;

  return (
    <View style={{ marginTop: 12 }}>
      <Pressable
        onPress={onToggleExpand}
        style={[
          safetyStyles.header,
          { borderColor: t.border, backgroundColor: t.surfaceAlt },
        ]}
      >
        <MaterialCommunityIcons
          name="shield-check-outline"
          size={20}
          color={t.text}
          style={{ marginRight: 10 }}
        />
        <Text style={[safetyStyles.title, { color: t.text }]}>
          {tr('lineSafety.sectionTitle')}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={t.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={[safetyStyles.body, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
          <Text style={[safetyStyles.lastCheck, { color: t.textMuted }]}>
            {lastCheckLabel}
          </Text>

          <Text style={[safetyStyles.intro, { color: t.textMuted }]}>
            {tr('lineSafety.listIntroForLine')}
          </Text>
          {typeText && (
            <Text style={[safetyStyles.typeText, { color: t.textDim }]}>({typeText})</Text>
          )}

          <View style={{ marginTop: 6 }}>
            {items.map((item) => (
              <View key={item.id} style={safetyStyles.itemRow}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={16}
                  color={t.textMuted}
                  style={{ marginRight: 8 }}
                />
                <Text style={[safetyStyles.itemLabel, { color: t.text }]} numberOfLines={2}>
                  {tr(item.labelKey)}
                </Text>
              </View>
            ))}
          </View>

          <View style={safetyStyles.actionsRow}>
            <Pressable
              onPress={onStartQuick}
              style={[safetyStyles.actionBtn, { backgroundColor: t.accent }]}
            >
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={16}
                color={t.accentOn}
                style={{ marginRight: 6 }}
              />
              <View>
                <Text style={{ color: t.accentOn, fontWeight: '600', fontSize: 13 }}>
                  {tr('quickCheck.menuLabel')}
                </Text>
                <Text style={{ color: t.accentOn, fontSize: 10, opacity: 0.85 }}>
                  {tr('quickCheck.menuHint')}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={onStartFull}
              style={[safetyStyles.actionBtn, { borderWidth: 1, borderColor: t.accent }]}
            >
              <MaterialCommunityIcons
                name="wrench-outline"
                size={16}
                color={t.accent}
                style={{ marginRight: 6 }}
              />
              <View>
                <Text style={{ color: t.accent, fontWeight: '600', fontSize: 13 }}>
                  {tr('rigLog.menuLabel')}
                </Text>
                <Text style={{ color: t.textDim, fontSize: 10 }}>
                  {tr('rigLog.menuHint')}
                </Text>
              </View>
            </Pressable>
          </View>

          {checkCount > 0 && (
            <Text style={[safetyStyles.historyLink, { color: t.textDim }]}>
              📜 {tr('lineSafety.openHistory', { count: checkCount })}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function formatCheckDate(iso: string, lang: SupportedLang): string {
  try {
    const d = new Date(iso);
    const locale = lang === 'cs' ? 'cs-CZ' : lang === 'pl' ? 'pl-PL' : 'en-US';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

const safetyStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  body: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 12,
    marginTop: -1,
  },
  lastCheck: { fontSize: 11, marginBottom: 10, fontStyle: 'italic' },
  intro: { fontSize: 12, marginBottom: 2 },
  typeText: { fontSize: 11, marginBottom: 6 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemLabel: { flex: 1, fontSize: 12 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  historyLink: { fontSize: 11, marginTop: 8, textAlign: 'center' },
});

// Slackmap restriction `"none"` / `"none: ..."` znamená "žádná omezení" — nepatří
// do červeného warningu. Skutečná varování začínají `"partial"` nebo `"full"`.
function isNoRestriction(r: string): boolean {
  const lower = r.trim().toLowerCase();
  return lower === 'none' || lower.startsWith('none:') || lower.startsWith('none ');
}

// Sestaví URL na zdroj lajny.
//   slackmap:   https://slackmap.com/line/{external_id}  (external_id je hash, přímý link na detail)
//   slack.cz:   https://slack.cz/highlines/?search={name} (CSV id ≠ slack.cz public id,
//               proto fallback na search; user pak klikne na svou lajnu v seznamu)
// Vrátí null pokud chybí potřebné identifikátory.
function detailSourceUrl(d: SlacklineDetail): string | null {
  if (d.source === 'slackmap') {
    if (!d.external_id) return null;
    return `https://slackmap.com/line/${d.external_id}`;
  }
  // slack.cz — search místo direct detail kvůli ID mismatch
  if (!d.name || d.name.trim().length === 0) return null;
  return `https://slack.cz/highlines/?search=${encodeURIComponent(d.name)}`;
}

// Block uživatelského textu (description / anchors_info / access_info) s on-device
// translate buttonem. První tap stáhne ML Kit model (~30 MB, WiFi), druhý tap toggle
// zpět na originál. Bez clicku zůstává originál. Pokud je detected lang = UI lang,
// button se přesto zobrazí (user pozná, že to v jeho jazyce už je).
interface TranslatableBlockProps {
  t: Theme;
  tr: (k: string, opts?: any) => string;
  original: string;
  state?: TranslateState;
  onTranslate: () => void;
  small?: boolean;  // pro anchors / access — menší font
}

function TranslatableBlock({ t, tr, original, state, onTranslate, small }: TranslatableBlockProps) {
  const showTranslated = state?.translated && !state.showOriginal;
  const displayText = showTranslated ? state!.translated! : original;
  const textStyle = small ? styles.sectionBody : styles.body;
  const sameLangAsUI = state?.detectedLang && !state.translated; // ML Kit identified, ale nebylo třeba překládat
  return (
    <View>
      <Text style={[textStyle, { color: t.text }]}>{displayText}</Text>
      <Pressable
        onPress={onTranslate}
        disabled={state?.loading}
        style={styles.translateBtn}
        hitSlop={6}
      >
        {state?.loading ? (
          <ActivityIndicator size="small" color={t.textMuted} />
        ) : (
          <MaterialCommunityIcons name="translate" size={14} color={t.textMuted} />
        )}
        <Text style={[styles.translateLabel, { color: t.textMuted }]}>
          {state?.loading
            ? tr('detail.translating')
            : showTranslated
              ? tr('detail.showOriginal')
              : sameLangAsUI
                ? tr('detail.sameLanguage')
                : tr('detail.translate')}
        </Text>
      </Pressable>
    </View>
  );
}

function Stat({ t, label, value }: { t: Theme; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: t.textDim }]}>{label}</Text>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

interface PointBlockProps {
  t: Theme;
  label: string;
  point: PointResponse | null | undefined;
  onFocusMap?: () => void;
  focusLabel?: string;
}

function PointBlock({ t, label, point, onFocusMap, focusLabel }: PointBlockProps) {
  if (!point) return null;
  // Tap na coords = preview bodu na mapě (Mapy.cz turistická). Pro plnohodnotnou
  // navigaci slouží samostatný "Navigovat" button mimo PointBlock — viz hlavní render.
  const openPreview = () => {
    Linking.openURL(`https://mapy.cz/turisticka?q=${point.latitude},${point.longitude}`);
  };
  return (
    <View style={styles.pointRow}>
      <Text style={[styles.pointLabel, { color: t.textMuted }]}>{label}</Text>
      <Pressable onPress={openPreview} style={styles.pointCoordsBtn}>
        <Text style={[styles.pointCoords, { color: t.accent }]}>
          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)} →
        </Text>
      </Pressable>
      {onFocusMap && (
        <Pressable
          onPress={onFocusMap}
          hitSlop={8}
          accessibilityLabel={focusLabel}
          style={styles.focusBtn}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={t.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  stat: { flexBasis: '33.333%', paddingHorizontal: 4 },
  statLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  body: { fontSize: 13, lineHeight: 18 },
  restriction: { fontSize: 12, padding: 8, borderRadius: 4 },
  pointRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, gap: 8 },
  pointLabel: { fontSize: 12, flexShrink: 0 },
  pointCoordsBtn: { flex: 1 },
  pointCoords: { fontSize: 12, fontFamily: 'monospace', textAlign: 'right' },
  focusBtn: { padding: 2 },
  navigateBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  navigateText: { fontSize: 13, fontWeight: '600' },
  warning: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  section: { marginTop: 8 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  sectionBody: { fontSize: 13, lineHeight: 18 },
  translateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, marginTop: 2 },
  translateLabel: { fontSize: 11, opacity: 0.8 },
  accessRow: { marginTop: 6, gap: 2 },
  accessItem: { fontSize: 12 },
  nameHistory: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  location: { fontSize: 11, marginTop: 4 },
  author: { fontSize: 11 },
  attribution: { fontSize: 10, marginTop: 4, fontStyle: 'italic' },
});
