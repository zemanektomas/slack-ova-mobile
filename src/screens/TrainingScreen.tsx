import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFontStore } from '../store/fontStore';

/**
 * Training tab — v0.8.0 scaffold.
 *
 * Struktura:
 *   - Discipline switcher (chips): Highline / Midline / Longline / Waterline / Rodeo / Freestyle / All
 *   - Sub-tab Journal: placeholder "Coming soon" (full CRUD v v0.8.1, SQLite training_sessions)
 *   - Sub-tab Resources: 7 externich edukacnich zdroju, tap -> Linking.openURL
 *
 * Data model pro Journal (v0.8.1):
 *   training_sessions (id, date, slackline_id FK nullable, discipline, length_m,
 *                      steps, style, rating, notes, trick_ids)
 */

type Discipline = 'all' | 'highline' | 'midline' | 'longline' | 'waterline' | 'rodeo' | 'freestyle';
type SubTab = 'journal' | 'resources';

interface Resource {
  id: string;
  title: string;
  author: string;
  desc: string;
  url: string;
  disciplines: Discipline[];
  free: boolean;
}

const RESOURCES: Resource[] = [
  {
    id: '40-postures',
    title: '40 Postures Slackline Beginners',
    author: 'Julien Desforges — Slackline Montreal',
    desc: 'Free 74-page e-book with 40 fundamental postures. Great progressive drill on short rodeo or park nylon.',
    url: 'https://slacklinemastery.com/FREE-EBOOK-40-Postures-Slackline-Beginners.pdf',
    disciplines: ['all', 'rodeo', 'freestyle'],
    free: true,
  },
  {
    id: 'slackline-mastery',
    title: 'Slackline Mastery Bundle',
    author: 'Julien Desforges',
    desc: 'Paid course, 5 modules: Beginner guide / Postures & Transitions / Walking & Turning / Mounting / Bouncing & Surfing.',
    url: 'https://slacklinemastery.com',
    disciplines: ['all'],
    free: false,
  },
  {
    id: 'roberto-notion',
    title: 'Knots & Anchors',
    author: 'Roberto de Oliveira — ISA Education Commission',
    desc: 'Public Notion database — 11 knots + 10 anchor configurations, tagged by family (DSB / f8 / Alpine Butterfly).',
    url: 'https://rodeooo.notion.site/3902927ea1434167908661a7fb2412b4',
    disciplines: ['highline'],
    free: true,
  },
  {
    id: 'balance-community',
    title: 'All About Highline Tape Spacing',
    author: 'Balance Community',
    desc: 'Practical tape spacing guide per line length (5-20m to 200+m). Anti-harmonic randomization principles.',
    url: 'https://www.balancecommunity.com/blogs/slack-science/all-about-highline-tape-spacing',
    disciplines: ['highline', 'longline'],
    free: true,
  },
  {
    id: 'hownot2',
    title: 'HowNot2 — Anchor Testing',
    author: 'Ryan Jenks',
    desc: 'Real-world anchor break tests: bolts, trees, boulders, ice. Empirical data for highline riggers.',
    url: 'https://hownot2.com',
    disciplines: ['highline'],
    free: true,
  },
  {
    id: 'philip-queen-blog',
    title: 'Philip Queen Blog',
    author: 'Philip Queen — ISA SafeCom',
    desc: 'Rigging science: force analysis, gear testing, longline recommendations. 5+ years in ISA safety commission.',
    url: 'https://philipqueen.com/blog',
    disciplines: ['highline', 'longline'],
    free: true,
  },
  {
    id: 'ropelab',
    title: 'RopeLab — Rope Physics',
    author: 'Richard Delaney',
    desc: 'Rope rescue physics with highline chapter (sag tension, force propagation). Statics-focused reference.',
    url: 'https://ropelab.com.au',
    disciplines: ['highline'],
    free: false,
  },
];

const DISCIPLINES: { key: Discipline; icon: string }[] = [
  { key: 'all', icon: 'all-inclusive' },
  { key: 'highline', icon: 'terrain' },
  { key: 'midline', icon: 'chart-timeline-variant' },
  { key: 'longline', icon: 'ray-start-arrow' },
  { key: 'waterline', icon: 'waves' },
  { key: 'rodeo', icon: 'sine-wave' },
  { key: 'freestyle', icon: 'rotate-360' },
];

