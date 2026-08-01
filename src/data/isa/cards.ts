/**
 * ISA Safety Companion — content karet
 *
 * Zdroj: ISA:21 (2023), ISA Wind Advisory 2020, ISA Electrostatic Warning 2025,
 * Balance Community, Damian Jörren et al. Forces in Highlines 2015 (SlackLab).
 *
 * Content je pedagogical adaptation. Original ISA texty jsou copyright ISA
 * (International Slackline Association). Apka poskytuje reference + edukativní
 * shrnutí — pro definitivní texty vždy odkazuj na oficiální ISA:21 PDF.
 *
 * i18n keys: cards.{cardId}.title, cards.{cardId}.summary, cards.{cardId}.items.{itemId}...
 */

export type CardCategory =
  | 'commandments'
  | 'limits'
  | 'checklist'
  | 'rule'
  | 'thresholds'
  | 'lifetime'
  | 'warning';

export interface ChecklistItem {
  id: string;
  labelKey: string; // i18n key
  detailKey?: string; // optional expandable detail
}

export interface CardData {
  id: string;
  category: CardCategory;
  icon: string; // MaterialCommunityIcons name
  titleKey: string;
  summaryKey: string;

  // For checklist cards
  checklist?: ChecklistItem[];

  // For threshold / table cards
  table?: {
    headerKeys: string[];
    rows: string[][]; // i18n keys per cell
  };

  // Reference link
  reference?: {
    source: string; // e.g. "ISA:21 (2023) §1.3"
    pdfKey?: string; // optional link to PDF in library
  };
}

