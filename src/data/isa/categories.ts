/**
 * ISA Safety Companion — kategorie karet (hierarchie v0.8.0).
 *
 * Namisto flat listu 14 karet je karta zarazena do funkcni kategorie
 * podle rig komponenty. Poradi top-down (od meta konceptu k detailu):
 * Reference & uvod -> Rig workflow -> Rescue -> Prostredi ->
 * Kotveni -> Kotvitko -> Popruh -> Odsedka+Ring -> Sedak+PAS -> Chodec
 *
 * Podklad: doc/app-review/isa-cards-review.md sekce 11.
 *
 * Prazdne kategorie (0 karet) se v UI schovaji — vyplneni nechavame na
 * budouci karty (v0.8.0+ obohacovani obsahu, napr. sedak/PAS/odsedka).
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';

export type CardCategoryId =
  | 'reference'      // uvod, ISA:21 limits
  | 'rig-workflow'   // rig workflow overview
  | 'rescue'         // rescue procedures, two-attachments
  | 'environment'    // wind, electrostatic
  | 'anchor'         // SERENE, SNARE SANE
  | 'weblock'        // weblock tie-off
  | 'webbing'        // main+backup, RLT, nylon rule, webbing knots
  | 'leash-ring'     // odsedka + kroužek (empty for now)
  | 'harness-pas'    // sedák + PAS (empty for now)
  | 'walker';        // buddy check

export interface CategoryDef {
  id: CardCategoryId;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  labelKey: string;   // i18n key: isaSafety.category.{id}
  hintKey: string;    // i18n key: isaSafety.category.{id}Hint
}

/** Poradi top-down (jak se zobrazuje). */
export const CATEGORIES: CategoryDef[] = [
  { id: 'reference',    icon: 'book-open-outline',      labelKey: 'isaSafety.category.reference',   hintKey: 'isaSafety.category.referenceHint' },
  { id: 'rig-workflow', icon: 'clipboard-list-outline', labelKey: 'isaSafety.category.rigWorkflow', hintKey: 'isaSafety.category.rigWorkflowHint' },
  { id: 'rescue',       icon: 'medical-bag',            labelKey: 'isaSafety.category.rescue',      hintKey: 'isaSafety.category.rescueHint' },
  { id: 'environment',  icon: 'weather-partly-cloudy',  labelKey: 'isaSafety.category.environment', hintKey: 'isaSafety.category.environmentHint' },
  { id: 'anchor',       icon: 'anchor',                 labelKey: 'isaSafety.category.anchor',      hintKey: 'isaSafety.category.anchorHint' },
  { id: 'weblock',      icon: 'lock-outline',           labelKey: 'isaSafety.category.weblock',     hintKey: 'isaSafety.category.weblockHint' },
  { id: 'webbing',      icon: 'link-variant',           labelKey: 'isaSafety.category.webbing',     hintKey: 'isaSafety.category.webbingHint' },
  { id: 'leash-ring',   icon: 'ring',                   labelKey: 'isaSafety.category.leashRing',   hintKey: 'isaSafety.category.leashRingHint' },
  { id: 'harness-pas',  icon: 'human-handsdown',        labelKey: 'isaSafety.category.harnessPas',  hintKey: 'isaSafety.category.harnessPasHint' },
  { id: 'walker',       icon: 'account-check',          labelKey: 'isaSafety.category.walker',      hintKey: 'isaSafety.category.walkerHint' },
];

/** Prirazeni karty -> kategorie. Karta bez zaznamu -> 'reference' (safe default). */
export const CARD_CATEGORY: Record<string, CardCategoryId> = {
  'novice':             'reference',
  'isa21-limits':       'reference',
  'rig-workflow':       'rig-workflow',
  'two-attachments':    'rescue',
  'suspension-trauma':  'rescue',
  'wind':               'environment',
  'electrostatic':      'environment',
  'serene':             'anchor',
  'snare-sane':         'anchor',
  'weblock-tieoff':     'weblock',
  'nylon-rule':         'webbing',
  'rlt':                'webbing',
  'webbing-knots':      'webbing',
  'buddy-check':        'walker',
};

/** Vrati kategorie s prirazenymi kartami (a schova prazdne). */
export function groupCardsByCategory<T extends { id: string }>(
  cards: T[]
): Array<{ category: CategoryDef; cards: T[] }> {
  const groups = new Map<CardCategoryId, T[]>();
  for (const card of cards) {
    const catId = CARD_CATEGORY[card.id] ?? 'reference';
    if (!groups.has(catId)) groups.set(catId, []);
    groups.get(catId)!.push(card);
  }
  return CATEGORIES
    .filter(cat => groups.has(cat.id))
    .map(cat => ({ category: cat, cards: groups.get(cat.id)! }));
}
