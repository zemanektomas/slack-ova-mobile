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
  | 'warning'
  | 'workflow';

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

  // Kontextový kalkulátor v kartě (v0.7.4) — tlačítko pod obsahem karty
  // otevře relevantní kalkulátor v modalu.
  relatedCalculator?: 'angle' | 'force' | 'ma' | 'deviation';
}

export const CARDS: CardData[] = [
  // 0. Nováček — "Začínáš? Přečti si nejdřív" (v0.7.3, hero pro novice)
  {
    id: 'novice',
    category: 'checklist',
    icon: 'account-question-outline',
    titleKey: 'cards.novice.title',
    summaryKey: 'cards.novice.summary',
    checklist: [
      { id: 'n1', labelKey: 'cards.novice.n1', detailKey: 'cards.novice.n1Detail' },
      { id: 'n2', labelKey: 'cards.novice.n2', detailKey: 'cards.novice.n2Detail' },
      { id: 'n3', labelKey: 'cards.novice.n3', detailKey: 'cards.novice.n3Detail' },
      { id: 'n4', labelKey: 'cards.novice.n4', detailKey: 'cards.novice.n4Detail' },
      { id: 'n5', labelKey: 'cards.novice.n5', detailKey: 'cards.novice.n5Detail' },
    ],
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
    relatedCalculator: 'force',  // → force estimator (kontext k 12 kN limit)
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
      // NEW 2026 update (Rodeo Rigs) — masterpoint doktrína
      { id: 'mp', labelKey: 'cards.serene.masterpoint', detailKey: 'cards.serene.masterpointDetail' },
    ],
    reference: { source: 'ISA Rigger Cert syllabus + ISA 2025+ updated masterpoint guidance' },
    relatedCalculator: 'angle',  // → anchor angle (Efficient bod)
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
      // NEW 2026 update — single-cause failures (community consensus)
      { id: 'scf', labelKey: 'cards.snareSane.singleCauseFailures', detailKey: 'cards.snareSane.singleCauseFailuresDetail' },
    ],
    reference: { source: 'Balance Community — Building Highline Anchors + single-cause failure concept (community consensus 2025)' },
    relatedCalculator: 'angle',  // → anchor angle (Small Angles bod)
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
    relatedCalculator: 'force',  // → force estimator (kontext k materiálu × délce)
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
    reference: { source: 'ISA Rescue best practice — applies to user attachments AND anchor connections (see rig-workflow)' },
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
      // NEW: fyzicky check odsedky pred KAZDYM startem (integrace forgotten-leash core message)
      { id: 'b7', labelKey: 'cards.buddyCheck.b7', detailKey: 'cards.buddyCheck.b7Detail' },
      // NEW: gate integrita karabin + krouzku (integrace vortex-caveat check)
      { id: 'b8', labelKey: 'cards.buddyCheck.b8', detailKey: 'cards.buddyCheck.b8Detail' },
    ],
    reference: { source: 'ISA Safety culture + community consensus (2025-2026) on tie-in verification and gate integrity' },
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

  // 11. Bowline nikdy pro HL anchor (extractované z desatera bod 4) -------
  {
    id: 'bowline-warning',
    category: 'rule',
    icon: 'alert-octagon',
    titleKey: 'cards.bowline.title',
    summaryKey: 'cards.bowline.summary',
    checklist: [
      { id: 'bw1', labelKey: 'cards.bowline.bw1', detailKey: 'cards.bowline.bw1Detail' },
      { id: 'bw2', labelKey: 'cards.bowline.bw2', detailKey: 'cards.bowline.bw2Detail' },
      { id: 'bw3', labelKey: 'cards.bowline.bw3', detailKey: 'cards.bowline.bw3Detail' },
    ],
    reference: { source: 'ISA:21 (2023) §3.3.2' },
  },

  // 12. Weblock tie-off (extractované z desatera bod 9) -------------------
  {
    id: 'weblock-tieoff',
    category: 'rule',
    icon: 'lock-check',
    titleKey: 'cards.weblockTieoff.title',
    summaryKey: 'cards.weblockTieoff.summary',
    checklist: [
      { id: 'wt1', labelKey: 'cards.weblockTieoff.wt1', detailKey: 'cards.weblockTieoff.wt1Detail' },
      { id: 'wt2', labelKey: 'cards.weblockTieoff.wt2', detailKey: 'cards.weblockTieoff.wt2Detail' },
      { id: 'wt3', labelKey: 'cards.weblockTieoff.wt3', detailKey: 'cards.weblockTieoff.wt3Detail' },
    ],
    reference: { source: 'ISA:21 (2023) §3.11.1.2' },
    relatedCalculator: 'ma',  // → MA (Buckingham s weblock jako progress capture)
  },

  // 13. Kompletní rig workflow — celý strom stavby lajny (v0.7.3 + 2026 update)
  {
    id: 'rig-workflow',
    category: 'workflow',
    icon: 'clipboard-list-outline',
    titleKey: 'cards.rigWorkflow.title',
    summaryKey: 'cards.rigWorkflow.summary',
    checklist: [
      { id: 'rw1', labelKey: 'cards.rigWorkflow.rw1', detailKey: 'cards.rigWorkflow.rw1Detail' },
      { id: 'rw2', labelKey: 'cards.rigWorkflow.rw2', detailKey: 'cards.rigWorkflow.rw2Detail' },
      { id: 'rw3', labelKey: 'cards.rigWorkflow.rw3', detailKey: 'cards.rigWorkflow.rw3Detail' },
      // KRITICKÉ (2026 update — two-attachments principle applied to anchor connections)
      { id: 'rw4', labelKey: 'cards.rigWorkflow.rw4', detailKey: 'cards.rigWorkflow.rw4Detail' },
      // NEW 2026: masterpoint doktrína ISA 2025+
      { id: 'rw5', labelKey: 'cards.rigWorkflow.rw5', detailKey: 'cards.rigWorkflow.rw5Detail' },
    ],
    reference: { source: 'pm/idea_rig_log.md — 9 fází + 3 gates. Post-2025 community consensus updates: single-shackle warning applied via two-attachments principle, masterpoint per ISA 2025+ guidance' },
    relatedCalculator: 'deviation',  // → deviation (fáze 5 Tensioning)
  },

  // ============================================================================
  // F5 MINI (v0.7.19+) — 3 nove karty z ISA 2025+ updates + community consensus
  // Rodeo Rigs = interni research zdroj (viz doc/), zde citujeme jen public.
  // ============================================================================

  // 14. Masterpoint doktrina — ISA 2025+ update ----------------------------
  {
    id: 'masterpoint-doctrine',
    category: 'rule',
    icon: 'link-lock',
    titleKey: 'cards.masterpoint.title',
    summaryKey: 'cards.masterpoint.summary',
    checklist: [
      { id: 'mp1', labelKey: 'cards.masterpoint.mp1', detailKey: 'cards.masterpoint.mp1Detail' },
      { id: 'mp2', labelKey: 'cards.masterpoint.mp2', detailKey: 'cards.masterpoint.mp2Detail' },
      { id: 'mp3', labelKey: 'cards.masterpoint.mp3', detailKey: 'cards.masterpoint.mp3Detail' },
      { id: 'mp4', labelKey: 'cards.masterpoint.mp4', detailKey: 'cards.masterpoint.mp4Detail' },
      { id: 'mp5', labelKey: 'cards.masterpoint.mp5', detailKey: 'cards.masterpoint.mp5Detail' },
    ],
    reference: { source: 'ISA 2025+ updated guidance on masterpoint consolidation' },
  },

  // 15. Kdy BFK, kdy Sliding-X (decision framework) ------------------------
  {
    id: 'bfk-sliding-x',
    category: 'rule',
    icon: 'source-branch',
    titleKey: 'cards.bfkSlidingX.title',
    summaryKey: 'cards.bfkSlidingX.summary',
    checklist: [
      { id: 'bsx1', labelKey: 'cards.bfkSlidingX.bsx1', detailKey: 'cards.bfkSlidingX.bsx1Detail' },
      { id: 'bsx2', labelKey: 'cards.bfkSlidingX.bsx2', detailKey: 'cards.bfkSlidingX.bsx2Detail' },
      { id: 'bsx3', labelKey: 'cards.bfkSlidingX.bsx3', detailKey: 'cards.bfkSlidingX.bsx3Detail' },
      { id: 'bsx4', labelKey: 'cards.bfkSlidingX.bsx4', detailKey: 'cards.bfkSlidingX.bsx4Detail' },
    ],
    reference: { source: 'Balance Community — Building Highline Anchors, ISA anchor guidelines, community consensus (2025-2026)' },
    relatedCalculator: 'angle',
  },

  // 16. Al weblock corrosion — aktivni ISA incident 2026 -------------------
  {
    id: 'al-weblock-corrosion',
    category: 'warning',
    icon: 'shield-alert',
    titleKey: 'cards.alWeblockCorrosion.title',
    summaryKey: 'cards.alWeblockCorrosion.summary',
    checklist: [
      { id: 'awc1', labelKey: 'cards.alWeblockCorrosion.awc1', detailKey: 'cards.alWeblockCorrosion.awc1Detail' },
      { id: 'awc2', labelKey: 'cards.alWeblockCorrosion.awc2', detailKey: 'cards.alWeblockCorrosion.awc2Detail' },
      { id: 'awc3', labelKey: 'cards.alWeblockCorrosion.awc3', detailKey: 'cards.alWeblockCorrosion.awc3Detail' },
      { id: 'awc4', labelKey: 'cards.alWeblockCorrosion.awc4', detailKey: 'cards.alWeblockCorrosion.awc4Detail' },
    ],
    reference: { source: 'ISA Safety Commission active investigation 2026 (x-ray plan for suspect Al weblocks)' },
  },
];