export const CARDS: CardData[] = [
  // 0. HERO: 10 Highline Commandments ------------------------------------
  {
    id: 'commandments',
    category: 'commandments',
    icon: 'star-circle',
    titleKey: 'cards.commandments.title',
    summaryKey: 'cards.commandments.summary',
    checklist: [
      { id: 'c1', labelKey: 'cards.commandments.c1', detailKey: 'cards.commandments.c1Detail' },
      { id: 'c2', labelKey: 'cards.commandments.c2', detailKey: 'cards.commandments.c2Detail' },
      { id: 'c3', labelKey: 'cards.commandments.c3', detailKey: 'cards.commandments.c3Detail' },
      { id: 'c4', labelKey: 'cards.commandments.c4', detailKey: 'cards.commandments.c4Detail' },
      { id: 'c5', labelKey: 'cards.commandments.c5', detailKey: 'cards.commandments.c5Detail' },
      { id: 'c6', labelKey: 'cards.commandments.c6', detailKey: 'cards.commandments.c6Detail' },
      { id: 'c7', labelKey: 'cards.commandments.c7', detailKey: 'cards.commandments.c7Detail' },
      { id: 'c8', labelKey: 'cards.commandments.c8', detailKey: 'cards.commandments.c8Detail' },
      { id: 'c9', labelKey: 'cards.commandments.c9', detailKey: 'cards.commandments.c9Detail' },
      { id: 'c10', labelKey: 'cards.commandments.c10', detailKey: 'cards.commandments.c10Detail' },
    ],
    reference: { source: 'ISA:21 (2023), ISA Wind Advisory 2020, ISA Electrostatic Warning 2025' },
  },

  // 1. ISA:21 Limits ------------------------------------------------------
  {
    id: 'isa21-limits',
    category: 'limits',
    icon: 'gauge',
    titleKey: 'cards.isa21Limits.title',
    summaryKey: 'cards.isa21Limits.summary',
    table: {
      headerKeys: ['cards.isa21Limits.col.what', 'cards.isa21Limits.col.limit'],
      rows: [
        ['cards.isa21Limits.row.workingLoad', '≤ 12 kN'],
        ['cards.isa21Limits.row.backupfall', '≤ 8 kN'],
        ['cards.isa21Limits.row.primaryAnchor', '≥ 48 kN'],
        ['cards.isa21Limits.row.secondaryAnchor', '≥ 24 kN'],
        ['cards.isa21Limits.row.weblock', '≥ 48 kN'],
        ['cards.isa21Limits.row.leashRing', '≥ 24 kN'],
      ],
    },
    reference: { source: 'ISA:21 (2023) §1.3, Příloha 2' },
  },

  // 2. SERENE ------------------------------------------------------------
  {
    id: 'serene',
    category: 'checklist',
    icon: 'shield-check',
    titleKey: 'cards.serene.title',
    summaryKey: 'cards.serene.summary',
    checklist: [
      { id: 's', labelKey: 'cards.serene.strong', detailKey: 'cards.serene.strongDetail' },
      { id: 'e1', labelKey: 'cards.serene.equalized', detailKey: 'cards.serene.equalizedDetail' },
      { id: 'r', labelKey: 'cards.serene.redundant', detailKey: 'cards.serene.redundantDetail' },
      { id: 'e2', labelKey: 'cards.serene.efficient', detailKey: 'cards.serene.efficientDetail' },
      { id: 'ne', labelKey: 'cards.serene.noExtension', detailKey: 'cards.serene.noExtensionDetail' },
    ],
    reference: { source: 'ISA Rigger Cert syllabus' },
  },

  // 3. SNARE SANE --------------------------------------------------------
  {
    id: 'snare-sane',
    category: 'checklist',
    icon: 'shield-star',
    titleKey: 'cards.snareSane.title',
    summaryKey: 'cards.snareSane.summary',
    checklist: [
      { id: 's1', labelKey: 'cards.snareSane.strength', detailKey: 'cards.snareSane.strengthDetail' },
      { id: 'n1', labelKey: 'cards.snareSane.noAbrasion', detailKey: 'cards.snareSane.noAbrasionDetail' },
      { id: 'a', labelKey: 'cards.snareSane.redundancy', detailKey: 'cards.snareSane.redundancyDetail' },
      { id: 'r', labelKey: 'cards.snareSane.equalization', detailKey: 'cards.snareSane.equalizationDetail' },
      { id: 'e', labelKey: 'cards.snareSane.smallAngles', detailKey: 'cards.snareSane.smallAnglesDetail' },
      { id: 's2', labelKey: 'cards.snareSane.noExtension', detailKey: 'cards.snareSane.noExtensionDetail' },
    ],
    reference: { source: 'Balance Community — Building Highline Anchors' },
  },

  // 4. Nylon rule sub-40m ------------------------------------------------
  {
    id: 'nylon-rule',
    category: 'rule',
    icon: 'alert-decagram',
    titleKey: 'cards.nylonRule.title',
    summaryKey: 'cards.nylonRule.summary',
    table: {
      headerKeys: ['cards.nylonRule.col.length', 'cards.nylonRule.col.pa', 'cards.nylonRule.col.pes', 'cards.nylonRule.col.hmpe'],
      rows: [
        ['20-30 m', '✅', '❌', '❌'],
        ['30-40 m', '✅', '⚠️', '❌'],
        ['40-200 m', '✅', '✅', '❌'],
        ['> 200 m', '✅', '✅', '✅'],
      ],
    },
    reference: { source: 'ISA:21 (2023) Příloha 5' },
  },

  // 5. Wind thresholds ---------------------------------------------------
  {
    id: 'wind',
    category: 'thresholds',
    icon: 'weather-windy',
    titleKey: 'cards.wind.title',
    summaryKey: 'cards.wind.summary',
    table: {
      headerKeys: ['cards.wind.col.speed', 'cards.wind.col.action'],
      rows: [
        ['< 25 km/h', 'cards.wind.row.ok'],
        ['25-30 km/h', 'cards.wind.row.caution'],
        ['30-60 km/h', 'cards.wind.row.damage'],
        ['> 60 km/h', 'cards.wind.row.stop'],
      ],
    },
    reference: { source: 'ISA Wind Advisory 2020' },
  },

  // 6. RLT (Recommended Lifetime) ----------------------------------------
  {
    id: 'rlt',
    category: 'lifetime',
    icon: 'calendar-clock',
    titleKey: 'cards.rlt.title',
    summaryKey: 'cards.rlt.summary',
    table: {
      headerKeys: ['cards.rlt.col.type', 'cards.rlt.col.pa', 'cards.rlt.col.pes', 'cards.rlt.col.hmpe'],
      rows: [
        ['A+ / A', '720 dnů', 'cards.rlt.row.visual', 'cards.rlt.row.na'],
        ['B', '360 dnů', '360 dnů', 'cards.rlt.row.na'],
        ['C', '180 dnů', 'cards.rlt.row.na', 'cards.rlt.row.na'],
      ],
    },
    reference: { source: 'ISA:21 (2023) Příloha 4' },
  },

  // 7. Electrostatic Discharge Warning (nový 2025 topic) -----------------
  {
    id: 'electrostatic',
    category: 'warning',
    icon: 'flash-alert',
    titleKey: 'cards.electrostatic.title',
    summaryKey: 'cards.electrostatic.summary',
    checklist: [
      { id: 'e1', labelKey: 'cards.electrostatic.e1', detailKey: 'cards.electrostatic.e1Detail' },
      { id: 'e2', labelKey: 'cards.electrostatic.e2', detailKey: 'cards.electrostatic.e2Detail' },
      { id: 'e3', labelKey: 'cards.electrostatic.e3', detailKey: 'cards.electrostatic.e3Detail' },
      { id: 'e4', labelKey: 'cards.electrostatic.e4', detailKey: 'cards.electrostatic.e4Detail' },
      { id: 'e5', labelKey: 'cards.electrostatic.e5', detailKey: 'cards.electrostatic.e5Detail' },
    ],
    reference: { source: 'ISA Gear & Safety Warning — Electrostatic Discharge (12/2025)' },
  },

  // 8. Two Attachments rule ----------------------------------------------
  {
    id: 'two-attachments',
    category: 'rule',
    icon: 'link-variant',
    titleKey: 'cards.twoAttachments.title',
    summaryKey: 'cards.twoAttachments.summary',
    checklist: [
      { id: 't1', labelKey: 'cards.twoAttachments.t1', detailKey: 'cards.twoAttachments.t1Detail' },
      { id: 't2', labelKey: 'cards.twoAttachments.t2', detailKey: 'cards.twoAttachments.t2Detail' },
      { id: 't3', labelKey: 'cards.twoAttachments.t3', detailKey: 'cards.twoAttachments.t3Detail' },
      { id: 't4', labelKey: 'cards.twoAttachments.t4', detailKey: 'cards.twoAttachments.t4Detail' },
    ],
    reference: { source: 'ISA Rescue best practice' },
  },

  // 9. Buddy Check --------------------------------------------------------
  {
    id: 'buddy-check',
    category: 'checklist',
    icon: 'account-check',
    titleKey: 'cards.buddyCheck.title',
    summaryKey: 'cards.buddyCheck.summary',
    checklist: [
      { id: 'b1', labelKey: 'cards.buddyCheck.b1', detailKey: 'cards.buddyCheck.b1Detail' },
      { id: 'b2', labelKey: 'cards.buddyCheck.b2', detailKey: 'cards.buddyCheck.b2Detail' },
      { id: 'b3', labelKey: 'cards.buddyCheck.b3', detailKey: 'cards.buddyCheck.b3Detail' },
      { id: 'b4', labelKey: 'cards.buddyCheck.b4', detailKey: 'cards.buddyCheck.b4Detail' },
      { id: 'b5', labelKey: 'cards.buddyCheck.b5', detailKey: 'cards.buddyCheck.b5Detail' },
      { id: 'b6', labelKey: 'cards.buddyCheck.b6', detailKey: 'cards.buddyCheck.b6Detail' },
    ],
    reference: { source: 'ISA Safety culture' },
  },

  // 10. Suspension Trauma (info card, ne rescue guide) -------------------
  {
    id: 'suspension-trauma',
    category: 'warning',
    icon: 'heart-pulse',
    titleKey: 'cards.suspensionTrauma.title',
    summaryKey: 'cards.suspensionTrauma.summary',
    checklist: [
      { id: 's1', labelKey: 'cards.suspensionTrauma.s1', detailKey: 'cards.suspensionTrauma.s1Detail' },
      { id: 's2', labelKey: 'cards.suspensionTrauma.s2', detailKey: 'cards.suspensionTrauma.s2Detail' },
      { id: 's3', labelKey: 'cards.suspensionTrauma.s3', detailKey: 'cards.suspensionTrauma.s3Detail' },
      { id: 's4', labelKey: 'cards.suspensionTrauma.s4', detailKey: 'cards.suspensionTrauma.s4Detail' },
    ],
    reference: { source: 'ISA Rescue awareness' },
  },
];
