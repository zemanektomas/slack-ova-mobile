// Detail slackline vyrolovaný pod jejím řádkem v seznamu.
// Čte ze SQLite, žádná nová obrazovka. Kompaktní layout.

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getSlacklineDetail } from '../db/queries';
import { fetchAndCacheSlackmapDetail } from '../db/slackmap';
import { useTheme, Theme } from '../theme';
import type { SlacklineDetail, PointResponse } from '../types';

export default function InlineDetail({ slacklineId }: { slacklineId: number }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [detail, setDetail] = useState<SlacklineDetail | null>(null);

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

  return (
    <View style={[styles.box, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
      <View style={styles.statsRow}>
        <Stat t={t} label={tr('detail.length')} value={detail.length ? `${detail.length} m` : '—'} />
        <Stat t={t} label={tr('detail.height')} value={detail.height ? `${detail.height} m` : '—'} />
        <Stat t={t} label={tr('detail.rating')} value={detail.rating ? '★'.repeat(detail.rating) : '—'} />
        <Stat t={t} label={tr('detail.type')} value={detail.type ?? '—'} />
      </View>

      {detail.is_measured === 0 && (
        <Text style={[styles.warning, { color: t.textMuted }]}>
          ⚠ {tr('detail.notMeasured')}
        </Text>
      )}

      {detail.description && (
        <Text style={[styles.body, { color: t.text }]}>{detail.description}</Text>
      )}

      {detail.restriction && !isNoRestriction(detail.restriction) && (
        <Text style={[styles.restriction, { color: t.danger, backgroundColor: t.dangerBg }]}>
          ⚠ {detail.restriction}
        </Text>
      )}

      {detail.anchors_info && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{tr('detail.anchorsInfo')}</Text>
          <Text style={[styles.sectionBody, { color: t.text }]}>{detail.anchors_info}</Text>
        </View>
      )}

      {detail.access_info && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{tr('detail.accessInfo')}</Text>
          <Text style={[styles.sectionBody, { color: t.text }]}>{detail.access_info}</Text>
        </View>
      )}

      <PointBlock t={t} label={tr('detail.anchor1')} point={detail.first_anchor_point} />
      <PointBlock t={t} label={tr('detail.anchor2')} point={detail.second_anchor_point} />
      <PointBlock t={t} label={tr('detail.parking')} point={detail.parking_spot} />

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
    </View>
  );
}

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

function Stat({ t, label, value }: { t: Theme; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: t.textDim }]}>{label}</Text>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

function PointBlock({ t, label, point }: { t: Theme; label: string; point: PointResponse | null | undefined }) {
  if (!point) return null;
  const openInMaps = () => {
    Linking.openURL(`https://mapy.cz/turisticka?q=${point.latitude},${point.longitude}`);
  };
  return (
    <Pressable onPress={openInMaps} style={styles.pointRow}>
      <Text style={[styles.pointLabel, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.pointCoords, { color: t.accent }]}>
        {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)} →
      </Text>
    </Pressable>
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
  stat: { flexBasis: '25%', paddingHorizontal: 4 },
  statLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  body: { fontSize: 13, lineHeight: 18 },
  restriction: { fontSize: 12, padding: 8, borderRadius: 4 },
  pointRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  pointLabel: { fontSize: 12 },
  pointCoords: { fontSize: 12, fontFamily: 'monospace' },
  warning: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  section: { marginTop: 8 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  sectionBody: { fontSize: 13, lineHeight: 18 },
  accessRow: { marginTop: 6, gap: 2 },
  accessItem: { fontSize: 12 },
  nameHistory: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  location: { fontSize: 11, marginTop: 4 },
  author: { fontSize: 11 },
  attribution: { fontSize: 10, marginTop: 4, fontStyle: 'italic' },
});
