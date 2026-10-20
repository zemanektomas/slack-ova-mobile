import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Share, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFontStore } from '../store/fontStore';
import { getDb } from '../db';
import { IncidentReportSheet } from '../components/IncidentReportSheet';
import { CURVE_TABBAR_HEIGHT } from '../components/SlackCurveTabBar';

type FilterType = 'all' | 'rig' | 'incident' | 'near_miss';

interface ReportRow {
  id: number;
  type: 'rig' | 'incident' | 'near_miss';
  incident_category: string | null;
  session_date: string;
  payload: string;
  status: string;
  created_at: string;
}

interface IncidentPayload {
  category: string;
  description: string;
  date_ym: string;
  country: string;
  anonymous: boolean;
  line_specs?: { length_m?: number | null; height_m?: number | null; material?: string | null; type?: string | null };
  conditions?: { wind_ms?: number | null; temp_c?: number | null; buddy_check?: boolean };
}

// Anglicky — tenhle popisek jde do SDILENEHO textu reportu. V UI se bere
// preklad z i18n (incident.cat.<key>).
const CATEGORY_LABELS: Record<string, string> = {
  fall: 'Fall / injury',
  rescue: 'Rescue',
  harness: 'Harness / tie-in',
  weblock: 'Weblock / gear',
  anchor: 'Anchor',
  webbing: 'Webbing',
  environmental: 'Environment',
  vehicle: 'Vehicle / heli / drone',
  electrostatic: 'Electrostatic',
  near_miss: 'Near miss',
  ppe: 'PPE injury',
  legal: 'Legal',
};

