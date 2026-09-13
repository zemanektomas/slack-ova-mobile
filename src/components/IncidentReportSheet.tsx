/**
 * IncidentReportSheet — nahlášení incidentu (v0.8.0, varianta C).
 *
 * Formulář: 12 kategorií + popis + datum + země + volitelné line specs / conditions.
 * Uloží do SQLite `reports` (type='incident') a nabídne share sheet s volbami:
 *   - Email na ISA SafeCom (predformatovany body)
 *   - Komunita (WhatsApp / Telegram / atd. — system share sheet)
 *   - Otevřít SAIR web (fallback pro oficiální submit)
 *
 * Zdroj kategorií: Rodeo Rigs Accidents natural clustering (CLAUDE.md 24.8.2026).
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

const CATEGORIES: Array<{ key: Category; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { key: 'fall', label: 'Pád / úraz', icon: 'arrow-down-bold' },
  { key: 'rescue', label: 'Rescue', icon: 'medical-bag' },
  { key: 'harness', label: 'Sedák / tie-in', icon: 'human-handsdown' },
  { key: 'weblock', label: 'Kotvítko / gear', icon: 'wrench' },
  { key: 'anchor', label: 'Kotva', icon: 'anchor' },
  { key: 'webbing', label: 'Popruh', icon: 'link-variant' },
  { key: 'environmental', label: 'Prostředí (vítr, bouře)', icon: 'weather-lightning' },
  { key: 'vehicle', label: 'Auto / helikoptéra / dron', icon: 'car' },
  { key: 'electrostatic', label: 'Elektrostatika', icon: 'flash' },
  { key: 'near_miss', label: 'Near miss / Pre-accident', icon: 'alert-circle-outline' },
  { key: 'ppe', label: 'PPE zranění', icon: 'shield-alert' },
  { key: 'legal', label: 'Právní / komunita', icon: 'gavel' },
];

const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: 'CZ', label: 'ČR' },
  { code: 'SK', label: 'SK' },
  { code: 'PL', label: 'PL' },
  { code: 'DE', label: 'DE' },
  { code: 'AT', label: 'AT' },
  { code: 'HU', label: 'HU' },
  { code: 'other', label: 'Jiná' },
];

const ISA_SAFECOM_EMAIL = 'safety@slacklineinternational.org';
const SAIR_URL = 'https://data.slacklineinternational.org/safety/report-incident/english/';

export function IncidentReportSheet({ visible, onClose, onSaved }: Props) {
  const t = useTheme();
  const fs = useFontStore((s) => s.fontScale);
  const styles = useMemo(() => makeStyles(t, fs), [t, fs]);

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

  const canSubmit = category !== null && description.trim().length >= 20;

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
    const catLabel = CATEGORIES.find((c) => c.key === category)?.label ?? category;
    const parts: string[] = [];
    parts.push('INCIDENT REPORT');
    parts.push(`Kategorie: ${catLabel}`);
    parts.push(`Datum: ${dateYm}`);
    parts.push(`Země: ${country}`);
    parts.push(`Anonymní: ${anonymous ? 'ano' : 'ne'}`);
    parts.push('');
    parts.push('Popis:');
    parts.push(p.description);
    if (p.line_specs.length_m || p.line_specs.height_m || p.line_specs.material || p.line_specs.type) {
      parts.push('');
      parts.push('Lajna:');
      if (p.line_specs.length_m) parts.push(`  délka: ${p.line_specs.length_m} m`);
      if (p.line_specs.height_m) parts.push(`  výška: ${p.line_specs.height_m} m`);
      if (p.line_specs.material) parts.push(`  materiál: ${p.line_specs.material}`);
      if (p.line_specs.type) parts.push(`  typ: ${p.line_specs.type}`);
    }
    if (p.conditions.wind_ms || p.conditions.temp_c || p.conditions.buddy_check) {
      parts.push('');
      parts.push('Podmínky:');
      if (p.conditions.wind_ms) parts.push(`  vítr: ${p.conditions.wind_ms} m/s`);
      if (p.conditions.temp_c) parts.push(`  teplota: ${p.conditions.temp_c} °C`);
      parts.push(`  buddy check: ${p.conditions.buddy_check ? 'ano' : 'ne'}`);
    }
    parts.push('');
    parts.push('---');
    parts.push('Zasláno přes Slackline.Ova');
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
      Alert.alert('Uložení selhalo', String(err));
      return null;
    }
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
      const subject = `Slackline incident report — ${CATEGORIES.find((c) => c.key === category)?.label}`;
      const mailto = `mailto:${ISA_SAFECOM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        await Linking.openURL(mailto);
      } catch (err) {
        Alert.alert('Otevření emailu selhalo', String(err));
      }
    } else if (mode === 'share') {
      try {
        await Share.share({ message: body });
      } catch (err) {
        Alert.alert('Sdílení selhalo', String(err));
      }
    } else if (mode === 'sair') {
      try {
        await Linking.openURL(SAIR_URL);
      } catch (err) {
        Alert.alert('Otevření SAIR selhalo', String(err));
      }
    }

    Alert.alert('Uloženo', 'Report je uložený v Reporty tabu. Můžeš ho později znovu sdílet nebo upravit.', [
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
              <Text style={styles.title}>Nahlásit incident</Text>
              <Text style={styles.subtitle}>Uloží se lokálně + volba kam poslat</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Kategorie */}
            <Text style={styles.sectionLabel}>Kategorie *</Text>
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
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Popis */}
            <Text style={styles.sectionLabel}>Popis *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              placeholder="Co se stalo, jaké okolnosti, co bys řekl/a příště jinak..."
              placeholderTextColor={t.textDim}
              style={styles.descInput}
            />
            <Text style={styles.hint}>
              {description.trim().length < 20
                ? `Ještě ${20 - description.trim().length} znaků do minima`
                : `${description.trim().length} znaků ✓`}
            </Text>

            {/* Datum */}
            <Text style={styles.sectionLabel}>Datum (rok-měsíc)</Text>
            <TextInput
              value={dateYm}
              onChangeText={setDateYm}
              placeholder="YYYY-MM"
              placeholderTextColor={t.textDim}
              style={styles.input}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.hint}>Jen měsíc kvůli privacy — přesné datum je identifikující.</Text>

            {/* Země */}
            <Text style={styles.sectionLabel}>Země</Text>
            <View style={styles.chipRow}>
              {COUNTRIES.map((c) => {
                const active = c.code === country;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => setCountry(c.code)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? t.accent : t.surface,
                        borderColor: active ? t.accent : t.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? t.accentOn : t.text, fontSize: 13 * fs }}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Anonymita */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Anonymní</Text>
                <Text style={styles.hint}>Nezmíníš v popisu jméno oběti. Default = zapnuto (privacy).</Text>
              </View>
              <Switch value={anonymous} onValueChange={setAnonymous} />
            </View>

            {/* Volitelné: lajna */}
            <Text style={styles.sectionLabel}>Lajna (volitelné)</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.hint}>Délka (m)</Text>
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
                <Text style={styles.hint}>Výška (m)</Text>
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
                <Text style={styles.hint}>Materiál</Text>
                <TextInput
                  value={material}
                  onChangeText={setMaterial}
                  placeholder="nylon / PES / UHMWPE"
                  placeholderTextColor={t.textDim}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hint}>Typ</Text>
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
            <Text style={styles.sectionLabel}>Podmínky (volitelné)</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.hint}>Vítr (m/s)</Text>
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
                <Text style={styles.hint}>Teplota (°C)</Text>
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
              <Text style={styles.switchLabel}>Buddy check proběhl?</Text>
              <Switch value={buddyCheck} onValueChange={setBuddyCheck} />
            </View>

            {/* Actions */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Uložit + poslat</Text>

            <Pressable
              disabled={!canSubmit || saving}
              onPress={() => handleSubmit('email')}
              style={[
                styles.actionBtn,
                { backgroundColor: canSubmit ? t.accent : t.border },
              ]}
            >
              <MaterialCommunityIcons name="email-outline" size={18} color={canSubmit ? t.accentOn : t.textMuted} />
              <Text style={[styles.actionBtnText, { color: canSubmit ? t.accentOn : t.textMuted }]}>
                Email na ISA SafeCom
              </Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit || saving}
              onPress={() => handleSubmit('share')}
              style={[
                styles.actionBtn,
                { backgroundColor: t.surface, borderColor: canSubmit ? t.accent : t.border, borderWidth: 1 },
              ]}
            >
              <MaterialCommunityIcons name="share-variant" size={18} color={canSubmit ? t.accent : t.textMuted} />
              <Text style={[styles.actionBtnText, { color: canSubmit ? t.accent : t.textMuted }]}>
                Sdílet (WhatsApp / Telegram / …)
              </Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit || saving}
              onPress={() => handleSubmit('sair')}
              style={[
                styles.actionBtn,
                { backgroundColor: t.surface, borderColor: canSubmit ? t.accent : t.border, borderWidth: 1 },
              ]}
            >
              <MaterialCommunityIcons name="open-in-new" size={18} color={canSubmit ? t.accent : t.textMuted} />
              <Text style={[styles.actionBtnText, { color: canSubmit ? t.accent : t.textMuted }]}>
                Otevřít oficiální SAIR web
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

const makeStyles = (t: ReturnType<typeof useTheme>, fs: number) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    backdropDismiss: { flex: 1 },
    sheet: {
      maxHeight: '90%',
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
