import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useTheme } from '../theme';
import { CARDS, CardData, ChecklistItem } from '../data/isa/cards';
import { useLangStore } from '../store/langStore';
import type { Lang } from '../i18n';
import {
  ISASession,
  countSessions,
  deleteSession,
  listSessions,
  saveSession,
} from '../db/isaSessions';

interface ISASafetySheetProps {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'read' | 'session';

/**
 * ISA Safety Companion — F5 milestone (v0.7.0).
 *
 * Two modes:
 *   - read: static content (study mode)
 *   - session: interactive checkboxes for on-site anchor build verification;
 *     completed sessions persist to SQLite (isa_check_sessions) with timestamp
 *     and best-effort GPS fix.
 *
 * Content data-driven from `src/data/isa/cards.ts`, i18n keys resolved via t().
 */
export function ISASafetySheet({ visible, onClose }: ISASafetySheetProps) {
  const t = useTheme();
  const { tr } = useTr();
  const lang = useLangStore((s) => s.lang);
  const [mode, setMode] = useState<Mode>('read');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  // Checked state per session — cardId → Set of itemIds
  const [checked, setChecked] = useState<Record<string, Set<string>>>({});
  // Session start timestamp per cardId — set on first check, cleared on save/reset
  const [sessionStarts, setSessionStarts] = useState<Record<string, string>>({});
  // Historie per card + total count (nezobrazovat 0 pokud nikdy nebyla kontrola)
  const [historyCards, setHistoryCards] = useState<Record<string, number>>({});
  const [historyDetail, setHistoryDetail] = useState<{
    cardId: string;
    sessions: ISASession[];
  } | null>(null);

  // Načíst counts pro badge při každém open
  useEffect(() => {
    if (!visible) return;
    (async () => {
      const next: Record<string, number> = {};
      for (const card of CARDS) {
        if (!card.checklist) continue;
        try {
          next[card.id] = await countSessions(card.id);
        } catch {
          next[card.id] = 0;
        }
      }
      setHistoryCards(next);
    })();
  }, [visible]);

  const handleClose = () => {
    setExpandedCard(null);
    setChecked({});
    setSessionStarts({});
    setHistoryDetail(null);
    setMode('read');
    onClose();
  };

  const toggleCheck = (cardId: string, itemId: string) => {
    setChecked((prev) => {
      const next = { ...prev };
      const set = new Set(next[cardId] ?? []);
      if (set.has(itemId)) set.delete(itemId);
      else set.add(itemId);
      next[cardId] = set;
      return next;
    });
    // Automaticky založ session timestamp při první interakci
    setSessionStarts((prev) =>
      prev[cardId] ? prev : { ...prev, [cardId]: new Date().toISOString() },
    );
  };

  const resetSession = (cardId: string) => {
    setChecked((prev) => ({ ...prev, [cardId]: new Set() }));
    setSessionStarts((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const handleSaveSession = async (card: CardData) => {
    const items = checked[card.id];
    if (!card.checklist || !items || items.size === 0) return;
    const startedAt = sessionStarts[card.id] ?? new Date().toISOString();

    // Best-effort GPS: quick last-known fix; nechceme blokovat save čekáním na live fix
    let gpsLat: number | null = null;
    let gpsLon: number | null = null;
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (last) {
          gpsLat = last.coords.latitude;
          gpsLon = last.coords.longitude;
        }
      }
    } catch {}

    try {
      await saveSession({
        cardId: card.id,
        startedAt,
        totalItems: card.checklist.length,
        checkedIds: Array.from(items),
        gpsLat,
        gpsLon,
      });
      // Update badge count okamžitě
      setHistoryCards((prev) => ({ ...prev, [card.id]: (prev[card.id] ?? 0) + 1 }));
      resetSession(card.id);
      Alert.alert(tr('isaSafety.sessionComplete'), '');
    } catch (err: any) {
      Alert.alert(tr('common.error') ?? 'Error', err?.message ?? 'Save failed');
    }
  };

  const openHistory = async (cardId: string) => {
    try {
      const sessions = await listSessions(cardId, 30);
      setHistoryDetail({ cardId, sessions });
    } catch {
      setHistoryDetail({ cardId, sessions: [] });
    }
  };

  const handleDeleteSession = async (id: number) => {
    try {
      await deleteSession(id);
      if (historyDetail) {
        const filtered = historyDetail.sessions.filter((s) => s.id !== id);
        setHistoryDetail({ ...historyDetail, sessions: filtered });
        setHistoryCards((prev) => ({
          ...prev,
          [historyDetail.cardId]: Math.max(0, (prev[historyDetail.cardId] ?? 1) - 1),
        }));
      }
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: t.text }]}>{tr('isaSafety.title')}</Text>
              <Text style={[styles.subtitle, { color: t.textMuted }]}>{tr('isaSafety.subtitle')}</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          <View style={styles.modeSwitch}>
            <ModeChip
              label={tr('isaSafety.modeReadOnly')}
              icon="book-open-outline"
              active={mode === 'read'}
              onPress={() => setMode('read')}
              theme={t}
            />
            <ModeChip
              label={tr('isaSafety.modeSession')}
              icon="clipboard-check-outline"
              active={mode === 'session'}
              onPress={() => setMode('session')}
              theme={t}
            />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
            {CARDS.map((card) => (
              <CardView
                key={card.id}
                card={card}
                mode={mode}
                expanded={expandedCard === card.id}
                onToggleExpand={() =>
                  setExpandedCard((prev) => (prev === card.id ? null : card.id))
                }
                checkedItems={checked[card.id] ?? new Set()}
                onToggleCheck={(itemId) => toggleCheck(card.id, itemId)}
                historyCount={historyCards[card.id] ?? 0}
                onSaveSession={() => handleSaveSession(card)}
                onResetSession={() => resetSession(card.id)}
                onOpenHistory={() => openHistory(card.id)}
                theme={t}
                tr={tr}
              />
            ))}

            <Text style={[styles.disclaimer, { color: t.textDim }]}>
              {tr('isaSafety.disclaimer')}
            </Text>
          </ScrollView>

          {historyDetail && (
            <HistorySheet
              cardId={historyDetail.cardId}
              sessions={historyDetail.sessions}
              onClose={() => setHistoryDetail(null)}
              onDelete={handleDeleteSession}
              lang={lang}
              theme={t}
              tr={tr}
            />
          )}

          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <Pressable onPress={handleClose} style={[styles.footerBtn, { backgroundColor: t.accent }]}>
              <Text style={{ color: t.accentOn, fontWeight: '600' }}>{tr('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -----------------------------------------------------------------------------

function CardView({
  card,
  mode,
  expanded,
  onToggleExpand,
  checkedItems,
  onToggleCheck,
  historyCount,
  onSaveSession,
  onResetSession,
  onOpenHistory,
  theme,
  tr,
}: {
  card: CardData;
  mode: Mode;
  expanded: boolean;
  onToggleExpand: () => void;
  checkedItems: Set<string>;
  onToggleCheck: (itemId: string) => void;
  historyCount: number;
  onSaveSession: () => void;
  onResetSession: () => void;
  onOpenHistory: () => void;
  theme: ReturnType<typeof useTheme>;
  tr: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const totalItems = card.checklist?.length ?? 0;
  const checkedCount = checkedItems.size;
  const allChecked = totalItems > 0 && checkedCount === totalItems;

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
      <Pressable onPress={onToggleExpand} style={styles.cardHeader}>
        <MaterialCommunityIcons
          name={card.icon as any}
          size={22}
          color={mode === 'session' && allChecked ? theme.accent : theme.text}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{tr(card.titleKey)}</Text>
          <Text style={[styles.cardSummary, { color: theme.textMuted }]}>{tr(card.summaryKey)}</Text>
        </View>
        {mode === 'session' && totalItems > 0 && (
          <Text style={[styles.progressBadge, { color: allChecked ? theme.accent : theme.textMuted }]}>
            {checkedCount}/{totalItems}
          </Text>
        )}
        {mode === 'read' && historyCount > 0 && (
          <View style={[styles.countBadge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.countBadgeText, { color: theme.accentOn }]}>{historyCount}</Text>
          </View>
        )}
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.cardBody}>
          {/* Checklist rendering */}
          {card.checklist && (
            <View>
              {card.checklist.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  interactive={mode === 'session'}
                  checked={checkedItems.has(item.id)}
                  onToggle={() => onToggleCheck(item.id)}
                  theme={theme}
                  tr={tr}
                />
              ))}

              {/* Session actions — jen v session mode + má alespoň 1 zaškrtnutý bod */}
              {mode === 'session' && checkedCount > 0 && (
                <View style={styles.sessionActions}>
                  <Pressable onPress={onResetSession} style={[styles.actionBtn, { borderColor: theme.border }]}>
                    <MaterialCommunityIcons name="refresh" size={14} color={theme.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: theme.textMuted }]}>{tr('common.reset')}</Text>
                  </Pressable>
                  <Pressable onPress={onSaveSession} style={[styles.actionBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                    <MaterialCommunityIcons name="content-save-outline" size={14} color={theme.accentOn} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: theme.accentOn, fontWeight: '600' }]}>
                      {tr('isaSafety.sessionSaveLog')}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* History link — jen v read mode + card má nějakou historii */}
              {mode === 'read' && historyCount > 0 && (
                <Pressable onPress={onOpenHistory} style={styles.historyLink}>
                  <MaterialCommunityIcons name="history" size={14} color={theme.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.historyLinkText, { color: theme.accent }]}>
                    {tr('isaSafety.sessionHistory')} ({historyCount})
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Table rendering */}
          {card.table && (
            <View style={styles.tableWrap}>
              <View style={[styles.tableRow, styles.tableHead, { borderBottomColor: theme.border }]}>
                {card.table.headerKeys.map((key) => (
                  <Text key={key} style={[styles.tableCell, styles.tableCellHead, { color: theme.text }]}>
                    {tr(key)}
                  </Text>
                ))}
              </View>
              {card.table.rows.map((row, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: theme.border },
                    idx === card.table!.rows.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  {row.map((cell, cellIdx) => (
                    <Text
                      key={cellIdx}
                      style={[styles.tableCell, { color: cellIdx === 0 ? theme.text : theme.textMuted }]}
                    >
                      {/* Cell may be a translation key or a literal (numbers, kN units) */}
                      {cell.startsWith('cards.') ? tr(cell) : cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Hint text (for rule / thresholds / lifetime cards) */}
          {card.category !== 'checklist' && card.category !== 'limits' && (
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              {tr(`cards.${card.id.replace(/-/g, '')}.hint`)}
            </Text>
          )}

          {/* Reference source */}
          {card.reference && (
            <View style={styles.refBox}>
              <MaterialCommunityIcons name="book-outline" size={14} color={theme.textDim} style={{ marginRight: 4 }} />
              <Text style={[styles.refText, { color: theme.textDim }]}>{card.reference.source}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------

function ChecklistRow({
  item,
  interactive,
  checked,
  onToggle,
  theme,
  tr,
}: {
  item: ChecklistItem;
  interactive: boolean;
  checked: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>;
  tr: (key: string) => string;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <View style={styles.checklistItem}>
      <Pressable
        onPress={interactive ? onToggle : () => setDetailOpen((v) => !v)}
        style={styles.checklistRow}
      >
        <MaterialCommunityIcons
          name={
            interactive
              ? checked
                ? 'checkbox-marked'
                : 'checkbox-blank-outline'
              : 'circle-medium'
          }
          size={interactive ? 22 : 18}
          color={interactive && checked ? theme.accent : theme.textMuted}
          style={{ marginRight: 10 }}
        />
        <Text
          style={[
            styles.checklistLabel,
            { color: theme.text },
            interactive && checked && { textDecorationLine: 'line-through', color: theme.textMuted },
          ]}
        >
          {tr(item.labelKey)}
        </Text>
      </Pressable>
      {item.detailKey && (detailOpen || !interactive) && (
        <Text style={[styles.checklistDetail, { color: theme.textDim }]}>{tr(item.detailKey)}</Text>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------

function HistorySheet({
  cardId,
  sessions,
  onClose,
  onDelete,
  lang,
  theme,
  tr,
}: {
  cardId: string;
  sessions: ISASession[];
  onClose: () => void;
  onDelete: (id: number) => void;
  lang: Lang;
  theme: ReturnType<typeof useTheme>;
  tr: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const card = CARDS.find((c) => c.id === cardId);
  const locale = lang === 'cs' ? 'cs-CZ' : lang === 'pl' ? 'pl-PL' : 'en-US';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, maxHeight: '70%' }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>
                {tr('isaSafety.sessionHistory')}
              </Text>
              {card && (
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>{tr(card.titleKey)}</Text>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {sessions.length === 0 && (
              <Text style={[styles.disclaimer, { color: theme.textDim }]}>
                {tr('isaSafety.sessionHistoryEmpty')}
              </Text>
            )}
            {sessions.map((s) => (
              <View
                key={s.id}
                style={[styles.historyItem, { borderBottomColor: theme.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyDate, { color: theme.text }]}>
                    {formatSessionDate(s.completed_at ?? s.started_at, locale)}
                  </Text>
                  <Text style={[styles.historyMeta, { color: theme.textMuted }]}>
                    {s.checked_items}/{s.total_items}
                    {s.gps_lat != null && s.gps_lon != null && (
                      <>
                        {'  ·  '}
                        {s.gps_lat.toFixed(4)}, {s.gps_lon.toFixed(4)}
                      </>
                    )}
                  </Text>
                </View>
                <Pressable onPress={() => onDelete(s.id)} hitSlop={8}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.textMuted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatSessionDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale, {
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

// -----------------------------------------------------------------------------

function ModeChip({
  label,
  icon,
  active,
  onPress,
  theme,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modeChip,
        {
          backgroundColor: active ? theme.accent : theme.surfaceAlt,
          borderColor: active ? theme.accent : theme.border,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={active ? theme.accentOn : theme.text}
        style={{ marginRight: 6 }}
      />
      <Text style={{ color: active ? theme.accentOn : theme.text, fontSize: 13, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

// -----------------------------------------------------------------------------

// Thin useTranslation wrapper — keeps `tr` name consistent with SettingsSheet
function useTr() {
  const { t } = useTranslation();
  const tr = useMemo(() => (key: string, opts?: Record<string, unknown>) => t(key, opts) as string, [t]);
  return { tr };
}

// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: { flex: 1 },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  modeSwitch: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  scroll: { flexGrow: 0 },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSummary: { fontSize: 12, marginTop: 2 },
  progressBadge: { fontSize: 12, fontWeight: '600', marginRight: 8 },
  countBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700' },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  checklistItem: { marginBottom: 4 },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checklistLabel: { fontSize: 14, flex: 1 },
  checklistDetail: { fontSize: 12, marginLeft: 32, marginBottom: 8, lineHeight: 16 },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 12 },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  historyLinkText: { fontSize: 12, fontWeight: '500' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyDate: { fontSize: 13, fontWeight: '500' },
  historyMeta: { fontSize: 11, marginTop: 2 },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'transparent',
    marginVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHead: { borderBottomWidth: 1.5 },
  tableCell: { flex: 1, fontSize: 12 },
  tableCellHead: { fontWeight: '600', fontSize: 12 },
  hint: {
    fontSize: 12,
    marginTop: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  refBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  refText: { fontSize: 11 },
  disclaimer: {
    fontSize: 11,
    marginTop: 16,
    marginHorizontal: 16,
    lineHeight: 15,
    fontStyle: 'italic',
    textAlign: 'center',
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