export default function ReportsScreen() {
  const theme = useTheme();
  const { t: tr } = useTranslation();
  const fs = useFontStore((s) => s.fontScale);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<ReportRow>(
        'SELECT id, type, incident_category, session_date, payload, status, created_at FROM reports ORDER BY created_at DESC',
      );
      setReports(rows);
    } catch {}
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const counts = useMemo(() => {
    return {
      all: reports.length,
      rig: reports.filter((r) => r.type === 'rig').length,
      incident: reports.filter((r) => r.type === 'incident').length,
      near_miss: reports.filter((r) => r.type === 'near_miss').length,
    };
  }, [reports]);

  const filtered = useMemo(() => {
    let out = reports;
    if (filter !== 'all') out = out.filter((r) => r.type === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) => {
        try {
          const p = JSON.parse(r.payload) as IncidentPayload;
          return p.description?.toLowerCase().includes(q) || (r.incident_category ?? '').includes(q);
        } catch {
          return false;
        }
      });
    }
    return out;
  }, [reports, filter, search]);

  const handleShareAgain = async (row: ReportRow) => {
    try {
      const p = JSON.parse(row.payload) as IncidentPayload;
      const catLabel = CATEGORY_LABELS[p.category] ?? p.category;
      const body =
        `INCIDENT REPORT\n` +
        `Category: ${catLabel}\n` +
        `Date: ${p.date_ym}\n` +
        `Country: ${p.country}\n\n` +
        `${p.description}\n\n---\nSlackline.Ova`;
      await Share.share({ message: body });
    } catch (err) {
      Alert.alert(tr('reports.shareFailed'), String(err));
    }
  };

  const handleDelete = (row: ReportRow) => {
    Alert.alert(tr('reports.deleteTitle'), tr('reports.deleteBody'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('reports.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await getDb();
            await db.runAsync('DELETE FROM reports WHERE id = ?', [row.id]);
            loadReports();
          } catch (err) {
            Alert.alert(tr('reports.deleteFailed'), String(err));
          }
        },
      },
    ]);
  };

  // FAB musi sedet NAD curve tab barem. Drive tu bylo natvrdo bottom: 24,
  // jenze tab bar meri CURVE_TABBAR_HEIGHT + inset (~144 dp) — tlacitko bylo
  // cele schovane pod nim a nesel zalozit zadny report.
  const insets = useSafeAreaInsets();
  const fabBottom = CURVE_TABBAR_HEIGHT + insets.bottom + 16;
  const s = useMemo(() => styles(theme, fs, fabBottom), [theme, fs, fabBottom]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>{tr('reports.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.textDim} />
        <TextInput
          style={s.searchInput}
          placeholder={tr('reports.searchPlaceholder')}
          placeholderTextColor={theme.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={s.filterRow}>
        {/* 'rig' zatim schovany: rig logy se ukladaji do line_safety_checks,
            ne do `reports`, takze by chip vzdy ukazoval (0) a prazdny seznam.
            Vrati se, az Reports zacne cist i z line_safety_checks (v0.8.1). */}
        {(['all', 'incident', 'near_miss'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
              {tr(`reports.filter.${f}`)} ({counts[f]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {filtered.length === 0 && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={theme.textDim} />
            <Text style={s.emptyTitle}>{tr('reports.emptyTitle')}</Text>
            <Text style={s.emptyHint}>
              {tr('reports.emptyBody')}
            </Text>
          </View>
        )}
        {filtered.map((r) => {
          let cat = r.incident_category ?? r.type;
          let desc = '';
          try {
            const p = JSON.parse(r.payload) as IncidentPayload;
            desc = p.description;
            cat = tr(`incident.cat.${p.category}`, { defaultValue: p.category });
          } catch {}
          return (
            <View key={r.id} style={s.reportCard}>
              <View style={s.reportHeader}>
                <View style={s.reportBadge}>
                  <Text style={s.reportBadgeText}>{r.type.toUpperCase()}</Text>
                </View>
                <Text style={s.reportCat}>{cat}</Text>
                <Text style={s.reportDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={s.reportDesc} numberOfLines={3}>
                {desc}
              </Text>
              <View style={s.reportActions}>
                <TouchableOpacity onPress={() => handleShareAgain(r)} style={s.reportActionBtn}>
                  <MaterialCommunityIcons name="share-variant" size={16} color={theme.accent} />
                  <Text style={[s.reportActionText, { color: theme.accent }]}>{tr('reports.share')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(r)} style={s.reportActionBtn}>
                  <MaterialCommunityIcons name="delete-outline" size={16} color={theme.textDim} />
                  <Text style={[s.reportActionText, { color: theme.textDim }]}>{tr('reports.delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setSheetOpen(true)} accessibilityLabel={tr('reports.newReport')}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.accentOn} />
      </TouchableOpacity>

      <IncidentReportSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={loadReports}
      />
    </SafeAreaView>
  );
}

const styles = (t: ReturnType<typeof useTheme>, fs: number, fabBottom: number) =>
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
    title: { fontSize: 20 * fs, fontWeight: '600', color: t.text },
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
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      flexWrap: 'wrap',
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    filterChipActive: { backgroundColor: t.accent, borderColor: t.accent },
    filterChipText: { fontSize: 13 * fs, color: t.text },
    filterChipTextActive: { color: t.accentOn },
    scroll: { flexGrow: 1, paddingVertical: 8, paddingHorizontal: 16, gap: 10, paddingBottom: 140 },
    emptyState: { alignItems: 'center', padding: 40, marginTop: 40 },
    emptyTitle: { fontSize: 18 * fs, fontWeight: '500', color: t.text, marginTop: 16 },
    emptyHint: {
      fontSize: 14 * fs,
      color: t.textDim,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20 * fs,
    },
    reportCard: {
      padding: 12,
      backgroundColor: t.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      gap: 6,
    },
    reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reportBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: t.accent,
    },
    reportBadgeText: { color: t.accentOn, fontSize: 10 * fs, fontWeight: '700' },
    reportCat: { flex: 1, color: t.text, fontSize: 13 * fs, fontWeight: '500' },
    reportDate: { color: t.textDim, fontSize: 11 * fs },
    reportDesc: { color: t.textMuted, fontSize: 13 * fs, lineHeight: 18 * fs },
    reportActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
    reportActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reportActionText: { fontSize: 12 * fs, fontWeight: '500' },
    fab: {
      position: 'absolute',
      // Nad curve tab barem; vlevo, aby nekolidoval se Settings pillem vpravo.
      bottom: fabBottom,
      left: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
  });