export default function TrainingScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const fs = useFontStore((s) => s.fontScale);
  const [discipline, setDiscipline] = useState<Discipline>('all');
  const [subTab, setSubTab] = useState<SubTab>('resources');
  const s = makeStyles(t, fs);

  const filtered = RESOURCES.filter(
    (r) => discipline === 'all' || r.disciplines.includes('all') || r.disciplines.includes(discipline)
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Discipline switcher */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipsScroll}
        contentContainerStyle={s.chipsRow}
      >
        {DISCIPLINES.map((d) => {
          const active = discipline === d.key;
          return (
            <TouchableOpacity
              key={d.key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setDiscipline(d.key)}
            >
              <MaterialCommunityIcons
                name={d.icon as any}
                size={16}
                color={active ? t.accentOn : t.text}
              />
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {tr(`training.discipline.${d.key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sub-tab switcher */}
      <View style={s.subTabRow}>
        <TouchableOpacity
          style={[s.subTab, subTab === 'resources' && s.subTabActive]}
          onPress={() => setSubTab('resources')}
        >
          <Text style={[s.subTabText, subTab === 'resources' && s.subTabTextActive]}>
            {tr('training.subTab.resources')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.subTab, subTab === 'journal' && s.subTabActive]}
          onPress={() => setSubTab('journal')}
        >
          <Text style={[s.subTabText, subTab === 'journal' && s.subTabTextActive]}>
            {tr('training.subTab.journal')}
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'resources' ? (
        <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
          {filtered.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={s.card}
              onPress={() => Linking.openURL(r.url).catch(() => {})}
            >
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{r.title}</Text>
                {r.free ? (
                  <View style={s.badgeFree}>
                    <Text style={s.badgeFreeText}>FREE</Text>
                  </View>
                ) : (
                  <View style={s.badgePaid}>
                    <Text style={s.badgePaidText}>PAID</Text>
                  </View>
                )}
              </View>
              <Text style={s.cardAuthor}>{r.author}</Text>
              <Text style={s.cardDesc}>{r.desc}</Text>
              <View style={s.cardFooter}>
                <MaterialCommunityIcons name="open-in-new" size={14} color={t.accent} />
                <Text style={s.cardLink}>{tr('training.openResource')}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>{tr('training.noResourcesForDiscipline')}</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={s.emptyContainer}>
          <MaterialCommunityIcons name="notebook-outline" size={64} color={t.textDim} />
          <Text style={s.emptyTitle}>{tr('training.journal.comingSoonTitle')}</Text>
          <Text style={s.emptyDesc}>{tr('training.journal.comingSoonDesc')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>, fs: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    chipsScroll: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: t.border },
    chipsRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    chipActive: { backgroundColor: t.accent, borderColor: t.accent },
    chipText: { color: t.text, fontSize: 13 * fs },
    chipTextActive: { color: t.accentOn, fontWeight: '600' },
    subTabRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      backgroundColor: t.surface,
    },
    subTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    subTabActive: { borderBottomWidth: 2, borderBottomColor: t.accent },
    subTabText: { color: t.textDim, fontSize: 14 * fs },
    subTabTextActive: { color: t.text, fontWeight: '600' },
    content: { flex: 1 },
    contentInner: { padding: 12, gap: 12, paddingBottom: 40 },
    card: {
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardTitle: { flex: 1, color: t.text, fontSize: 15 * fs, fontWeight: '600' },
    cardAuthor: { color: t.textDim, fontSize: 12 * fs, marginBottom: 8 },
    cardDesc: { color: t.text, fontSize: 13 * fs, lineHeight: 18 * fs },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    cardLink: { color: t.accent, fontSize: 12 * fs, fontWeight: '500' },
    badgeFree: {
      backgroundColor: t.accent,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    badgeFreeText: { color: t.accentOn, fontSize: 10 * fs, fontWeight: '700' },
    badgePaid: {
      backgroundColor: t.border,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    badgePaidText: { color: t.textDim, fontSize: 10 * fs, fontWeight: '700' },
    emptyBox: { padding: 24, alignItems: 'center' },
    emptyText: { color: t.textDim, fontSize: 14 * fs },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
    },
    emptyTitle: { color: t.text, fontSize: 18 * fs, fontWeight: '600' },
    emptyDesc: { color: t.textDim, fontSize: 14 * fs, textAlign: 'center', lineHeight: 20 * fs },
  });
}
