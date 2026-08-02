/**
 * Quick Check — top-10 pre-walk safety bodů (F5 v0.7.2, refined per rig log insight).
 *
 * Filozofie: "40 bodů nikdo nevyplní naslepo, 10 se čtou."
 * Zdroj: pm/idea_rig_log.md — rig log insight.
 *
 * Struktura: 5 vždy + 5 podmíněně (aktivují se podle parametrů lajny).
 * Cíl: pre-walk check pro walker, ne rigger. Max 30 sec.
 *
 * Pro plnou stavbu lajny → viz "Full rig log" mode (rigLog.ts, v0.7.2+).
 */

import type { SlacklineDetail } from '../../types';

export type CheckCategory = 'gear' | 'anchor' | 'material' | 'weather' | 'rescue';

export interface QuickCheckItem {
  /** Stabilní id pro persistenci (nemění se ani při reorderu) */
  id: string;
  /** i18n klíč titulku (např. "quickCheck.item.harness") */
  labelKey: string;
  /** i18n klíč detailu (co konkrétně kontrolovat) */
  detailKey: string;
  /** Ikona MaterialCommunityIcons */
  icon: string;
  /** Kategorie pro grouping */
  category: CheckCategory;
  /** Vždy zobrazit? Nebo jen za podmínek? */
  always?: boolean;
  /** Pokud !always, funkce vrátí true pokud má být zobrazen */
  showWhen?: (line: SlacklineDetail) => boolean;
  /** i18n klíč pro krátký důvod, proč se ukazuje (např. "quickCheck.reason.nylonRule") */
  reasonKey?: string;
}

/** Helpery pro podmíněnou logiku */
const isHighline = (line: SlacklineDetail) => (line.type ?? '').toLowerCase() === 'highline';
const isLongline = (line: SlacklineDetail) => (line.type ?? '').toLowerCase() === 'longline';
const anchorInfo = (line: SlacklineDetail) => (line.anchors_info ?? '').toLowerCase();
const mentionsTree = (line: SlacklineDetail) =>
  /strom|tree|drzewo|baum/i.test(line.anchors_info ?? '');

// -----------------------------------------------------------------------------
// TOP 10 bodů — 5 vždy + 5 podmíněně
// -----------------------------------------------------------------------------

export const QUICK_CHECK_ITEMS: QuickCheckItem[] = [
  // ===== 5 VŽDY =====

  {
    id: 'harness',
    labelKey: 'quickCheck.item.harness',
    detailKey: 'quickCheck.item.harnessDetail',
    icon: 'human',
    category: 'gear',
    always: true,
  },
  {
    id: 'leash',
    labelKey: 'quickCheck.item.leash',
    detailKey: 'quickCheck.item.leashDetail',
    icon: 'link-variant',
    category: 'gear',
    always: true,
  },
  {
    id: 'anchor',
    labelKey: 'quickCheck.item.anchor',
    detailKey: 'quickCheck.item.anchorDetail',
    icon: 'anchor',
    category: 'anchor',
    always: true,
  },
  {
    id: 'backup',
    labelKey: 'quickCheck.item.backup',
    detailKey: 'quickCheck.item.backupDetail',
    icon: 'shield-check',
    category: 'gear',
    always: true,
  },
  {
    id: 'rescue-plan',
    labelKey: 'quickCheck.item.rescuePlan',
    detailKey: 'quickCheck.item.rescuePlanDetail',
    icon: 'lifebuoy',
    category: 'rescue',
    always: true,
  },

  // ===== 5 PODMÍNĚNĚ =====

  {
    id: 'weblock-tieoff',
    labelKey: 'quickCheck.item.weblockTieoff',
    detailKey: 'quickCheck.item.weblockTieoffDetail',
    icon: 'lock',
    category: 'gear',
    always: true, // weblock používá 100% highline setup — de facto vždy
  },
  {
    id: 'nylon-rule',
    labelKey: 'quickCheck.item.nylonRule',
    detailKey: 'quickCheck.item.nylonRuleDetail',
    icon: 'alert-decagram',
    category: 'material',
    showWhen: (line) => isHighline(line) && (line.length ?? 0) > 0 && (line.length ?? 0) < 40,
    reasonKey: 'quickCheck.reason.nylonRule',
  },
  {
    id: 'wind',
    labelKey: 'quickCheck.item.wind',
    detailKey: 'quickCheck.item.windDetail',
    icon: 'weather-windy',
    category: 'weather',
    showWhen: (line) => (line.height ?? 0) > 5,
    reasonKey: 'quickCheck.reason.wind',
  },
  {
    id: 'storm',
    labelKey: 'quickCheck.item.storm',
    detailKey: 'quickCheck.item.stormDetail',
    icon: 'weather-lightning',
    category: 'weather',
    showWhen: (line) => (line.height ?? 0) > 15 || (line.length ?? 0) > 60 || isLongline(line),
    reasonKey: 'quickCheck.reason.storm',
  },
  {
    id: 'tree-anchor',
    labelKey: 'quickCheck.item.treeAnchor',
    detailKey: 'quickCheck.item.treeAnchorDetail',
    icon: 'tree',
    category: 'anchor',
    showWhen: (line) => mentionsTree(line),
    reasonKey: 'quickCheck.reason.treeAnchor',
  },
];

// -----------------------------------------------------------------------------
// Generator
// -----------------------------------------------------------------------------

export interface QuickCheckContext {
  items: QuickCheckItem[];
  /** Debug — proč byl každý conditional item vybrán (pro budoucí "why" tooltip) */
  reasoning: string[];
}

/**
 * Vygeneruje relevant subset QUICK_CHECK_ITEMS pro danou lajnu.
 * Vždy zahrne items.always, pak přidá conditional items dle jejich showWhen predikátů.
 * Cíl: max 10 bodů (5 vždy + 0-5 conditional dle typu lajny).
 */
export function generateQuickCheckForLine(line: SlacklineDetail): QuickCheckContext {
  const items: QuickCheckItem[] = [];
  const reasoning: string[] = [];

  for (const item of QUICK_CHECK_ITEMS) {
    if (item.always) {
      items.push(item);
    } else if (item.showWhen && item.showWhen(line)) {
      items.push(item);
      if (item.reasonKey) reasoning.push(item.reasonKey);
    }
  }

  return { items, reasoning };
}
