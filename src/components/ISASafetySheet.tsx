import { useMemo, useState } from 'react';
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
import { useTheme } from '../theme';
import { CARDS, CardData, ChecklistItem } from '../data/isa/cards';
import { groupCardsByCategory, CategoryDef } from '../data/isa/categories';
import { RIG_PHASES, CROSS_CUTTING_LAYERS, RigPhase, CrossCuttingLayer } from '../data/isa/rigLog';
import { CalculatorsSheet, CalculatorType } from './calculators/CalculatorsSheet';

interface ISASafetySheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * ISA Safety Companion — F5 milestone (v0.7.0 → refactored v0.7.2).
 *
 * READ-ONLY reference guide. Interactive per-line checks moved to
 * QuickCheckSheet (accessible from line detail). This sheet remains as
 * pure study/reference material — 11 cards with expandable content.
 *
 * Session mode + history removed in v0.7.2 (rig log insight: interactive
 * checks belong to specific lines, not generic reference). SQLite table
 * `isa_check_sessions` is kept in schema for backward compat, but not
 * written to anymore.
 */
export function ISASafetySheet({ visible, onClose }: ISASafetySheetProps) {
  const t = useTheme();
  const { tr } = useTr();

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
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: t.text }]}>{tr('isaSafety.title')}</Text>
              <Text style={[styles.subtitle, { color: t.textMuted }]}>{tr('isaSafety.subtitle')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color={t.textMuted} />
            </Pressable>
          </View>

          <ISASafetyContent />

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

/**
 * ISA Safety Companion content — scrollable karty grupovane do kategorii.
 * Znovupouzitelne v Modal (ISASafetySheet) i v plne obrazovce (IsaCompanionScreen).
 * v0.8.0: category grouping (10 kategorii top-down, prazdne skryte).
 */
export function ISASafetyContent() {
  const t = useTheme();
  const { tr } = useTr();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [calcType, setCalcType] = useState<CalculatorType | null>(null);

  const groups = useMemo(() => groupCardsByCategory(CARDS), []);

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
        {groups.map(({ category, cards }) => {
          const isOpen = expandedCategory === category.id;
          return (
            <View key={category.id} style={styles.categoryGroup}>
              <Pressable
                onPress={() =>
                  setExpandedCategory((prev) => (prev === category.id ? null : category.id))
                }
                style={[styles.categoryHeader, { borderColor: t.border, backgroundColor: t.surface }]}
              >
                <MaterialCommunityIcons
                  name={category.icon}
                  size={20}
                  color={t.text}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryLabel, { color: t.text }]}>
                    {tr(category.labelKey)}
                    <Text style={[styles.categoryCount, { color: t.textDim }]}> ({cards.length})</Text>
                  </Text>
                  <Text style={[styles.categoryHint, { color: t.textMuted }]}>
                    {tr(category.hintKey)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={t.textMuted}
                />
              </Pressable>

              {isOpen && (
                <View style={styles.categoryCards}>
                  {cards.map((card) => (
                    <CardView
                      key={card.id}
                      card={card}
                      expanded={expandedCard === card.id}
                      onToggleExpand={() =>
                        setExpandedCard((prev) => (prev === card.id ? null : card.id))
                      }
                      onOpenCalculator={(type) => setCalcType(type)}
                      theme={t}
                      tr={tr}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Text style={[styles.disclaimer, { color: t.textDim }]}>
          {tr('isaSafety.disclaimer')}
        </Text>
      </ScrollView>

      {/* Kontextový kalkulátor (v0.7.4) */}
      <CalculatorsSheet
        visible={calcType !== null}
        type={calcType}
        onClose={() => setCalcType(null)}
      />
    </>
  );
}

// -----------------------------------------------------------------------------

function CardView({
  card,
  expanded,
  onToggleExpand,
  onOpenCalculator,
  theme,
  tr,
}: {
  card: CardData;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenCalculator: (type: CalculatorType) => void;
  theme: ReturnType<typeof useTheme>;
  tr: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
      <Pressable onPress={onToggleExpand} style={styles.cardHeader}>
        <MaterialCommunityIcons
          name={card.icon as any}
          size={22}
          color={theme.text}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{tr(card.titleKey)}</Text>
          <Text style={[styles.cardSummary, { color: theme.textMuted }]}>{tr(card.summaryKey)}</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.cardBody}>
          {/* Checklist rendering — read-only, no checkboxes */}
          {card.checklist && (
            <View>
              {card.checklist.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  theme={theme}
                  tr={tr}
                />
              ))}
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
                      {cell.startsWith('cards.') ? tr(cell) : cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Workflow rendering (rig-workflow karta) */}
          {card.category === 'workflow' && (
            <WorkflowContent theme={theme} tr={tr} />
          )}

          {/* Hint text (for rule / thresholds / lifetime cards) */}
          {card.category !== 'checklist' && card.category !== 'limits' && card.category !== 'workflow' && (
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              {tr(`cards.${card.id.replace(/-/g, '')}.hint`)}
            </Text>
          )}

          {/* Kontextový kalkulátor (v0.7.4) */}
          {card.relatedCalculator && (
            <Pressable
              onPress={() => onOpenCalculator(card.relatedCalculator!)}
              style={[styles.calcBtn, { borderColor: theme.accent, backgroundColor: theme.surface }]}
            >
              <MaterialCommunityIcons
                name="calculator-variant-outline"
                size={14}
                color={theme.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.calcBtnText, { color: theme.accent }]}>
                {tr('calc.openBtn')}
              </Text>
            </Pressable>
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

function WorkflowContent({
  theme,
  tr,
}: {
  theme: ReturnType<typeof useTheme>;
  tr: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <View>
      {/* SECTION: Build phases */}
      <Text style={[wfStyles.sectionLabel, { color: theme.textDim }]}>
        {tr('rigWorkflow.sectionPhases')}
      </Text>

      {RIG_PHASES.map((phase) => (
        <View key={phase.id} style={wfStyles.phaseBlock}>
          <View style={wfStyles.phaseHeader}>
            <MaterialCommunityIcons
              name={phase.icon as any}
              size={18}
              color={theme.text}
              style={{ marginRight: 8 }}
            />
            <Text style={[wfStyles.phaseTitle, { color: theme.text }]}>
              {tr(phase.titleKey)}
            </Text>
          </View>
          {phase.items.map((item, idx) => (
            <View key={idx} style={wfStyles.phaseItem}>
              <Text style={[wfStyles.bullet, { color: theme.textMuted }]}>•</Text>
              <Text style={[wfStyles.phaseItemText, { color: theme.textMuted }]}>
                {tr(item.labelKey)}
              </Text>
            </View>
          ))}
          {phase.gateAfter && (
            <View style={[wfStyles.gate, { borderColor: theme.accent, backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons
                name="flag-checkered"
                size={14}
                color={theme.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={[wfStyles.gateText, { color: theme.accent }]}>
                {tr(`rigWorkflow.gateFull${phase.gateAfter.toUpperCase()}`)}
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* SECTION: Cross-cutting layers */}
      <Text style={[wfStyles.sectionLabel, { color: theme.textDim, marginTop: 16 }]}>
        {tr('rigWorkflow.sectionCrossCutting')}
      </Text>

      {CROSS_CUTTING_LAYERS.map((layer) => (
        <View key={layer.id} style={wfStyles.phaseBlock}>
          <View style={wfStyles.phaseHeader}>
            <MaterialCommunityIcons
              name={layer.icon as any}
              size={16}
              color={theme.text}
              style={{ marginRight: 8 }}
            />
            <Text style={[wfStyles.phaseTitle, { color: theme.text, fontSize: 13 }]}>
              {tr(layer.titleKey)}
            </Text>
          </View>
          {layer.itemKeys.map((key, idx) => (
            <View key={idx} style={wfStyles.phaseItem}>
              <Text style={[wfStyles.bullet, { color: theme.textMuted }]}>•</Text>
              <Text style={[wfStyles.phaseItemText, { color: theme.textMuted }]}>
                {tr(key)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// -----------------------------------------------------------------------------

function ChecklistRow({
  item,
  theme,
  tr,
}: {
  item: ChecklistItem;
  theme: ReturnType<typeof useTheme>;
  tr: (key: string) => string;
}) {
  return (
    <View style={styles.checklistItem}>
      <View style={styles.checklistRow}>
        <MaterialCommunityIcons
          name="circle-medium"
          size={18}
          color={theme.textMuted}
          style={{ marginRight: 10 }}
        />
        <Text style={[styles.checklistLabel, { color: theme.text }]}>
          {tr(item.labelKey)}
        </Text>
      </View>
      {item.detailKey && (
        <Text style={[styles.checklistDetail, { color: theme.textDim }]}>{tr(item.detailKey)}</Text>
      )}
    </View>
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
  checklistDetail: { fontSize: 12, marginLeft: 28, marginBottom: 8, lineHeight: 16 },
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
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  calcBtnText: { fontSize: 13, fontWeight: '600' },
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
  // v0.8.0 category grouping
  categoryGroup: {
    marginHorizontal: 16,
    marginTop: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '400',
  },
  categoryHint: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryCards: {
    marginTop: 6,
    marginLeft: 8,
  },
});

const wfStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
  },
  phaseBlock: {
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  phaseTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 26,
    paddingVertical: 2,
  },
  bullet: {
    width: 12,
    fontSize: 11,
    lineHeight: 16,
  },
  phaseItemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  gate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 26,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  gateText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
