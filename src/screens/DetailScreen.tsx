// Detail jedné slackline. Čte ze SQLite, lazy fetch pro chybějící pole.

import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Pressable, Linking, Image,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getSlacklineDetail } from '../db/queries';
import { fetchAndCacheDetail } from '../api/sync';
import { useTheme, Theme } from '../theme';
import type { SlacklineDetail, PointResponse } from '../types';

export default function DetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const slacklineId = Number(id);
  const [detail, setDetail] = useState<SlacklineDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await getSlacklineDetail(slacklineId);
      if (!cancelled) setDetail(local);

      // Lazy fetch jen pokud chybí description (= detail nebyl ještě stažen).
      // V dev režimu bez backendu tohle tiše selže — nevadí, máme data z CSV.
      if (local && (local.description === null || local.description === undefined)) {
        try {
          await fetchAndCacheDetail(slacklineId);
          const refreshed = await getSlacklineDetail(slacklineId);
          if (!cancelled) setDetail(refreshed);
        } catch {
          // bez backendu se sem dostaneme — ignorovat
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slacklineId]);

  if (loading && !detail) {
    return (
      <View style={[styles.loading, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.loading, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.textDim }}>Slackline nenalezena</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: detail.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: t.surface }}
        contentContainerStyle={styles.content}
      >
        {detail.cover_image_url && (
          <Image
            source={{ uri: resolveImageUrl(detail.cover_image_url) }}
            style={[styles.cover, { backgroundColor: t.surfaceAlt }]}
            resizeMode="cover"
          />
        )}

        <Text style={[styles.name, { color: t.text }]}>{detail.name}</Text>

        <Text style={[styles.locationLine, { color: t.textMuted }]}>
          {[detail.state, detail.region, detail.sector].filter(Boolean).join(' · ') || '—'}
        </Text>

        <View style={[styles.statsRow, { borderColor: t.border }]}>
          <Stat t={t} label="Délka" value={detail.length ? `${detail.length} m` : '—'} />
          <Stat t={t} label="Výška" value={detail.height ? `${detail.height} m` : '—'} />
          <Stat t={t} label="Rating" value={detail.rating ? '★'.repeat(detail.rating) : '—'} />
          <Stat t={t} label="Typ" value={detail.type ?? '—'} />
        </View>

        {detail.description && (
          <Section t={t} title="Popis">
            <Text style={[styles.body, { color: t.text }]}>{detail.description}</Text>
          </Section>
        )}

        {detail.restriction && (
          <Section t={t} title="Omezení">
            <Text style={[
              styles.body,
              { color: t.danger, backgroundColor: t.dangerBg, padding: 10, borderRadius: 6 },
            ]}>{detail.restriction}</Text>
          </Section>
        )}

        <Section t={t} title="Kotvy">
          <PointBlock t={t} label="Kotva 1" point={detail.first_anchor_point} />
          <PointBlock t={t} label="Kotva 2" point={detail.second_anchor_point} />
          <PointBlock t={t} label="Parkoviště" point={detail.parking_spot} />
        </Section>

        <Section t={t} title="Detaily">
          <Row t={t} label="Autor" value={detail.author} />
          <Row t={t} label="Historie názvu" value={detail.name_history} />
          <Row t={t} label="První rig" value={detail.date_tense} />
          <Row t={t} label="Přístup" value={detail.time_approach} />
          <Row t={t} label="Doba rigování" value={detail.time_tensioning} />
        </Section>
      </ScrollView>
    </>
  );
}

function resolveImageUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const { apiBaseUrl } = (require('expo-constants').default.expoConfig?.extra ?? {});
  return `${apiBaseUrl}${url}`;
}

function Stat({ t, label, value }: { t: Theme; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: t.textDim }]}>{label}</Text>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

function Section({ t, title, children }: { t: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: t.textDim }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ t, label, value }: { t: Theme; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

function PointBlock({ t, label, point }: { t: Theme; label: string; point: PointResponse | null | undefined }) {
  if (!point) return null;
  const openInMaps = () => {
    const url = `https://mapy.cz/turisticka?q=${point.latitude},${point.longitude}`;
    Linking.openURL(url);
  };
  return (
    <Pressable onPress={openInMaps} style={[styles.pointBlock, { backgroundColor: t.surfaceAlt }]}>
      <Text style={[styles.pointLabel, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.pointCoords, { color: t.text }]}>
        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
      </Text>
      {point.description && <Text style={[styles.pointDesc, { color: t.textMuted }]}>{point.description}</Text>}
      <Text style={[styles.openMaps, { color: t.accent }]}>Otevřít v Mapy.cz →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: { width: '100%', height: 220 },
  name: { fontSize: 24, fontWeight: '700', marginHorizontal: 16, marginTop: 16 },
  locationLine: { marginHorizontal: 16, marginTop: 4, fontSize: 13 },
  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 8, marginTop: 16,
    paddingBottom: 8, borderBottomWidth: 1,
  },
  stat: { flexBasis: '25%', paddingHorizontal: 8, paddingVertical: 6 },
  statLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  section: { marginTop: 16, marginHorizontal: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8,
  },
  body: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', paddingVertical: 6 },
  rowLabel: { width: 130, fontSize: 13 },
  rowValue: { flex: 1, fontSize: 13 },
  pointBlock: { padding: 12, borderRadius: 8, marginBottom: 8 },
  pointLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  pointCoords: { fontSize: 13, fontFamily: 'monospace' },
  pointDesc: { fontSize: 12, marginTop: 4 },
  openMaps: { fontSize: 12, marginTop: 6 },
});
