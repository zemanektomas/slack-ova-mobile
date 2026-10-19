/**
 * IncidentReportSheet — nahlášení incidentu (v0.8.0, varianta C).
 *
 * Formulář: 12 kategorií + popis + datum + země + volitelné line specs / conditions.
 * Uloží do SQLite `reports` (type='incident') a nabídne share sheet s volbami:
 *   - Email na ISA SafeCom (predformatovany body)
 *   - Komunita (WhatsApp / Telegram / atd. — system share sheet)
 *   - Otevřít SAIR web (fallback pro oficiální submit)
 *
 * Zdroj kategorií: Rodeo Rigs Accidents natural clustering (projektové poznámky 24.8.2026).
 */

import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Share,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CURVE_TABBAR_HEIGHT } from './SlackCurveTabBar';
import { useTheme } from '../theme';
import { useFontStore } from '../store/fontStore';
import { getDb } from '../db';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type Category =
  | 'fall'
  | 'rescue'
  | 'harness'
  | 'weblock'
  | 'anchor'
  | 'webbing'
  | 'environmental'
  | 'vehicle'
  | 'electrostatic'
  | 'near_miss'
  | 'ppe'
  | 'legal';

// Popisky jsou v i18n pod incident.cat.<key> — tady jen poradi a ikony.
// `en` jde do tela reportu pro ISA SafeCom — to je vzdy anglicky, at uzivatel
// pouziva jakykoli jazyk. Popisek v UI se bere z i18n: incident.cat.<key>.
const CATEGORIES: Array<{
  key: Category;
  en: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { key: 'fall', en: 'Fall / injury', icon: 'arrow-down-bold' },
  { key: 'rescue', en: 'Rescue', icon: 'medical-bag' },
  { key: 'harness', en: 'Harness / tie-in', icon: 'human-handsdown' },
  { key: 'weblock', en: 'Weblock / gear', icon: 'wrench' },
  { key: 'anchor', en: 'Anchor', icon: 'anchor' },
  { key: 'webbing', en: 'Webbing', icon: 'link-variant' },
  { key: 'environmental', en: 'Environment (wind, storm)', icon: 'weather-lightning' },
  { key: 'vehicle', en: 'Vehicle / helicopter / drone', icon: 'car' },
  { key: 'electrostatic', en: 'Electrostatic', icon: 'flash' },
  { key: 'near_miss', en: 'Near miss / Pre-accident', icon: 'alert-circle-outline' },
  { key: 'ppe', en: 'PPE injury', icon: 'shield-alert' },
  { key: 'legal', en: 'Legal / community', icon: 'gavel' },
];

const COUNTRIES = ['CZ', 'SK', 'PL', 'DE', 'AT', 'HU', 'other'];

const ISA_SAFECOM_EMAIL = 'safety@slacklineinternational.org';
const SAIR_URL = 'https://data.slacklineinternational.org/safety/report-incident/english/';

