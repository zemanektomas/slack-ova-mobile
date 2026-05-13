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

      {detail.description && (
        <Text style={[styles.body, { color: t.text }]}>{detail.description}</Text>
      )}

      {detail.restriction && (
        <Text style={[styles.restriction, { color: t.danger, backgroundColor: t.dangerBg }]}>
          ⚠ {detail.restriction}
        </Text>
      )}

      <PointBlock t={t} label={tr('detail.anchor1')} point={detail.first_anchor_point} />
      <PointBlock t={t} label={tr('detail.anchor2')} point={detail.second_anchor_point} />
      <PointBlock t={t} label={tr('detail.parking')} point={detail.parking_spot} />

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

      <Text style={[styles.attribution, { color: t.textDim }]}>
        {tr('detail.source', { name: detail.source === 'slackmap' ? 'slackmap.com' : 'slack.cz' })}
      </Text>
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
  location: { fontSize: 11, marginTop: 4 },
  author: { fontSize: 11 },
  attribution: { fontSize: 10, marginTop: 4, fontStyle: 'italic' },
});