export function IncidentReportSheet({ visible, onClose, onSaved }: Props) {
  const t = useTheme();
  const fs = useFontStore((s) => s.fontScale);
  // Backdrop je poloprůhledný, takže pod ním prosvítá tab bar — sheet mu musí
  // nechat místo. Dřív tu bylo natvrdo 56 px podle starého rovného tab baru;
  // curve tab bar měří 96 + inset, takže spodní tlačítka mizela pod ním.
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarGap = CURVE_TABBAR_HEIGHT + insets.bottom;
  const styles = useMemo(() => makeStyles(t, fs, tabBarGap), [t, fs, tabBarGap]);

  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [dateYm, setDateYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [country, setCountry] = useState('CZ');
  const [anonymous, setAnonymous] = useState(true);

  // Volitelné line specs
  const [lengthM, setLengthM] = useState('');
  const [heightM, setHeightM] = useState('');
  const [material, setMaterial] = useState('');
  const [lineType, setLineType] = useState('');

  // Volitelné conditions
  const [windMs, setWindMs] = useState('');
  const [tempC, setTempC] = useState('');
  const [buddyCheck, setBuddyCheck] = useState(false);

  const [saving, setSaving] = useState(false);

  // v0.8.0-alpha3: uvolneno — staci vybrat kategorii. Popis je doporuceny, ne povinny.
  // Radeji ulozit strucny report nez zadny.
  const canSubmit = category !== null;

  const reset = () => {
    setCategory(null);
    setDescription('');
    setLengthM('');
    setHeightM('');
    setMaterial('');
    setLineType('');
    setWindMs('');
    setTempC('');
    setBuddyCheck(false);
  };

  const buildPayload = () => ({
    category,
    description: description.trim(),
    date_ym: dateYm,
    country,
    anonymous,
    line_specs: {
      length_m: lengthM ? parseFloat(lengthM.replace(',', '.')) : null,
      height_m: heightM ? parseFloat(heightM.replace(',', '.')) : null,
      material: material || null,
      type: lineType || null,
    },
    conditions: {
      wind_ms: windMs ? parseFloat(windMs.replace(',', '.')) : null,
      temp_c: tempC ? parseFloat(tempC.replace(',', '.')) : null,
      buddy_check: buddyCheck,
    },
  });

  const formatShareBody = () => {
    const p = buildPayload();
    const catLabel = CATEGORIES.find((c) => c.key === category)?.en ?? category;
    const parts: string[] = [];
    parts.push('INCIDENT REPORT');
    parts.push(`Kategorie: ${catLabel}`);
    parts.push(`Datum: ${dateYm}`);
    parts.push(`Country: ${country}`);
    parts.push(`Anonymous: ${anonymous ? 'yes' : 'no'}`);
    parts.push('');
    parts.push('Popis:');
    parts.push(p.description);
    if (p.line_specs.length_m || p.line_specs.height_m || p.line_specs.material || p.line_specs.type) {
      parts.push('');
      parts.push('Lajna:');
      if (p.line_specs.length_m) parts.push(`  length: ${p.line_specs.length_m} m`);
      if (p.line_specs.height_m) parts.push(`  height: ${p.line_specs.height_m} m`);
      if (p.line_specs.material) parts.push(`  material: ${p.line_specs.material}`);
      if (p.line_specs.type) parts.push(`  typ: ${p.line_specs.type}`);
    }
    if (p.conditions.wind_ms || p.conditions.temp_c || p.conditions.buddy_check) {
      parts.push('');
      parts.push('Conditions:');
      if (p.conditions.wind_ms) parts.push(`  wind: ${p.conditions.wind_ms} m/s`);
      if (p.conditions.temp_c) parts.push(`  teplota: ${p.conditions.temp_c} °C`);
      parts.push(`  buddy check: ${p.conditions.buddy_check ? 'ano' : 'ne'}`);
    }
    parts.push('');
    parts.push('---');
    parts.push('Sent via Slackline.Ova');
    return parts.join('\n');
  };

  const saveToDb = async (): Promise<number | null> => {
    try {
      const db = await getDb();
      const payload = buildPayload();
      const now = new Date().toISOString();
      const res = await db.runAsync(
        `INSERT INTO reports (type, incident_category, session_date, payload, status, created_at, updated_at)
         VALUES ('incident', ?, ?, ?, 'committed', ?, ?)`,
        [category, dateYm + '-01', JSON.stringify(payload), now, now],
      );
      return res.lastInsertRowId as number;
    } catch (err) {
      Alert.alert(tr('incident.saveFailed'), String(err));
      return null;
    }
  };

  const handleSaveOnly = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const id = await saveToDb();
    setSaving(false);
    if (id === null) return;
    onSaved?.();
    Alert.alert(
      tr('incident.savedLocally'),
      tr('incident.savedLocallyBody'),
      [{ text: 'OK', onPress: () => { reset(); onClose(); } }],
    );
  };

  const handleSubmit = async (mode: 'email' | 'share' | 'sair') => {
    if (!canSubmit) return;
    setSaving(true);
    const id = await saveToDb();
    setSaving(false);
    if (id === null) return;

    onSaved?.();
    const body = formatShareBody();

    if (mode === 'email') {
      const subject = `Slackline incident report — ${CATEGORIES.find((c) => c.key === category)?.en}`;
      const mailto = `mailto:${ISA_SAFECOM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        await Linking.openURL(mailto);
      } catch (err) {
        Alert.alert(tr('incident.emailFailed'), String(err));
      }
    } else if (mode === 'share') {
      try {
        await Share.share({ message: body });
      } catch (err) {
        Alert.alert(tr('incident.shareFailed'), String(err));
      }
    } else if (mode === 'sair') {
      try {
        await Linking.openURL(SAIR_URL);
      } catch (err) {
        Alert.alert(tr('incident.sairFailed'), String(err));
      }
    }

    Alert.alert(tr('incident.saved'), tr('incident.savedBody'), [
      { text: 'OK', onPress: () => { reset(); onClose(); } },
    ]);
  };

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
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{tr('incident.title')}</Text>
              <Text style={styles.subtitle}>{tr('incident.subtitle')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Kategorie */}
            <Text style={styles.sectionLabel}>{tr('incident.categoryLabel')}</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => {
                const active = c.key === category;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? t.accent : t.surface,
                        borderColor: active ? t.accent : t.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={c.icon}
                      size={16}
                      color={active ? t.accentOn : t.text}
                    />
                    <Text style={[styles.catLabel, { color: active ? t.accentOn : t.text }]}>
                      {tr(`incident.cat.${c.key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Popis */}
            <Text style={styles.sectionLabel}>{tr('incident.descLabel')}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              placeholder={tr('incident.descPlaceholder')}
              placeholderTextColor={t.textDim}
              style={styles.descInput}
            />
            <Text style={styles.hint}>
              {tr('incident.charCount', { count: description.trim().length })}
            </Text>

            {/* Datum */}
            <Text style={styles.sectionLabel}>{tr('incident.dateLabel')}</Text>
            <TextInput
              value={dateYm}
              onChangeText={setDateYm}
              placeholder="YYYY-MM"
              placeholderTextColor={t.textDim}
              style={styles.input}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.hint}>{tr('incident.dateHint')}</Text>

            {/* Země */}
            <Text style={styles.sectionLabel}>{tr('incident.countryLabel')}</Text>
            <View style={styles.chipRow}>
              {COUNTRIES.map((c) => {
                const active = c === country;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCountry(c)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? t.accent : t.surface,
                        borderColor: active ? t.accent : t.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? t.accentOn : t.text, fontSize: 13 * fs }}>
                      {c === 'other' ? tr('incident.countryOther') : c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Anonymita */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>{tr('incident.anonymous')}</Text>
                <Text style={styles.hint}>{tr('incident.anonymousHint')}</Text>
              </View>
              <Switch value={anonymous} onValueChange={setAnonymous} />
            </View>

            {/* Volitelné: lajna */}
            <Text style={styles.sectionLabel}>{tr('incident.lineSection')}</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.hint}>{tr('incident.lengthM')}</Text>
                <TextInput
                  value={lengthM}
                  onChangeText={setLengthM}
                  keyboardType="decimal-pad"
                  placeholder="100"
                  placeholderTextColor={t.textDim}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hint}>{tr('incident.heightM')}</Text>
                <TextInput
                  value={heightM}
                  onChangeText={setHeightM}
                  keyboardType="decimal-pad"
                  placeholder="20"
                  placeholderTextColor={t.textDim}
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.hint}>{tr('incident.material')}</Text>
                <TextInput
                  value={material}
                  onChangeText={setMaterial}
                  placeholder="nylon / PES / UHMWPE"
                  placeholderTextColor={t.textDim}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hint}>{tr('incident.lineType')}</Text>
                <TextInput
                  value={lineType}
                  onChangeText={setLineType}
                  placeholder="HL / ML / waterline"
                  placeholderTextColor={t.textDim}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Volitelné: conditions */}
            <Text style={styles.sectionLabel}>{tr('incident.conditionsSection')}</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.hint}>{tr('incident.windMs')}</Text>
                <TextInput
                  value={windMs}
                  onChangeText={setWindMs}
                  keyboardType="decimal-pad"
                  placeholder="5"
                  placeholderTextColor={t.textDim}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hint}>{tr('incident.tempC')}</Text>
                <TextInput
                  value={tempC}
                  onChangeText={setTempC}
                  keyboardType="decimal-pad"
                  placeholder="18"
                  placeholderTextColor={t.textDim}
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{tr('incident.buddyCheck')}</Text>
              <Switch value={buddyCheck} onValueChange={setBuddyCheck} />
            </View>

            {/* Actions */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{tr('incident.saveSection')}</Text>

            {!canSubmit && (
              <Text style={styles.footerNote}>Vyber kategorii, ať můžeš pokračovat.</Text>
            )}

            <Pressable
              disabled={!canSubmit || saving}
              onPress={handleSaveOnly}
              style={[
                styles.actionBtn,
                { backgroundColor: canSubmit ? t.accent : t.border, opacity: canSubmit ? 1 : 0.5 },
              ]}
            >
              <MaterialCommunityIcons name="content-save-outline" size={18} color={canSubmit ? t.accentOn : t.textMuted} />
              <Text style={[styles.actionBtnText, { color: canSubmit ? t.accentOn : t.textMuted }]}>
                {tr('incident.btnSaveOnly')}
              </Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit || saving}
              onPress={() => handleSubmit('email')}
              style={[
                styles.actionBtn,
                { backgroundColor: t.surface, borderColor: canSubmit ? t.accent : t.border, borderWidth: 1, opacity: canSubmit ? 1 : 0.5 },
              ]}
            >
              <MaterialCommunityIcons name="email-outline" size={18} color={canSubmit ? t.accent : t.textMuted} />
              <Text style={[styles.actionBtnText, { color: canSubmit ? t.accent : t.textMuted }]}>
                {tr('incident.btnEmail')}
              </Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit || saving}
              onPress={() => handleSubmit('share')}
              style={[
                styles.actionBtn,
                { backgroundColor: t.surface, borderColor: canSubmit ? t.accent : t.border, borderWidth: 1, opacity: canSubmit ? 1 : 0.5 },
              ]}
            >
              <MaterialCommunityIcons name="share-variant" size={18} color={canSubmit ? t.accent : t.textMuted} />
              <Text style={[styles.actionBtnText, { color: canSubmit ? t.accent : t.textMuted }]}>
                {tr('incident.btnShare')}
              </Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit || saving}
              onPress={() => handleSubmit('sair')}
              style={[
                styles.actionBtn,
                { backgroundColor: t.surface, borderColor: canSubmit ? t.accent : t.border, borderWidth: 1, opacity: canSubmit ? 1 : 0.5 },
              ]}
            >
              <MaterialCommunityIcons name="open-in-new" size={18} color={canSubmit ? t.accent : t.textMuted} />
              <Text style={[styles.actionBtnText, { color: canSubmit ? t.accent : t.textMuted }]}>
                {tr('incident.btnSair')}
              </Text>
            </Pressable>

            <Text style={styles.footerNote}>
              Uloží se lokálně do Reporty tabu — můžeš to znovu poslat nebo upravit později.
              ISA SafeCom má backlog ~50 nezpracovaných reportů (2025) — nesluš čekat rychlou odpověď.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>, fs: number, tabBarGap: number) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    backdropDismiss: { flex: 1 },
    sheet: {
      // Necháme prostor pro bottom tab bar, jinak sheet vyjede až přes něj
      // a user nevidí zpětnou navigaci. Výška se bere z tab baru, ne natvrdo.
      maxHeight: '82%',
      marginBottom: tabBarGap,
      backgroundColor: t.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    title: { fontSize: 18 * fs, fontWeight: '600', color: t.text },
    subtitle: { fontSize: 12 * fs, color: t.textMuted, marginTop: 2 },
    content: { padding: 16, paddingBottom: 40 },
    sectionLabel: {
      fontSize: 12 * fs,
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
    },
    catLabel: { fontSize: 12 * fs },
    descInput: {
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surfaceAlt,
      borderRadius: 8,
      padding: 10,
      color: t.text,
      fontSize: 14 * fs,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    input: {
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: t.text,
      fontSize: 14 * fs,
    },
    hint: { fontSize: 11 * fs, color: t.textDim, marginTop: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 12,
    },
    switchLabel: { fontSize: 14 * fs, color: t.text, fontWeight: '500' },
    row2: { flexDirection: 'row', marginTop: 4 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 8,
    },
    actionBtnText: { fontSize: 14 * fs, fontWeight: '600' },
    footerNote: {
      fontSize: 11 * fs,
      color: t.textDim,
      fontStyle: 'italic',
      marginTop: 20,
      lineHeight: 16 * fs,
    },
  });
